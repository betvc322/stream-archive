import assert from "node:assert/strict";
import { test } from "node:test";
import { createSnapshot, parseSourceConfig } from "../src/lib/snapshot.ts";
import { normalizeBasePath } from "../src/lib/deployment.ts";

const published = "https://docs.google.com/spreadsheets/d/e/TEST/pubhtml?gid=0";
const script = "https://script.google.com/macros/s/TEST/exec";
const html = '<table class="waffle"><tr><th>1</th><td>Фильмы</td><td>Сериалы</td><td>Постер фильма</td></tr><tr><th>2</th><td><a href="https://boosty.to/example/posts/test">Ритуал</a> (2017)</td><td></td><td>https://images.example.com/poster.jpg</td></tr></table>';

test("снимок публикации сохраняет настоящие ссылки и постеры", async () => {
  const fetcher = (async () => new Response(html)) as typeof fetch;
  const result = await createSnapshot({ publishedSheetUrl: published, appsScriptUrl: "" }, fetcher);
  assert.equal(result.source, "google");
  assert.equal(result.items[0].url, "https://boosty.to/example/posts/test");
  assert.equal(result.items[0].posterUrl, "https://images.example.com/poster.jpg");
});

test("ошибка источника останавливает создание снимка, без подмены демоданными", async () => {
  const fetcher = (async () => new Response("unavailable", { status: 503 })) as typeof fetch;
  await assert.rejects(createSnapshot({ publishedSheetUrl: published, appsScriptUrl: "" }, fetcher));
});

test("Apps Script имеет приоритет, пустой источник включает честную демоверсию", async () => {
  const fetcher = (async (url) => { assert.equal(url, script); return Response.json({ items: [] }); }) as typeof fetch;
  assert.deepEqual(await createSnapshot({ publishedSheetUrl: published, appsScriptUrl: script }, fetcher), { items: [], source: "google" });
  const demo = await createSnapshot({ publishedSheetUrl: "", appsScriptUrl: "" });
  assert.equal(demo.source, "demo");
  assert.ok(demo.items.every((item) => item.url === null));
});

test("неверная конфигурация не превращается в пустой источник", () => {
  assert.throws(() => parseSourceConfig(null));
  assert.throws(() => parseSourceConfig({ publishedSheetUrl: 123 }));
  assert.equal(parseSourceConfig({ publishedSheetUrl: "  " }).publishedSheetUrl, "");
});

test("пути GitHub Pages: корень, репозиторий и защита от некорректного префикса", () => {
  assert.equal(normalizeBasePath("/"), "");
  assert.equal(normalizeBasePath(" /stream-archive/ "), "/stream-archive");
  for (const value of ["stream-archive", "//example.com", "/../repo", "/repo?x=1", "/repo#test"]) assert.throws(() => normalizeBasePath(value));
});
