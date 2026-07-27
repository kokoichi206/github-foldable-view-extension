import { describe, expect, it } from "vitest";

import { rawUrlFromBlobUrl, sha256Hex } from "./pr-files-page";

describe("rawUrlFromBlobUrl", () => {
  it("blob セグメントだけを raw に置換する", () => {
    expect(
      rawUrlFromBlobUrl("/owner/repo/blob/5d0242c67ef0/lint-workflows/src/main.ts"),
    ).toBe("/owner/repo/raw/5d0242c67ef0/lint-workflows/src/main.ts");
  });

  it("パス側に blob という語が含まれても置換しない", () => {
    expect(rawUrlFromBlobUrl("/owner/repo/blob/abc123/src/blob/data.ts")).toBe(
      "/owner/repo/raw/abc123/src/blob/data.ts",
    );
  });
});

describe("sha256Hex", () => {
  it("クラシック UI の diff anchor (sha256(path)) と一致する", async () => {
    expect(await sha256Hex(".gitattributes")).toBe(
      "618cd5b83d62060ba3d027e314a21ceaf75d36067ff820db126642944145393e",
    );
  });
});
