# github-foldable-view-extension

GitHub のファイルビューにコード折りたたみを追加するブラウザ拡張（MV3）。
Chrome Web Store 上の名称は **Foldable View for GitHub**。

GitHub のネイティブ折りたたみはシンボル解析が効く言語（Go 等）に限られ、
JSON / YAML などの設定・データ系ファイルには無い。またネイティブにあっても
個別セクションのクリックのみで、深さ指定の一括折りたたみはできない。
DOM は仮想スクロールのため行を隠す方式の既存拡張は大きいファイルで壊れる。
この拡張は GitHub が保持している全文（`#read-only-cursor-text-area`）を読み、
CodeMirror 6 の折りたたみビューアに差し替える方式を取る。

## 機能

- blob ページ右下のボタンで GitHub 標準表示と切り替え
- インデントベースの折りたたみ（言語非依存。Go / Python / YAML / JSON いずれも可）
- L1 / L2 / L3 ボタンで指定の深さまで一括折りたたみ
- 拡張子からのシンタックスハイライト（対応言語は静的にバンドル）
- ダーク / ライトモード追従
- PR の Files changed ページで、diff から変更行ハイライト付きの全文ビューに切り替え

## 開発

```sh
pnpm install
pnpm build        # tsc --noEmit && vite build → dist/
pnpm test         # 折りたたみ範囲計算のユニットテスト
pnpm e2e          # dist を実 Chrome に読み込み、実ページで動作検証
pnpm assets       # icons/icon.svg と store/promo-tile.html から PNG を再生成
```

`pnpm e2e` のスクリーンショットは `docs/verify/` に 1280x800 で出力され、
そのまま Chrome Web Store のスクリーンショットとして使える。

## インストール（開発版）

1. `pnpm build`
2. `chrome://extensions` → デベロッパーモード → 「パッケージ化されていない拡張機能を読み込む」→ `dist/` を選択

## リリース

拡張のバージョンは `package.json` の `version` が唯一の出所で、
manifest・タグ・zip はすべてそこから導出される。

1. `package.json` の `version` を上げて main にマージする
2. Actions から `tag` ワークフローを実行する

`tag` がタグを打ち、`release` が zip 化 → GitHub Release 作成 →
Chrome Web Store への公開まで行う。

初回だけは Chrome Web Store の審査を通すために手動アップロードが必要で、
そこで発行される拡張 ID を `.github/workflows/release.yml` の
`CWS_EXTENSION_ID` に設定する。掲載文・権限の申告内容は
[`store/listing.md`](./store/listing.md) にある。

CI が使う設定値:

- `vars.CWS_PUBLISHER_ID` — Chrome Web Store の Publisher ID（機微でないため variable）
- `secrets.GOOGLE_SA_KEY_JSON` — Chrome Web Store API 用サービスアカウントの JSON 鍵

## ライセンス

[MIT](./LICENSE)
