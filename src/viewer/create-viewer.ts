import {
  codeFolding,
  foldGutter,
  foldService,
  foldEffect,
  unfoldAll,
  LanguageDescription,
} from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { computeFoldRanges, type FoldRange } from "./indent-fold";

export interface FoldableViewer {
  view: EditorView;
  foldToLevel: (level: number) => void;
  foldAllRanges: () => void;
  unfoldAllRanges: () => void;
  destroy: () => void;
}

const baseTheme = EditorView.theme({
  "&": {
    fontSize: "12px",
    backgroundColor: "transparent",
  },
  ".cm-content": {
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    minWidth: "48px",
    paddingRight: "12px",
  },
});

function isDarkMode(): boolean {
  const mode = document.documentElement.getAttribute("data-color-mode");
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export async function createViewer(
  parent: HTMLElement,
  text: string,
  filename: string,
): Promise<FoldableViewer> {
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

  const languageCompartment = new Compartment();

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
        languageCompartment.of([]),
        baseTheme,
        isDarkMode() ? oneDark : [],
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        EditorView.lineWrapping,
      ],
    }),
  });

  const description = LanguageDescription.matchFilename(languages, filename);
  if (description !== null) {
    description
      .load()
      .then((support) => {
        view.dispatch({ effects: languageCompartment.reconfigure(support) });
      })
      .catch(() => {
        /* ハイライトは補助機能なので、言語ロード失敗時は plain text 表示のまま続行する */
      });
  }

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
