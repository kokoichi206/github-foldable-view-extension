import { describe, expect, it } from "vitest";
import { computeFoldRanges } from "./indent-fold";

describe("computeFoldRanges", () => {
  it("ネストした JSON で包含関係どおりの範囲と深さを返す", () => {
    const lines = [
      "{", //                 1
      '  "replacements": [', // 2
      "    {", //             3
      '      "id": "a",', //  4
      '      "with": "b"', // 5
      "    },", //            6
      "    {", //             7
      '      "id": "c"', //   8
      "    }", //             9
      "  ]", //               10
      "}", //                 11
    ];
    expect(computeFoldRanges(lines)).toEqual([
      { startLine: 1, endLine: 10, depth: 0 },
      { startLine: 2, endLine: 9, depth: 1 },
      { startLine: 3, endLine: 5, depth: 2 },
      { startLine: 7, endLine: 8, depth: 2 },
    ]);
  });

  it("デデント行（閉じ括弧）を範囲に含めず、畳んでも閉じ括弧が見える", () => {
    const lines = ["func main() {", "\tfmt.Println(1)", "}"];
    expect(computeFoldRanges(lines)).toEqual([
      { startLine: 1, endLine: 2, depth: 0 },
    ]);
  });

  it("タブインデント (Go) とスペースインデントを同じ構造として扱う", () => {
    const tabbed = ["type A struct {", "\tName string", "\tAge  int", "}"];
    const spaced = ["type A struct {", "  Name string", "  Age  int", "}"];
    expect(computeFoldRanges(tabbed)).toEqual(computeFoldRanges(spaced));
  });

  it("空行はインデント境界として扱わず、範囲の内側として通過する", () => {
    const lines = [
      "def f():", //  1
      "    a = 1", // 2
      "", //          3
      "    b = 2", // 4
      "print(1)", //  5
    ];
    expect(computeFoldRanges(lines)).toEqual([
      { startLine: 1, endLine: 4, depth: 0 },
    ]);
  });

  it("ファイル末尾で閉じない範囲は最終非空行まで畳む", () => {
    const lines = ["root:", "  child: 1", "  grand:", "    deep: 2"];
    expect(computeFoldRanges(lines)).toEqual([
      { startLine: 1, endLine: 4, depth: 0 },
      { startLine: 3, endLine: 4, depth: 1 },
    ]);
  });

  it("インデントのないフラットなファイルでは範囲を作らない", () => {
    expect(computeFoldRanges(["a", "b", "c"])).toEqual([]);
  });
});
