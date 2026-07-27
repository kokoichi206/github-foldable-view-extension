export interface FoldRange {
  /** 折りたたみの起点行 (1-based)。この行は畳んだ後も表示されたまま残る */
  startLine: number;
  /** 折りたたみの終端行 (1-based)。startLine+1 〜 endLine が隠れる */
  endLine: number;
  /** 構造的なネスト深さ。自分を包含する FoldRange の数 */
  depth: number;
}

const TAB_WIDTH = 4;

function indentColumns(line: string): number {
  let col = 0;
  for (const ch of line) {
    if (ch === " ") col += 1;
    else if (ch === "\t") col += TAB_WIDTH - (col % TAB_WIDTH);
    else break;
  }
  return col;
}

function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

/**
 * インデント基準の折りたたみ範囲を列挙する。言語非依存。
 * デデント行（閉じ括弧など）は範囲に含めない。VS Code の indent folding と同じ見え方。
 * 深さはインデント幅からではなく包含関係から数えるため、tab/space やインデント幅の検出が不要。
 */
export function computeFoldRanges(lines: string[]): FoldRange[] {
  const ranges: FoldRange[] = [];
  const stack: { line: number; col: number }[] = [];
  let prevNonBlank = -1;
  let prevCol = -1;

  for (let i = 0; i < lines.length; i++) {
    if (isBlank(lines[i])) continue;
    const col = indentColumns(lines[i]);

    if (prevNonBlank >= 0 && col > prevCol) {
      stack.push({ line: prevNonBlank, col: prevCol });
    }
    while (stack.length > 0 && col <= stack[stack.length - 1].col) {
      const start = stack.pop();
      if (start === undefined) break;
      ranges.push({
        startLine: start.line + 1,
        endLine: prevNonBlank + 1,
        depth: stack.length,
      });
    }

    prevNonBlank = i;
    prevCol = col;
  }

  while (stack.length > 0) {
    const start = stack.pop();
    if (start === undefined) break;
    ranges.push({
      startLine: start.line + 1,
      endLine: prevNonBlank + 1,
      depth: stack.length,
    });
  }

  return ranges.sort((a, b) => a.startLine - b.startLine);
}
