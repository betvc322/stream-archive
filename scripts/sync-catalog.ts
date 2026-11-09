import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createSnapshot, parseSourceConfig } from "../src/lib/snapshot.ts";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

try {
  const root = new URL("../", import.meta.url);
  const config = parseSourceConfig(JSON.parse(await readFile(new URL("catalog.config.json", root), "utf8")));
  if (process.env.GOOGLE_PUBLISHED_SHEET_URL !== undefined) config.publishedSheetUrl = process.env.GOOGLE_PUBLISHED_SHEET_URL.trim();
  if (process.env.GOOGLE_APPS_SCRIPT_URL !== undefined) config.appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL.trim();
  const payload = await createSnapshot(config);
  const directory = new URL("public/", root);
  await mkdir(directory, { recursive: true });
  const target = new URL("catalog.json", directory);
  const temporary = new URL("catalog.json.tmp", directory);
  await writeFile(temporary, JSON.stringify(payload) + "\n", "utf8");
  await rename(temporary, target);
  console.log(`Каталог: ${payload.items.length} записей, источник ${payload.source}. Сохранён ${fileURLToPath(target)}.`);
} catch (error) {
  // При ошибке Actions не публикует повреждённый/демонстрационный каталог поверх настоящего.
  console.error("Не удалось обновить каталог:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
}
