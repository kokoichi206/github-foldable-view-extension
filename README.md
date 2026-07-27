# Foldable View for GitHub

<div align="right">

English | [日本語](./README.ja.md)

</div>

Code folding for the GitHub file view: fold by indent, collapse to a chosen depth.

**[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/foldable-view-for-github/kkjejoecddgihebkjgkafmaghopgicoe)**

![A JSON file on github.com collapsed to depth 2](docs/verify/2-fold-l2.png)

## Why this exists

GitHub's built-in folding only covers languages it can analyse symbolically, so
configuration and data files such as JSON and YAML get nothing at all. Even where
it does work, sections open and close one click at a time — there is no way to
collapse a whole file to a given depth.

Extensions that fold by hiding DOM rows break on large files, because GitHub's
code view is virtually scrolled. This one instead reads the source text GitHub
already keeps in the page and renders it with CodeMirror 6.

## Features

- Folds by indentation, so it behaves the same in Go, Python, YAML, JSON,
  Markdown, and anything else that expresses structure through indentation
- `L1` / `L2` / `L3` collapse the whole file to a chosen depth in one click
- Syntax highlighting chosen from the file extension
- Follows GitHub's light and dark themes
- Switches back to GitHub's own view at any time, and remembers the choice
- Turns a pull request diff into the full source with the changed lines
  highlighted, so that it can be folded too

## Collapse to a depth

`L2` keeps two levels open, `L1` collapses everything but the outermost level.
`Expand all` and `Fold all` are the two extremes.

![The same file collapsed to depth 1](docs/verify/3-fold-l1.png)

## Any indented language

Highlighting comes from the file extension and folding comes from indentation, so
tab-indented Go and space-indented YAML behave the same way.

![A Go file with syntax highlighting and folded blocks](docs/verify/4-go-highlight.png)

## Pull requests

A diff only contains fragments, so it cannot be folded by indentation. On the
"Files changed" page every file gets a `Foldable` button that swaps the diff for
the full source of the head revision, with the added lines highlighted. The same
depth controls apply from there.

![A pull request file shown as full source with added lines highlighted](docs/verify/5-pr-files.png)

## Install

[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/foldable-view-for-github/kkjejoecddgihebkjgkafmaghopgicoe)

To build it yourself and load `dist/` as an unpacked extension, see
[DEVELOPMENT.md](./DEVELOPMENT.md).

## Privacy

No data is collected, and nothing is sent to the developer or to any third party.
Everything runs locally in your browser, and no remotely hosted code is loaded or
executed. See the
[privacy policy](https://kokoichi206.github.io/github-foldable-view-extension/privacy-policy.html).

## License

[MIT](./LICENSE)
