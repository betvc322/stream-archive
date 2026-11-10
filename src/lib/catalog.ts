export type MediaType = "movie" | "series";
export type Category = "all" | MediaType;
export type SortOrder = "title-asc" | "year-asc" | "year-desc";

export interface CatalogItem {
  id: string;
  type: MediaType;
  title: string;
  year: number | null;
  season: number | null;
  url: string | null;
  posterUrl: string | null;
  sourceRow: number;
}

export interface CatalogPayload {
  items: CatalogItem[];
  source: "demo" | "google";
}

export function normalizeSearch(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

/** Разрешены только настоящие HTTPS-адреса Boosty, без логина и пароля в URL. */
export function getBoostyUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      !["boosty.to", "www.boosty.to"].includes(url.hostname) ||
      url.username || url.password || url.port
    ) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function getPosterUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    return url.href;
  } catch { return null; }
}

/** Метаданные снимаются только с конца; числа внутри названия сохраняются. */
export function parseCatalogTitle(text: string, type: MediaType) {
  let title = text.replace(/\s+/g, " ").trim();
  let year: number | null = null;
  let season: number | null = null;
  for (let pass = 0; pass < 2; pass++) {
    if (type === "series" && season === null) {
      const match = /\s+(\d{1,4})\s+сезон(?:а|ов)?\s*$/i.exec(title);
      if (match && Number(match[1]) > 0) {
        season = Number(match[1]);
        title = title.slice(0, match.index).trim();
      }
    }
    if (year === null) {
      const match = /\s*\(([12]\d{3})\)\s*$/.exec(title);
      if (match) {
        year = Number(match[1]);
        title = title.slice(0, match.index).trim();
      }
    }
  }
  return { title: title || text.trim(), year, season };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalInteger(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new Error("INVALID_CATALOG_METADATA");
  }
  return value;
}

/** Принимает массив или { items: [...] }. Пустой массив — полноценный пустой каталог. */
export function parseCatalogItems(value: unknown): CatalogItem[] {
  const items: unknown = Array.isArray(value) ? value : isRecord(value) ? value.items : null;
  if (!Array.isArray(items) || items.length > 50_000) throw new Error("INVALID_CATALOG");
  const seen = new Set<string>();
  return items.map((item: unknown) => {
    if (
      !isRecord(item) || typeof item.id !== "string" || !item.id.trim() || seen.has(item.id) ||
      (item.type !== "movie" && item.type !== "series") ||
      typeof item.title !== "string" || !item.title.trim() ||
      typeof item.sourceRow !== "number" || !Number.isInteger(item.sourceRow) || item.sourceRow < 2
    ) throw new Error("INVALID_CATALOG_ITEM");
    seen.add(item.id);
    return {
      id: item.id,
      type: item.type,
      title: item.title.trim(),
      year: optionalInteger(item.year, 1000, 2999),
      season: optionalInteger(item.season, 1, 9999),
      url: getBoostyUrl(item.url),
      posterUrl: getPosterUrl(item.posterUrl),
      sourceRow: item.sourceRow,
    };
  });
}

const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });

export function sortCatalog(items: readonly CatalogItem[], order: SortOrder): CatalogItem[] {
  return [...items].sort((a, b) => {
    const titleOrder = collator.compare(a.title, b.title);
    if (order === "title-asc") return titleOrder;
    // Номер сезона не заменяет год. Неизвестный год всегда в конце.
    if (a.year === null) return b.year === null ? titleOrder : 1;
    if (b.year === null) return -1;
    const yearOrder = order === "year-asc" ? a.year - b.year : b.year - a.year;
    return yearOrder || titleOrder;
  });
}

export interface SearchEntry { item: CatalogItem; searchText: string }

export function indexCatalog(items: readonly CatalogItem[]): SearchEntry[] {
  return items.map((item) => ({ item, searchText: normalizeSearch(item.title) }));
}

export function filterCatalog(index: readonly SearchEntry[], query: string, category: Category): CatalogItem[] {
  const normalized = normalizeSearch(query);
  return index.filter(({ item, searchText }) =>
    (category === "all" || item.type === category) && searchText.includes(normalized),
  ).map(({ item }) => item);
}

export function entryWord(count: number): string {
  const mod100 = Math.abs(count) % 100;
  const mod10 = mod100 % 10;
  if (mod100 >= 11 && mod100 <= 14) return "записей";
  if (mod10 === 1) return "запись";
  if (mod10 >= 2 && mod10 <= 4) return "записи";
  return "записей";
}

export function seasonLabel(season: number): string {
  return `${season} сезон`;
}
