import { Parser } from "htmlparser2";
import { getBoostyUrl, getPosterUrl, normalizeSearch, parseCatalogTitle, type CatalogItem, type MediaType } from "./catalog.ts";
import { readLimitedText } from "./http.ts";

interface Cell { text: string; links: string[]; span: number }

export function publishedSheetEndpoint(value: string): string {
  try {
    const url = new URL(value);
    const match = /^\/spreadsheets\/d\/e\/([\w-]+)\/pubhtml(?:\/sheet)?\/?$/.exec(url.pathname);
    const gid = url.searchParams.get("gid") ?? "0";
    if (url.protocol === "https:" && url.hostname === "docs.google.com" && !url.username &&
      !url.password && !url.port && match && /^\d+$/.test(gid)) {
      return `https://docs.google.com/spreadsheets/d/e/${match[1]}/pubhtml/sheet?headers=false&gid=${gid}`;
    }
  } catch { /* В настройке разрешён только опубликованный лист Google. */ }
  throw new Error("INVALID_PUBLISHED_SHEET_URL");
}

function unwrapGoogleLink(value: string): string {
  try {
    const url = new URL(value);
    if (["www.google.com", "google.com"].includes(url.hostname) && url.pathname === "/url") {
      return url.searchParams.get("q") ?? url.searchParams.get("url") ?? "";
    }
  } catch { return ""; }
  return value;
}

/** Разбирает опубликованную HTML-таблицу, сохраняя ссылки на фрагментах текста. */
export function parsePublishedCatalog(html: string): CatalogItem[] {
  const items: CatalogItem[] = [];
  let tableDepth = 0;
  let foundTable = false;
  let foundHeader = false;
  let inRow = false;
  let inRowHeading = false;
  let rowHeading = "";
  let rowNumber = 0;
  let cells: Cell[] = [];
  let cell: Cell | null = null;

  const parser = new Parser({
    onopentag(name, attributes) {
      if (name === "table") {
        if (tableDepth > 0) tableDepth++;
        else if ((attributes.class ?? "").split(/\s+/).includes("waffle")) {
          tableDepth = 1;
          foundTable = true;
        }
      }
      if (tableDepth !== 1) return;
      if (name === "tr") { inRow = true; cells = []; rowHeading = ""; }
      if (!inRow) return;
      if (name === "th") inRowHeading = true;
      if (name === "td") cell = { text: "", links: [], span: Math.min(50, Math.max(1, Number(attributes.colspan) || 1)) };
      if (cell && name === "a" && attributes.href) cell.links.push(unwrapGoogleLink(attributes.href));
      if (cell && name === "br") cell.text += " ";
    },
    ontext(text) {
      if (tableDepth !== 1) return;
      if (cell) cell.text += text;
      else if (inRowHeading) rowHeading += text;
    },
    onclosetag(name) {
      if (name === "table" && tableDepth > 0) { tableDepth--; return; }
      if (tableDepth !== 1) return;
      if (name === "th") inRowHeading = false;
      if (name === "td" && cell) {
        cells.push(cell);
        for (let index = 1; index < cell.span; index++) cells.push({ text: "", links: [], span: 1 });
        cell = null;
      }
      if (name !== "tr" || !inRow) return;
      inRow = false;
      if (cells.length === 0) return;
      rowNumber++;
      const sourceRow = /^\d+$/.test(rowHeading.trim()) ? Number(rowHeading.trim()) : rowNumber;
      if (sourceRow === 1) {
        foundHeader = normalizeSearch(cells[0]?.text ?? "") === "фильмы" && normalizeSearch(cells[1]?.text ?? "") === "сериалы";
        return;
      }
      if (!foundHeader) return;
      for (let column = 0; column < 2; column++) {
        const source = cells[column];
        const text = source?.text.replace(/\s+/g, " ").trim();
        if (!text) continue;
        const type: MediaType = column === 0 ? "movie" : "series";
        const posterCell = cells[column + 2];
        const posterUrl = getPosterUrl(posterCell?.text) ?? posterCell?.links.map(getPosterUrl).find(Boolean) ?? null;
        items.push({
          id: `${type === "movie" ? "film" : "series"}-${sourceRow}`,
          type,
          ...parseCatalogTitle(text, type),
          url: source.links.map(getBoostyUrl).find(Boolean) ?? null,
          posterUrl,
          sourceRow,
        });
        if (items.length > 50_000) throw new Error("CATALOG_TOO_LARGE");
      }
    },
  }, { decodeEntities: true });
  parser.end(html);
  if (!foundTable || !foundHeader) throw new Error("INVALID_PUBLISHED_SHEET");
  return items;
}

export async function fetchPublishedCatalog(endpoint: string, fetcher: typeof fetch = fetch): Promise<CatalogItem[]> {
  const response = await fetcher(publishedSheetEndpoint(endpoint), {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
    headers: { Accept: "text/html" },
  });
  if (!response.ok) throw new Error(`UPSTREAM_HTTP_${response.status}`);
  return parsePublishedCatalog(await readLimitedText(response));
}
