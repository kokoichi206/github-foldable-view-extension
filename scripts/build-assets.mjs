// 拡張アイコンと Chrome Web Store のプロモタイルの PNG を、SVG / HTML の生成元から作る。
// 実行: pnpm assets
//
// ImageMagick 内蔵の MSVG レンダラは stroke 付き <path> を描画しないため、
// ラスタライズは Chromium (e2e で既に使っている playwright) に任せる。
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

/* icon.svg の周囲 16px の透明余白は Chrome Web Store のストアアイコン (128px) 仕様。
   Chrome の拡張一覧・ツールバーに出る小サイズにその余白を残すと図案が潰れるため、
   viewBox を詰めて描画領域いっぱいに寄せる */
const TARGETS = [
  {
    source: "icons/icon.svg",
    out: "icons/icon-16.png",
    width: 16,
    height: 16,
    viewBox: "13 13 102 102",
  },
  {
    source: "icons/icon.svg",
    out: "icons/icon-48.png",
    width: 48,
    height: 48,
    viewBox: "9 9 110 110",
  },
  {
    source: "icons/icon.svg",
    out: "icons/icon-128.png",
    width: 128,
    height: 128,
    viewBox: "0 0 128 128",
  },
  {
    source: "store/promo-tile.html",
    out: "store/promo-tile-440x280.png",
    width: 440,
    height: 280,
  },
];

const RESET_STYLE =
  "<style>html,body{margin:0;padding:0}svg{display:block;width:100%;height:100%}</style>";

const browser = await chromium.launch();
try {
  for (const { source, out, width, height, viewBox } of TARGETS) {
    const markup = readFileSync(
      new URL(`../${source}`, import.meta.url),
      "utf-8",
    );
    const content =
      viewBox === undefined
        ? markup
        : RESET_STYLE +
          markup.replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`);

    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(content);

    /* 生成元が自前で背景を塗らない場合 (アイコン) は透明のまま出す */
    const png = await page.screenshot({ omitBackground: true });
    writeFileSync(new URL(`../${out}`, import.meta.url), png);
    await page.close();
    console.log(out);
  }
} finally {
  await browser.close();
}
