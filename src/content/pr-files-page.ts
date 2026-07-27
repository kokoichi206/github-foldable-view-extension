/** GitHub の PR "Files changed" ページの DOM への読み取り口をまとめる。
 *  /pull/N/changes は /pull/N/files へリダイレクトされ、ログイン有無に関わらず
 *  .file[data-tagsearch-path] + diff-table のクラシック構造で描画される。 */

export interface DiffFileEntry {
  container: HTMLElement;
  path: string;
  /** head commit を指す blob URL (/owner/repo/blob/<sha>/<path>)。全文取得の起点 */
  blobUrl: string;
  deleted: boolean;
}

export function isPrFilesPage(): boolean {
  return /^\/[^/]+\/[^/]+\/pull\/\d+\/(files|changes)\b/.test(location.pathname);
}

export function findDiffFileEntries(): DiffFileEntry[] {
  const containers = document.querySelectorAll<HTMLElement>(
    ".file[data-tagsearch-path]",
  );
  const entries: DiffFileEntry[] = [];
  for (const container of containers) {
    const path = container.getAttribute("data-tagsearch-path");
    const blobUrl = container
      .querySelector<HTMLAnchorElement>('a[href*="/blob/"]')
      ?.getAttribute("href");
    if (path === null || blobUrl == null) continue;
    entries.push({
      container,
      path,
      blobUrl,
      deleted: container.getAttribute("data-file-deleted") === "true",
    });
  }
  return entries;
}

/** blob URL を raw URL に変換する。github.com への same-origin fetch になるため
 *  session cookie がそのまま付き、private repo でも追加の認証設定なしで全文を取得できる */
export function rawUrlFromBlobUrl(blobUrl: string): string {
  return blobUrl.replace(/^(\/[^/]+\/[^/]+)\/blob\//, "$1/raw/");
}

/** diff テーブルの追加行 (head 側) の行番号。全文ビューでの変更行ハイライトに使う。
 *  「Load diff」で未展開の大きなファイルでは空になる (ハイライト無しで表示する) */
export function addedLineNumbers(container: HTMLElement): number[] {
  return [
    ...container.querySelectorAll<HTMLElement>(
      "td.blob-num-addition[data-line-number]",
    ),
  ]
    .map((td) => Number(td.getAttribute("data-line-number")))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export function findFileActions(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>(".file-header .file-actions");
}

/** diff 本体 (テーブルや rich diff) を包む要素。Foldable 表示中はこれを隠す */
export function findDiffContent(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>(".js-file-content");
}
