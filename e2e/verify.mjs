// dist の拡張を実 Chrome に読み込み、公開リポの実ページで折りたたみ動作を検証する。
// 実行: pnpm build && pnpm e2e
import { chromium } from "playwright";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const TARGET_URL =
  "https://github.com/kokoichi206/dotfiles/blob/main/superwhisper/settings.json";
const GO_TARGET_URL =
  "https://github.com/kokoichi206/slack-cli/blob/main/internal/config/project.go";
const PR_TARGET_URL = "https://github.com/kokoichi206/gh-actions/pull/1/files";
const PR_TARGET_FILE = "lint-workflows/src/main.ts";
const SCREENSHOT_DIR = "docs/verify";

const failures = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures.push(name);
};

const extensionPath = resolve("dist");
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const context = await chromium.launchPersistentContext(
  mkdtempSync(join(tmpdir(), "gfv-e2e-")),
  {
    // 拡張の読み込みは headless shell では動かないため headed で実行する
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  },
);

try {
  const page = context.pages()[0] ?? (await context.newPage());
  const cspViolations = [];
  page.on("console", (msg) => {
    if (msg.text().includes("Content Security Policy")) {
      cspViolations.push(msg.text());
    }
  });
  await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });

  await page.locator(".cm-editor").waitFor({ state: "visible", timeout: 20_000 });
  check("blob ページで自動的に Foldable view になる", true);
  await page.waitForTimeout(800); // 言語チャンクの遅延ロードを待ってから撮影
  await page.screenshot({ path: `${SCREENSHOT_DIR}/1-expanded.png` });

  const placeholdersBefore = await page.locator(".cm-foldPlaceholder").count();
  check("初期状態では何も畳まれていない", placeholdersBefore === 0,
    `placeholders=${placeholdersBefore}`);

  const topLineHittable = await page.evaluate(() => {
    window.scrollTo(0, 0);
    const line = document.querySelector(".cm-line");
    if (line === null) return false;
    const r = line.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + 5, r.top + 5);
    return hit !== null && (line.contains(hit) || hit === line);
  });
  check("ページ先頭で 1 行目がヘッダに隠れない", topLineHittable);

  const highlightApplied = await page.evaluate(() => {
    const content = document.querySelector(".cm-content");
    if (content === null) return false;
    const base = getComputedStyle(content).color;
    return [...document.querySelectorAll(".cm-line span")].some(
      (s) => getComputedStyle(s).color !== base,
    );
  });
  check("シンタックスハイライトが適用される (GitHub の配色変数)", highlightApplied);

  const clickAction = async (key) => {
    await page.locator(`[data-gfv-action="${key}"]`).click();
    await page.waitForTimeout(300);
  };

  await clickAction("l2");
  const placeholdersL2 = await page.locator(".cm-foldPlaceholder").count();
  check("L2 で折りたたみが発生する", placeholdersL2 > 0,
    `placeholders=${placeholdersL2}`);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/2-fold-l2.png` });

  await clickAction("l1");
  const placeholdersL1 = await page.locator(".cm-foldPlaceholder").count();
  check("L1 は L2 より浅く畳む (placeholder が減る)",
    placeholdersL1 > 0 && placeholdersL1 < placeholdersL2,
    `L1=${placeholdersL1}, L2=${placeholdersL2}`);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/3-fold-l1.png` });

  await clickAction("expand");
  const placeholdersExpanded = await page.locator(".cm-foldPlaceholder").count();
  check("すべて展開で元に戻る", placeholdersExpanded === 0,
    `placeholders=${placeholdersExpanded}`);

  await page.locator('[data-gfv-action="deactivate"]').click();
  await page.waitForTimeout(300);
  const editorGone = (await page.locator(".cm-editor").count()) === 0;
  const githubVisible = await page
    .locator("#read-only-cursor-text-area")
    .evaluate((el) => el.closest("section")?.style.display !== "none");
  check("GitHub 標準表示に戻せる", editorGone && githubVisible);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page
    .locator('[data-gfv-action="activate"]')
    .waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(1500);
  const staysOff = (await page.locator(".cm-editor").count()) === 0;
  check("戻した後はリロードしても自動起動しない (オフを記憶)", staysOff);

  await page.locator('[data-gfv-action="activate"]').click();
  await page.locator(".cm-editor").waitFor({ state: "visible", timeout: 10_000 });
  check("手動でもう一度 Foldable view にできる", true);

  await page.goto(GO_TARGET_URL, { waitUntil: "domcontentloaded" });
  await page.locator(".cm-editor").waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(500);
  const goHighlighted = await page.evaluate(() => {
    const content = document.querySelector(".cm-content");
    if (content === null) return false;
    const base = getComputedStyle(content).color;
    return [...document.querySelectorAll(".cm-line span")].some(
      (s) => getComputedStyle(s).color !== base,
    );
  });
  check("Go ファイルでもハイライトが当たる (静的バンドル)", goHighlighted);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/4-go-highlight.png` });

  await page.goto(PR_TARGET_URL, { waitUntil: "domcontentloaded" });
  const prFile = page.locator(`.file[data-tagsearch-path="${PR_TARGET_FILE}"]`);
  const prToggle = prFile.locator(".gfv-pr-toggle");
  await prToggle.waitFor({ state: "visible", timeout: 20_000 });
  check("PR files ページの各ファイルに Foldable ボタンが出る", true);

  await prToggle.click();
  await prFile
    .locator(".gfv-pr-panel .cm-editor")
    .waitFor({ state: "visible", timeout: 20_000 });
  check("Foldable 全文ビューが開く (raw fetch)", true);
  await page.waitForTimeout(500);

  const changedCount = await prFile.locator(".cm-gfvChangedLine").count();
  check("変更行ハイライトが乗る", changedCount > 0, `${changedCount} 行`);

  await prFile.locator('[data-gfv-pr-action="fold-all"]').click();
  await page.waitForTimeout(300);
  const prPlaceholders = await prFile.locator(".cm-foldPlaceholder").count();
  check("PR ビューでも折りたたみが効く", prPlaceholders > 0,
    `placeholders=${prPlaceholders}`);
  await prFile.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/5-pr-files.png` });

  await prToggle.click();
  await page.waitForTimeout(300);
  const prEditorGone = (await prFile.locator(".cm-editor").count()) === 0;
  const diffVisible = await prFile
    .locator(".js-file-content")
    .evaluate((el) => el.style.display !== "none");
  check("Diff 表示に戻せる", prEditorGone && diffVisible);

  check("CSP 違反が発生しない", cspViolations.length === 0,
    `${cspViolations.length} 件`);
} finally {
  await context.close();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} 件失敗: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("\nすべての検証に成功。スクリーンショット: " + SCREENSHOT_DIR);
