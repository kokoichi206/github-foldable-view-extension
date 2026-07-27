import { createViewer, type FoldableViewer } from "../viewer/create-viewer";
import {
  currentFilename,
  findCodeSection,
  findSourceTextarea,
  isBlobPage,
} from "./github-page";
import {
  addedLineNumbers,
  findDiffContent,
  findFileActions,
  findDiffFileEntries,
  isPrFilesPage,
  rawUrlFromBlobUrl,
  type DiffFileEntry,
} from "./pr-files-page";

const CONTROLS_ID = "gfv-controls";
const PANEL_ID = "gfv-panel";
/* blob ページではデフォルトで Foldable view を開く。
   「GitHub 表示に戻す」を押したらオフを記憶し、次からは自動で開かない */
const AUTO_PREF_KEY = "gfv-auto-activate";

let active: {
  viewer: FoldableViewer;
  panel: HTMLElement;
  hiddenSection: HTMLElement;
} | null = null;

function autoActivateEnabled(): boolean {
  return localStorage.getItem(AUTO_PREF_KEY) !== "off";
}

function injectStylesOnce(): void {
  if (document.getElementById("gfv-style") !== null) return;
  const style = document.createElement("style");
  style.id = "gfv-style";
  /* 操作 UI は GitHub のレイアウトに挿し込まず fixed で浮かせる。
     sticky ヘッダ等の重なり順の影響を受けないため */
  style.textContent = `
#${CONTROLS_ID} {
  position: fixed; right: 24px; bottom: 24px; z-index: 2147483647;
  display: flex; gap: 6px; align-items: center;
}
#${CONTROLS_ID} button {
  padding: 6px 12px; border-radius: 999px;
  border: 1px solid var(--borderColor-default, #d1d9e0);
  background: var(--bgColor-default, #fff); color: var(--fgColor-default, #1f2328);
  font-size: 12px; cursor: pointer;
  box-shadow: var(--shadow-resting-small, 0 1px 3px rgba(0,0,0,.2));
}
#${PANEL_ID} .cm-editor { max-width: 100%; }
.gfv-pr-toggle,
.gfv-pr-controls button {
  padding: 3px 12px; font-size: 12px; border-radius: 6px;
  border: 1px solid var(--borderColor-default, #d1d9e0);
  background: var(--bgColor-default, #fff);
  color: var(--fgColor-default, #1f2328);
  cursor: pointer;
}
.gfv-pr-toggle { margin-right: 8px; }
.gfv-pr-controls {
  display: flex; gap: 6px; align-items: center;
  padding: 8px; border-bottom: 1px solid var(--borderColor-default, #d1d9e0);
}
.gfv-pr-panel .cm-editor { max-width: 100%; }
`;
  document.head.appendChild(style);
}

function renderControls(): void {
  const controls = document.getElementById(CONTROLS_ID);
  if (controls === null) return;
  controls.replaceChildren();

  const addButton = (
    action: string,
    label: string,
    handler: () => void,
  ): void => {
    const b = document.createElement("button");
    b.dataset.gfvAction = action;
    b.textContent = label;
    b.addEventListener("click", handler);
    controls.appendChild(b);
  };

  if (active === null) {
    controls.dataset.gfvState = "off";
    addButton("activate", "⌄ Foldable view", () => {
      localStorage.setItem(AUTO_PREF_KEY, "on");
      activate();
    });
    return;
  }

  const { viewer } = active;
  controls.dataset.gfvState = "on";
  addButton("expand", "すべて展開", () => viewer.unfoldAllRanges());
  addButton("l1", "L1", () => viewer.foldToLevel(1));
  addButton("l2", "L2", () => viewer.foldToLevel(2));
  addButton("l3", "L3", () => viewer.foldToLevel(3));
  addButton("fold-all", "すべて畳む", () => viewer.foldAllRanges());
  addButton("deactivate", "GitHub 表示に戻す", () => {
    localStorage.setItem(AUTO_PREF_KEY, "off");
    deactivate();
  });
}

function ensureControls(): void {
  const existing = document.getElementById(CONTROLS_ID);
  if (!isBlobPage()) {
    if (active !== null) deactivate();
    existing?.remove();
    return;
  }
  if (existing !== null) {
    if (active === null && autoActivateEnabled()) activate();
    return;
  }

  injectStylesOnce();
  const controls = document.createElement("div");
  controls.id = CONTROLS_ID;
  document.body.appendChild(controls);
  renderControls();
  if (autoActivateEnabled()) activate();
}

function activate(): void {
  if (active !== null) return;
  const textarea = findSourceTextarea();
  const section = findCodeSection();
  if (textarea === null || section === null) return;

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  /* section の margin-top は、絶対描画されるファイルヘッダ（Code/Blame バー）用の
     確保帯。section を非表示にすると消えるため、パネルへ引き継がないと
     先頭行がヘッダの裏に隠れる */
  panel.style.marginTop = getComputedStyle(section).marginTop;
  section.insertAdjacentElement("beforebegin", panel);
  section.style.display = "none";

  const viewer = createViewer(panel, textarea.value, currentFilename());
  active = { viewer, panel, hiddenSection: section };
  renderControls();
}

function deactivate(): void {
  if (active === null) return;
  active.viewer.destroy();
  active.panel.remove();
  active.hiddenSection.style.display = "";
  active = null;
  renderControls();
}

/* ---- PR "Files changed" ページ: ファイル単位の Foldable 全文ビュー ----
   diff は hunk 断片でインデント構造が完結しないため、diff 自体は畳まず
   「head 全文 + 変更行ハイライト」のビューに切り替える形にする。
   React/turbo が DOM を差し替えても WeakMap 側は自然に無効化される */
const prViewers = new WeakMap<
  HTMLElement,
  { viewer: FoldableViewer; panel: HTMLElement }
>();
const PR_TOGGLE_CLASS = "gfv-pr-toggle";

function prFoldControls(viewer: FoldableViewer): HTMLElement {
  const controls = document.createElement("div");
  controls.className = "gfv-pr-controls";
  const addButton = (action: string, label: string, handler: () => void): void => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.gfvPrAction = action;
    b.textContent = label;
    b.addEventListener("click", handler);
    controls.appendChild(b);
  };
  addButton("expand", "すべて展開", () => viewer.unfoldAllRanges());
  addButton("l1", "L1", () => viewer.foldToLevel(1));
  addButton("l2", "L2", () => viewer.foldToLevel(2));
  addButton("l3", "L3", () => viewer.foldToLevel(3));
  addButton("fold-all", "すべて畳む", () => viewer.foldAllRanges());
  return controls;
}

async function togglePrViewer(
  entry: DiffFileEntry,
  button: HTMLButtonElement,
): Promise<void> {
  const content = findDiffContent(entry.container);
  if (content === null) return;

  const existing = prViewers.get(entry.container);
  if (existing !== undefined) {
    existing.viewer.destroy();
    existing.panel.remove();
    prViewers.delete(entry.container);
    content.style.display = "";
    button.textContent = "Foldable";
    return;
  }

  button.disabled = true;
  button.textContent = "読込中…";
  try {
    const res = await fetch(rawUrlFromBlobUrl(entry.blobUrl));
    if (!res.ok) throw new Error(`raw fetch failed: ${res.status}`);
    const text = await res.text();

    const highlightLines = addedLineNumbers(entry.container);
    const panel = document.createElement("div");
    panel.className = "gfv-pr-panel";
    const viewerHost = document.createElement("div");
    panel.appendChild(viewerHost);

    content.insertAdjacentElement("beforebegin", panel);
    content.style.display = "none";

    const viewer = createViewer(viewerHost, text, entry.path, { highlightLines });
    panel.insertBefore(prFoldControls(viewer), viewerHost);

    prViewers.set(entry.container, { viewer, panel });
    button.textContent = "Diff に戻す";
  } catch (err) {
    console.error("[gfv] PR ファイル全文の取得に失敗", entry.path, err);
    button.textContent = "取得失敗 (再試行)";
  } finally {
    button.disabled = false;
  }
}

/* findDiffFileEntries が非同期 (React 版 UI の payload 解析) になったため、
   ポーリングと重なって二重挿入しないよう実行中はスキップする */
let prScanInFlight = false;

async function ensurePrFoldButtons(): Promise<void> {
  if (!isPrFilesPage() || prScanInFlight) return;
  prScanInFlight = true;
  try {
    injectStylesOnce();
    for (const entry of await findDiffFileEntries()) {
      if (entry.deleted) continue;
      const actions = findFileActions(entry.container);
      if (actions === null) continue;
      if (actions.querySelector(`.${PR_TOGGLE_CLASS}`) !== null) continue;

      const button = document.createElement("button");
      button.type = "button";
      button.className = PR_TOGGLE_CLASS;
      button.textContent = "Foldable";
      button.addEventListener("click", () => {
        void togglePrViewer(entry, button);
      });
      actions.prepend(button);
    }
  } finally {
    prScanInFlight = false;
  }
}

function reinit(): void {
  if (active !== null) deactivate();
  document.getElementById(CONTROLS_ID)?.remove();
  ensureControls();
  void ensurePrFoldButtons();
}

/* GitHub は soft navigation (turbo) で遷移し、コード部は React ハイドレーション後に
   現れるため、1 回きりの初期化では間に合わない。URL 変化はイベントで拾いつつ、
   コントロール設置はポーリングで常に再試行する（設置済みなら何もしない） */
document.addEventListener("turbo:load", reinit);
window.addEventListener("popstate", reinit);

let lastHref = location.href;
setInterval(() => {
  if (location.href !== lastHref) {
    lastHref = location.href;
    reinit();
    return;
  }
  ensureControls();
  void ensurePrFoldButtons();
}, 500);

ensureControls();
void ensurePrFoldButtons();
