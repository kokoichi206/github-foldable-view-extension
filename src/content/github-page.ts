/** GitHub の blob ページ（単一ファイル表示）の DOM への読み取り口をまとめる。
 *  class 名はハッシュ付きで不安定なため、id と要素構造だけを頼る。 */

/** 全文が入った hidden textarea。GitHub がコピー・カーソル操作用に保持している */
export function findSourceTextarea(): HTMLTextAreaElement | null {
  return document.querySelector<HTMLTextAreaElement>(
    "#read-only-cursor-text-area",
  );
}

/** コードビュー全体を包む section。仮想スクロールの行 DOM ごと差し替え対象にする */
export function findCodeSection(): HTMLElement | null {
  return findSourceTextarea()?.closest("section") ?? null;
}

export function isBlobPage(): boolean {
  return /^\/[^/]+\/[^/]+\/blob\//.test(location.pathname) &&
    findSourceTextarea() !== null;
}

export function currentFilename(): string {
  const segments = location.pathname.split("/");
  return decodeURIComponent(segments[segments.length - 1] ?? "");
}
