import { cpp } from "@codemirror/lang-cpp";
import { css } from "@codemirror/lang-css";
import { go } from "@codemirror/lang-go";
import { html } from "@codemirror/lang-html";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { php } from "@codemirror/lang-php";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { sql } from "@codemirror/lang-sql";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { StreamLanguage } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { toml } from "@codemirror/legacy-modes/mode/toml";
import type { Extension } from "@codemirror/state";

/* 言語チャンクを動的 import すると content script ではパスがページ側
   (github.com) 基準で解決され、GitHub の CSP に弾かれる。
   このため対応言語は静的にバンドルする（動的 import を持たないこと） */
const languageByExtension: Record<string, () => Extension> = {
  json: () => json(),
  jsonc: () => json(),
  yml: () => yaml(),
  yaml: () => yaml(),
  go: () => go(),
  py: () => python(),
  js: () => javascript(),
  mjs: () => javascript(),
  cjs: () => javascript(),
  jsx: () => javascript({ jsx: true }),
  ts: () => javascript({ typescript: true }),
  mts: () => javascript({ typescript: true }),
  tsx: () => javascript({ jsx: true, typescript: true }),
  md: () => markdown(),
  markdown: () => markdown(),
  html: () => html(),
  htm: () => html(),
  css: () => css(),
  sql: () => sql(),
  xml: () => xml(),
  svg: () => xml(),
  java: () => java(),
  rs: () => rust(),
  c: () => cpp(),
  h: () => cpp(),
  cc: () => cpp(),
  cpp: () => cpp(),
  hpp: () => cpp(),
  php: () => php(),
  sh: () => StreamLanguage.define(shell),
  bash: () => StreamLanguage.define(shell),
  zsh: () => StreamLanguage.define(shell),
  toml: () => StreamLanguage.define(toml),
};

export function languageForFilename(filename: string): Extension | null {
  const extension = filename.toLowerCase().split(".").pop() ?? "";
  const factory = languageByExtension[extension];
  return factory !== undefined ? factory() : null;
}
