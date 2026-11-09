import { demoCatalog } from "../data/demo.ts";
import type { CatalogPayload } from "./catalog.ts";
import { fetchPublishedCatalog } from "./published-sheet.ts";
import { fetchGoogleCatalog } from "./upstream.ts";

export interface SourceConfig {
  publishedSheetUrl: string;
  appsScriptUrl: string;
}

export function parseSourceConfig(value: unknown): SourceConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_SOURCE_CONFIG");
  const config = value as Record<string, unknown>;
  for (const key of ["publishedSheetUrl", "appsScriptUrl"]) {
    if (config[key] !== undefined && typeof config[key] !== "string") throw new Error("INVALID_SOURCE_CONFIG");
  }
  return {
    publishedSheetUrl: String(config.publishedSheetUrl ?? "").trim(),
    appsScriptUrl: String(config.appsScriptUrl ?? "").trim(),
  };
}

/** Выполняется при сборке в Actions; браузер Google не опрашивает. */
export async function createSnapshot(config: SourceConfig, fetcher: typeof fetch = fetch): Promise<CatalogPayload> {
  if (config.appsScriptUrl) return { items: await fetchGoogleCatalog(config.appsScriptUrl, fetcher), source: "google" };
  if (config.publishedSheetUrl) return { items: await fetchPublishedCatalog(config.publishedSheetUrl, fetcher), source: "google" };
  return { items: demoCatalog, source: "demo" };
}
