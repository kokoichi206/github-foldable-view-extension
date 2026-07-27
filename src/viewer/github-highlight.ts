import { HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

/* GitHub がページに公開している prettylights 変数を参照する。
   ライト/ダークの切替は GitHub 側の変数値の変化にそのまま追従する。
   fallback は GitHub ライトテーマの実値 */
const v = (name: string, fallback: string): string =>
  `var(--color-prettylights-syntax-${name}, ${fallback})`;

export const githubHighlightStyle = HighlightStyle.define([
  {
    tag: [t.keyword, t.operatorKeyword, t.modifier, t.moduleKeyword],
    color: v("keyword", "#cf222e"),
  },
  {
    tag: [t.string, t.special(t.string), t.regexp, t.character],
    color: v("string", "#0a3069"),
  },
  {
    tag: [
      t.number,
      t.bool,
      t.null,
      t.atom,
      t.constant(t.variableName),
      t.self,
    ],
    color: v("constant", "#0550ae"),
  },
  {
    tag: [t.propertyName, t.attributeName, t.tagName],
    color: v("entity-tag", "#116329"),
  },
  {
    tag: [
      t.function(t.variableName),
      t.function(t.propertyName),
      t.className,
      t.typeName,
      t.namespace,
      t.macroName,
    ],
    color: v("entity", "#6639ba"),
  },
  { tag: [t.comment, t.lineComment, t.blockComment], color: v("comment", "#59636e") },
  { tag: t.heading, color: v("markup-heading", "#0550ae"), fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.link, color: v("constant", "#0550ae"), textDecoration: "underline" },
]);
