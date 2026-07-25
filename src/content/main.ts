import { createViewer, type FoldableViewer } from "../viewer/create-viewer";
import {
  currentFilename,
  findCodeSection,
  findSourceTextarea,
  isBlobPage,
} from "./github-page";

const CONTROLS_ID = "gfv-controls";
const PANEL_ID = "gfv-panel";

let active: {
  viewer: FoldableViewer;
  panel: HTMLElement;
  hiddenSection: HTMLElement;
} | null = null;

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
#${PANEL_ID} { border: 1px solid var(--borderColor-default, #d1d9e0); border-radius: 6px; }
#${PANEL_ID} .cm-editor { max-width: 100%; }
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
    addButton("activate", "⌄ Foldable view", () => void activate());
    return;
  }

  const { viewer } = active;
  controls.dataset.gfvState = "on";
  addButton("expand", "すべて展開", () => viewer.unfoldAllRanges());
  addButton("l1", "L1", () => viewer.foldToLevel(1));
  addButton("l2", "L2", () => viewer.foldToLevel(2));
  addButton("l3", "L3", () => viewer.foldToLevel(3));
  addButton("fold-all", "すべて畳む", () => viewer.foldAllRanges());
  addButton("deactivate", "GitHub 表示に戻す", deactivate);
}

function ensureControls(): void {
  const existing = document.getElementById(CONTROLS_ID);
  if (!isBlobPage()) {
    if (active !== null) deactivate();
    existing?.remove();
    return;
  }
  if (existing !== null) return;

  injectStylesOnce();
  const controls = document.createElement("div");
  controls.id = CONTROLS_ID;
  document.body.appendChild(controls);
  renderControls();
}

async function activate(): Promise<void> {
  const textarea = findSourceTextarea();
  const section = findCodeSection();
  if (textarea === null || section === null || active !== null) return;

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  /* section の margin-top は、絶対描画されるファイルヘッダ（Code/Blame バー）用の
     確保帯。section を非表示にすると消えるため、パネルへ引き継がないと
     先頭行がヘッダの裏に隠れる */
  panel.style.marginTop = getComputedStyle(section).marginTop;
  section.insertAdjacentElement("beforebegin", panel);
  section.style.display = "none";

  const viewer = await createViewer(panel, textarea.value, currentFilename());
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

function reinit(): void {
  if (active !== null) deactivate();
  document.getElementById(CONTROLS_ID)?.remove();
  ensureControls();
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
}, 500);

ensureControls();
