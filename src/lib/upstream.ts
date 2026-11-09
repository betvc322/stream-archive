import { parseCatalogItems, type CatalogItem } from "./catalog.ts";
import { readLimitedText } from "./http.ts";

export function validateScriptUrl(value: string): string {
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" && url.hostname === "script.google.com" &&
      !url.username && !url.password && !url.port &&
      /^\/macros\/s\/[\w-]+\/exec$/.test(url.pathname)
    ) return url.href;
  } catch { /* Неверную настройку обрабатываем так же, как недоступный источник. */ }
  throw new Error("INVALID_SCRIPT_URL");
}

/** Google перенаправляет ContentService на script.googleusercontent.com. */
export async function fetchGoogleCatalog(endpoint: string, fetcher: typeof fetch = fetch): Promise<CatalogItem[]> {
  const response = await fetcher(validateScriptUrl(endpoint), {
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("UPSTREAM_HTTP_ERROR");
  const text = await readLimitedText(response);
  let json: unknown;
  try { json = JSON.parse(text); } catch { throw new Error("INVALID_UPSTREAM_JSON"); }
  return parseCatalogItems(json);
}
