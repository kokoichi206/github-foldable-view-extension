import {
  codeFolding,
  foldGutter,
  foldService,
  foldEffect,
  unfoldAll,
  syntaxHighlighting,
} from "@codemirror/language";
import { EditorState, RangeSetBuilder } from "@codemirror/state";
import { Decoration, EditorView, lineNumbers } from "@codemirror/view";
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

/* 折りたたみマーカーは GitHub 本家と同じ octicon (chevron-down-16 / chevron-right-16) を使う。
   文字グリフ (⌄ 等) はフォント依存で角度が急になるため使わない。
   path は https://github.com/primer/octicons (MIT) の icons/chevron-*-16.svg と揃えること */
const OCTICON_CHEVRON_DOWN =
  "M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z";
const OCTICON_CHEVRON_RIGHT =
  "M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z";

/* innerHTML は GitHub 側の CSP (Trusted Types) に弾かれうるため DOM API で組み立てる */
const foldMarker = (open: boolean): HTMLElement => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", open ? OCTICON_CHEVRON_DOWN : OCTICON_CHEVRON_RIGHT);
  svg.appendChild(path);

  const marker = document.createElement("span");
  marker.className = "cm-foldMarker";
  marker.appendChild(svg);
  return marker;
};

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
  ".cm-foldGutter .cm-gutterElement": {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "16px",
    cursor: "pointer",
  },
  ".cm-foldMarker": {
    display: "inline-flex",
    alignItems: "center",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--bgColor-muted, #f6f8fa)",
    border: "1px solid var(--borderColor-default, #d1d9e0)",
    color: "var(--fgColor-muted, #59636e)",
  },
  ".cm-gfvChangedLine": {
    backgroundColor:
      "var(--diffBlob-additionLine-bgColor, var(--bgColor-success-muted, #dafbe1))",
  },
});

const changedLineDecoration = Decoration.line({ class: "cm-gfvChangedLine" });

/* PR diff の追加行を全文ビュー上でマークする。doc は readonly なので静的な RangeSet でよい */
function changedLineHighlight(lines: string[], highlightLines: number[]) {
  const lineStartOffsets: number[] = [0];
  for (const line of lines) {
    const last = lineStartOffsets[lineStartOffsets.length - 1] ?? 0;
    lineStartOffsets.push(last + line.length + 1);
  }

  const builder = new RangeSetBuilder<Decoration>();
  for (const n of [...new Set(highlightLines)].sort((a, b) => a - b)) {
    const offset = lineStartOffsets[n - 1];
    if (n < 1 || n > lines.length || offset === undefined) continue;
    builder.add(offset, offset, changedLineDecoration);
  }
  return EditorView.decorations.of(builder.finish());
}

export function createViewer(
  parent: HTMLElement,
  text: string,
  filename: string,
  options?: { highlightLines?: number[] },
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
          markerDOM: foldMarker,
        }),
        languageForFilename(filename) ?? [],
        options?.highlightLines !== undefined && options.highlightLines.length > 0
          ? changedLineHighlight(lines, options.highlightLines)
          : [],
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
