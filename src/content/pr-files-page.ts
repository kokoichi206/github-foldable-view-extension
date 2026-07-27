/** GitHub の PR "Files changed" ページの DOM への読み取り口をまとめる。
 *  同じ URL でもアカウントごとに 2 世代の UI が配信される:
 *  - クラシック UI (/files へリダイレクト): .file[data-tagsearch-path] 構造で、
 *    head の blob リンクが DOM 内にある
 *  - React 版 changes UI: [data-testid="progressive-diffs-list"] 配下にハッシュ付き
 *    CSS Modules class で描画され、blob リンクが無い。head SHA とファイルパスは
 *    ページ内の application/json script から突き合わせる */

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

export async function findDiffFileEntries(): Promise<DiffFileEntry[]> {
  const classic = findClassicEntries();
  if (classic.length > 0) return classic;
  return findReactEntries();
}

function findClassicEntries(): DiffFileEntry[] {
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

/* ---- React 版 changes UI ---- */

const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const HEAD_SHA_PATTERN = /"head(?:Sha|Oid)"\s*:\s*"([0-9a-f]{40})"/;

interface ReactDiffMetadata {
  headSha: string;
  /** table[data-diff-anchor] の digest からファイルパスを引く */
  pathByDigest: Map<string, string>;
}

/* payload の解析は重いので SPA ページ単位でキャッシュする */
let metadataCache: {
  pageKey: string;
  value: Promise<ReactDiffMetadata | null>;
} | null = null;

function reactDiffMetadata(): Promise<ReactDiffMetadata | null> {
  const pageKey = location.pathname;
  if (metadataCache?.pageKey !== pageKey) {
    metadataCache = { pageKey, value: collectReactDiffMetadata() };
  }
  return metadataCache.value;
}

async function collectReactDiffMetadata(): Promise<ReactDiffMetadata | null> {
  let headSha: string | null = null;
  const pathByDigest = new Map<string, string>();
  const paths = new Set<string>();

  for (const script of document.querySelectorAll(
    'script[type="application/json"]',
  )) {
    const text = script.textContent ?? "";
    if (headSha === null) {
      headSha = HEAD_SHA_PATTERN.exec(text)?.[1] ?? null;
    }
    if (!text.includes('"path"')) continue;
    try {
      collectPathEntries(JSON.parse(text), pathByDigest, paths);
    } catch {
      /* application/json でない・壊れた payload は対応表の材料にならないだけ */
    }
  }
  if (headSha === null) return null;

  /* anchor の digest 算出方法は UI 世代で変わる (クラシックは sha256(path)、
     React 版は別方式) ため、payload 内の併記ペアに加えて sha256(path) でも
     引けるようにしておく。併記ペアの方を信頼して上書きはしない */
  for (const path of paths) {
    const digest = await sha256Hex(path);
    if (!pathByDigest.has(digest)) pathByDigest.set(digest, path);
  }

  return { headSha, pathByDigest };
}

/** JSON を再帰的に歩き、"path" を持つオブジェクトの同階層にある 64 桁 hex 値を
 *  digest → path のペアとして拾う (フィールド名の変更に依存しないため) */
function collectPathEntries(
  node: unknown,
  pathByDigest: Map<string, string>,
  paths: Set<string>,
): void {
  if (Array.isArray(node)) {
    for (const item of node) collectPathEntries(item, pathByDigest, paths);
    return;
  }
  if (node === null || typeof node !== "object") return;

  const record = node as Record<string, unknown>;
  const path = record["path"];
  if (typeof path === "string" && path.length > 0) {
    paths.add(path);
    for (const value of Object.values(record)) {
      if (typeof value === "string" && DIGEST_PATTERN.test(value)) {
        pathByDigest.set(value, path);
      }
    }
  }
  for (const value of Object.values(record)) {
    collectPathEntries(value, pathByDigest, paths);
  }
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function findReactEntries(): Promise<DiffFileEntry[]> {
  const list = document.querySelector('[data-testid="progressive-diffs-list"]');
  if (list === null) return [];
  const metadata = await reactDiffMetadata();
  if (metadata === null) return [];

  const segments = location.pathname.split("/");
  const ownerRepo = `/${segments[1]}/${segments[2]}`;

  const entries: DiffFileEntry[] = [];
  for (const table of list.querySelectorAll<HTMLElement>(
    "table[data-diff-anchor]",
  )) {
    const digest =
      table.getAttribute("data-diff-anchor")?.replace(/^diff-/, "") ?? "";
    const path = metadata.pathByDigest.get(digest);
    const container = table.closest<HTMLElement>('[class*="diffEntry"]');
    if (path === undefined || container === null) continue;

    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    entries.push({
      container,
      path,
      blobUrl: `${ownerRepo}/blob/${metadata.headSha}/${encodedPath}`,
      /* React 版の DOM には削除判定の材料が無い。削除ファイルは raw が 404 になり
         「取得失敗」表示に落ちるので、ここでは常に false とする */
      deleted: false,
    });
  }
  return entries;
}

/** blob URL を raw URL に変換する。github.com への same-origin fetch になるため
 *  session cookie がそのまま付き、private repo でも追加の認証設定なしで全文を取得できる */
export function rawUrlFromBlobUrl(blobUrl: string): string {
  return blobUrl.replace(/^(\/[^/]+\/[^/]+)\/blob\//, "$1/raw/");
}

/** diff の追加行 (head 側) の行番号。全文ビューでの変更行ハイライトに使う。
 *  React 版の data-diff-line-key は "b:<block>-l:<左行>-r:<右行>" 形式で、
 *  追加行は左行が null になる */
export function addedLineNumbers(container: HTMLElement): number[] {
  const classicCells = container.querySelectorAll<HTMLElement>(
    "td.blob-num-addition[data-line-number]",
  );
  const cells =
    classicCells.length > 0
      ? classicCells
      : container.querySelectorAll<HTMLElement>(
          'td.new-diff-line-number[data-line-number][data-diff-line-key*="l:null"]',
        );
  return [...cells]
    .map((td) => Number(td.getAttribute("data-line-number")))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export function findFileActions(container: HTMLElement): HTMLElement | null {
  return (
    container.querySelector<HTMLElement>(".file-header .file-actions") ??
    container.querySelector<HTMLElement>(
      '[class*="diff-file-header"] > div:last-child',
    )
  );
}

/** diff 本体を包む要素。Foldable 表示中はこれを隠す */
export function findDiffContent(container: HTMLElement): HTMLElement | null {
  const classic = container.querySelector<HTMLElement>(".js-file-content");
  if (classic !== null) return classic;
  return (
    container.querySelector<HTMLElement>("table[data-diff-anchor]")
      ?.parentElement ?? null
  );
}
