import assert from "node:assert/strict";
import { test } from "node:test";
import { entryWord, filterCatalog, getBoostyUrl, indexCatalog, normalizeSearch, parseCatalogItems, sortCatalog, type CatalogItem } from "../src/lib/catalog.ts";

const base: CatalogItem = { id: "film-2", type: "movie", title: "Вышка 2", year: 2026, season: null, url: null, posterUrl: null, sourceRow: 2 };
const items: CatalogItem[] = [
  base,
  { ...base, id: "series-2", type: "series", title: "Ёлки   и Ежи", year: null, season: 2 },
  { ...base, id: "film-3", title: "Ритуал", year: 2017, sourceRow: 3 },
];

test("поиск: русский регистр, ё/е, неразрывные и повторные пробелы", () => {
  assert.equal(normalizeSearch("  ЁЛКИ\u00a0 и    Ежи "), "елки и ежи");
  assert.deepEqual(filterCatalog(indexCatalog(items), "  ЕЛКИ  И ежи", "all").map((item) => item.id), ["series-2"]);
  assert.equal(filterCatalog(indexCatalog(items), "рит", "all").length, 1);
});

test("поиск и фильтр применяются одновременно", () => {
  const index = indexCatalog(items);
  assert.equal(filterCatalog(index, "елки", "movie").length, 0);
  assert.equal(filterCatalog(index, "елки", "series").length, 1);
  assert.equal(filterCatalog(index, "    ", "all").length, 3);
  assert.equal(filterCatalog(index, "несуществующая запись", "all").length, 0);
});

test("сортировка не меняет исходный массив", () => {
  const reversed = [...items].reverse();
  const originalIds = reversed.map((item) => item.id);
  sortCatalog(reversed, "year-desc");
  assert.deepEqual(reversed.map((item) => item.id), originalIds);
  assert.equal(reversed[0].id, "film-3");
});

test("по году: в обоих направлениях неизвестный год и номер сезона не смешиваются с годами", () => {
  assert.deepEqual(sortCatalog(items, "year-asc").map((item) => item.year), [2017, 2026, null]);
  assert.deepEqual(sortCatalog(items, "year-desc").map((item) => item.year), [2026, 2017, null]);
  assert.equal(sortCatalog(items, "year-asc").at(-1)?.season, 2);
});

test("записи одного года и записи без года упорядочиваются по алфавиту", () => {
  const sameYear = [base, { ...base, id: "film-3", title: "Аватар" }];
  assert.deepEqual(sortCatalog(sameYear, "year-desc").map((item) => item.title), ["Аватар", "Вышка 2"]);
  assert.deepEqual(sortCatalog(sameYear.map((item) => ({ ...item, year: null })), "year-asc").map((item) => item.title), ["Аватар", "Вышка 2"]);
});

test("сортировка по алфавиту с русскими названиями", () => {
  assert.deepEqual(sortCatalog(items, "title-asc").map((item) => item.title), ["Вышка 2", "Ёлки   и Ежи", "Ритуал"]);
});

test("склонение счетчика", () => {
  for (const n of [1, 21, 101]) assert.equal(entryWord(n), "запись");
  for (const n of [2, 4, 22]) assert.equal(entryWord(n), "записи");
  for (const n of [0, 5, 11, 12, 14, 111]) assert.equal(entryWord(n), "записей");
});

test("URL: только HTTPS Boosty, без подмены домена и учетных данных", () => {
  assert.equal(getBoostyUrl("https://boosty.to/example/posts/test"), "https://boosty.to/example/posts/test");
  for (const url of [null, "", "javascript:alert(1)", "https://boosty.to.evil.example/", "https://boosty.to@evil.example/", "http://boosty.to/x", "https://user:pass@boosty.to/x", "https://example.org", "https://boosty.to:444/x"]) {
    assert.equal(getBoostyUrl(url), null, String(url));
  }
});

test("валидатор принимает массив, envelope, пустой каталог и безопасно отключает плохие ссылки", () => {
  assert.deepEqual(parseCatalogItems({ items: [] }), []);
  assert.equal(parseCatalogItems([base])[0].title, "Вышка 2");
  assert.equal(parseCatalogItems({ items: [{ ...base, url: "javascript:alert(1)" }] })[0].url, null);
  assert.equal(parseCatalogItems({ items: [{ ...base, url: "https://boosty.to/example/posts/test" }] })[0].url, "https://boosty.to/example/posts/test");
});

test("поврежденный JSON-контракт не маскируется пустым каталогом", () => {
  for (const value of [null, {}, { error: "DENIED" }, { items: "wrong" }, [base, base], [{ ...base, type: "bad" }], [{ ...base, title: " " }], [{ ...base, year: "2026" }], [{ ...base, sourceRow: 1 }]]) {
    assert.throws(() => parseCatalogItems(value));
  }
});

test("поиск и сортировка каталога из 10000 записей", () => {
  const large = Array.from({ length: 10_000 }, (_, n) => ({ ...base, id: `film-${n + 2}`, title: `Фильм ${n}`, sourceRow: n + 2 }));
  const indexed = indexCatalog(sortCatalog(large, "title-asc"));
  assert.equal(filterCatalog(indexed, "ФИЛЬМ 9999", "movie")[0].id, "film-10001");
  assert.equal(filterCatalog(indexed, "", "all").length, 10_000);
});
