# github-foldable-view-extension

GitHub のファイルビューにコード折りたたみを追加するブラウザ拡張（MV3）。

GitHub の現行コードビューには折りたたみ UI がなく、DOM は仮想スクロールのため
行を隠す方式の既存拡張は大きいファイルで壊れる。この拡張は GitHub が保持している
全文（`#read-only-cursor-text-area`）を読み、CodeMirror 6 の折りたたみビューアに
差し替える方式を取る。

## 機能

- blob ページ右下のボタンで GitHub 標準表示と切り替え
- インデントベースの折りたたみ（言語非依存。Go / Python / YAML / JSON いずれも可）
- L1 / L2 / L3 ボタンで指定の深さまで一括折りたたみ
- 拡張子からのシンタックスハイライト（`@codemirror/language-data` の遅延ロード）
- ダーク / ライトモード追従

## 開発

```sh
pnpm install
pnpm build        # tsc --noEmit && vite build → dist/
pnpm test         # 折りたたみ範囲計算のユニットテスト
pnpm e2e          # dist を実 Chrome に読み込み、実ページで動作検証
```

## インストール（開発版）

1. `pnpm build`
2. `chrome://extensions` → デベロッパーモード → 「パッケージ化されていない拡張機能を読み込む」→ `dist/` を選択
