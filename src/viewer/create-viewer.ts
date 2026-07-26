import {
  codeFolding,
  foldGutter,
  foldService,
  foldEffect,
  unfoldAll,
  syntaxHighlighting,
} from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { githubHighlightStyle } from "./github-highlight";
import { computeFoldRanges, type FoldRange } from "./indent-fold";
import { languageForFilename } from "./languages";

export interface FoldableViewer {
  view: EditorView;
  foldToLevel: (level: number) => void;
  foldAllRanges: () => void;
  unfoldAllRanges: () => void;
  destroy: () => void;
}

/* 配色は GitHub がページに公開している CSS 変数を参照し、テーマ切替に自動追従する。
   フォント・行高・ガター幅は本家コードビューの実測値 (12px/20px, 行番号 40px + 右 16px) に合わせる */
const baseTheme = EditorView.theme({
  "&": {
    fontSize: "12px",
    backgroundColor: "transparent",
    color: "var(--fgColor-default, #1f2328)",
  },
  ".cm-content": {
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    lineHeight: "20px",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--fgColor-muted, #59636e)",
    lineHeight: "20px",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    minWidth: "40px",
    paddingRight: "16px",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--bgColor-muted, #f6f8fa)",
    border: "1px solid var(--borderColor-default, #d1d9e0)",
    color: "var(--fgColor-muted, #59636e)",
  },
});

export function createViewer(
  parent: HTMLElement,
  text: string,
  filename: string,
): FoldableViewer {
  const lines = text.split("\n");
  const ranges = computeFoldRanges(lines);
  const rangeByStartLine = new Map<number, FoldRange>(
    ranges.map((r) => [r.startLine, r]),
  );

  const indentFold = foldService.of((state, lineStart) => {
    const line = state.doc.lineAt(lineStart);
    const range = rangeByStartLine.get(line.number);
    if (range === undefined || range.endLine > state.doc.lines) return null;
    return { from: line.to, to: state.doc.line(range.endLine).to };
  });

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: text,
      extensions: [
        lineNumbers(),
        codeFolding({
          placeholderText: "…",
        }),
        indentFold,
        foldGutter({
          openText: "⌄",
          closedText: "›",
        }),
        languageForFilename(filename) ?? [],
        baseTheme,
        syntaxHighlighting(githubHighlightStyle),
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        EditorView.lineWrapping,
      ],
    }),
  });

  const foldRanges = (targets: FoldRange[]): void => {
    unfoldAll(view);
    const effects = targets
      .filter((r) => r.endLine <= view.state.doc.lines)
      .map((r) =>
        foldEffect.of({
          from: view.state.doc.line(r.startLine).to,
          to: view.state.doc.line(r.endLine).to,
        }),
      );
    if (effects.length > 0) view.dispatch({ effects });
  };

  return {
    view,
    foldToLevel: (level: number) =>
      foldRanges(ranges.filter((r) => r.depth >= level)),
    foldAllRanges: () => foldRanges(ranges),
    unfoldAllRanges: () => unfoldAll(view),
    destroy: () => view.destroy(),
  };
}
