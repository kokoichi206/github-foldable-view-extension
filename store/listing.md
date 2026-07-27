# Chrome Web Store 掲載情報

[開発者ダッシュボード](https://chrome.google.com/webstore/devconsole/) に貼り込む内容。
ダッシュボードは差分管理できないため、正本をここに置く。変更したらここも直すこと。

## Store listing タブ

言語: English (United States)
カテゴリ: Developer Tools

### Name

```
Foldable View for GitHub
```

### Summary (132 文字以内)

```
Code folding for the GitHub file view: fold by indent, collapse to a chosen depth
```

### Description

```
Foldable View for GitHub replaces the code view on github.com with a foldable
editor, so you can collapse a file down to its structure and expand only the
parts you care about.

GitHub's built-in folding only works for languages it can analyse
symbolically, so configuration and data files such as JSON and YAML get
nothing at all. Even where it does work you can only click sections open and
closed one at a time, and there is no way to collapse a whole file to a given
depth.

WHAT IT DOES

- Folds by indentation, so it behaves the same in Go, Python, YAML, JSON,
  Markdown, and anything else that expresses structure through indentation
- L1 / L2 / L3 buttons collapse the entire file to a chosen depth in one click
- Syntax highlighting chosen from the file extension
- Follows GitHub's light and dark themes
- On pull request "Files changed" pages, switch any file from the diff to its
  full source with the changed lines highlighted, then fold it
- Switch back to GitHub's own view at any time; the choice is remembered

HOW IT WORKS

The extension reads the source text that GitHub has already placed in the page
and renders it with CodeMirror 6. It does not hide DOM rows, so it stays
correct on large files where GitHub uses virtual scrolling.

PRIVACY

No data is collected, and nothing is sent to the developer or to any third
party. All processing happens locally in your browser. No remotely hosted code
is loaded or executed.

Open source (MIT):
https://github.com/kokoichi206/github-foldable-view-extension
```

### 画像

ストアアイコン (128x128): `icons/icon-128.png`
小プロモタイル (440x280): `store/promo-tile-440x280.png`
スクリーンショット (1280x800, 1〜5 枚): `docs/verify/*.png`

スクリーンショットは `pnpm build && pnpm e2e` で再生成される。
`pnpm assets` はアイコンとプロモタイルを `icons/icon.svg` と
`store/promo-tile.html` から作り直す。

## Privacy タブ

### Single purpose

```
Provide code folding for source files displayed on github.com. The extension
replaces GitHub's read-only code view with an editor that can collapse and
expand blocks by indentation depth.
```

### Permission justification: host permission for https://github.com/*

```
The extension's entire function is to replace the code view on github.com. It
needs to read the source text that GitHub places in the blob page and render a
folding editor in its place. On pull request "Files changed" pages it also
requests the full file from github.com, because a diff only contains fragments
and cannot be folded by indentation. No other host is accessed, and no other
permission is requested.
```

### Remote code

「リモートコードを使用していない」を選ぶ。
対応言語のシンタックスハイライトは拡張に静的にバンドルしており、
動的 import も外部ホストからの読み込みも行わない
(`src/viewer/languages.ts`)。

### Data usage

収集するデータの種類: いずれも選択しない (該当なし)。

以下の 3 つの証明にチェックを入れる。

- I do not sell or transfer user data to third parties, apart from the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

### Privacy policy URL

```
https://kokoichi206.github.io/github-foldable-view-extension/privacy-policy.html
```

正本は `docs/privacy-policy.html`。`pages.yml` が `docs/**` の push で配信する。
事前にリポジトリの Settings -> Pages -> Source を「GitHub Actions」にしておくこと。
