import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createContext, runInContext } from "node:vm";

const code = readFileSync(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8");

function setup(extra: Record<string, unknown> = {}) {
  const context = createContext({ console, ...extra });
  runInContext(code, context);
  return context;
}

// JSON сравнивается между realm VM и Node без зависимости от прототипов.
function plain(value: unknown) { return JSON.parse(JSON.stringify(value)); }

test("Apps Script отделяет год/сезон, сохраняя числа в названиях", () => {
  const context = setup();
  const examples = [
    ["Вышка 2 (2026)", "movie", { title: "Вышка 2", year: 2026, season: null }],
    ["Сумерки 2: Новолуние (2009)", "movie", { title: "Сумерки 2: Новолуние", year: 2009, season: null }],
    ["Декстер: Воскрешение 2 сезон", "series", { title: "Декстер: Воскрешение", year: null, season: 2 }],
    ["Кэрри (2026) 1 сезон", "series", { title: "Кэрри", year: 2026, season: 1 }],
    ["Кэрри 1 сезон (2026)", "series", { title: "Кэрри", year: 2026, season: 1 }],
    ["1917", "movie", { title: "1917", year: null, season: null }],
    ["Название (часть 2) (2004)", "movie", { title: "Название (часть 2)", year: 2004, season: null }],
    ["Фильм 2 сезон", "movie", { title: "Фильм 2 сезон", year: null, season: null }],
  ];
  for (const [text, type, expected] of examples) assert.deepEqual(plain(context.parseTitle_(text, type)), expected);
});

test("RichText: целая ячейка и только название перед несвязанным сезоном", () => {
  const context = setup();
  const link = "https://boosty.to/example/posts/test";
  assert.equal(context.extractLink_({ getLinkUrl: () => link }, "", {}), link);
  const partial = { getLinkUrl: () => null, getRuns: () => [{ getLinkUrl: () => link }, { getLinkUrl: () => null }] };
  assert.equal(context.extractLink_(partial, "", {}), link);
  assert.equal(context.extractLink_({ getLinkUrl: () => null, getRuns: () => [] }, "", {}), null);
});

test("из нескольких ссылок выбирается первая безопасная ссылка Boosty", () => {
  const context = setup();
  const rich = { getLinkUrl: () => null, getRuns: () => [
    { getLinkUrl: () => "https://example.com" },
    { getLinkUrl: () => "https://boosty.to/example/posts/first" },
    { getLinkUrl: () => "https://boosty.to/example/posts/second" },
  ] };
  assert.equal(context.extractLink_(rich, "", {}), "https://boosty.to/example/posts/first");
});

test("HYPERLINK: запятая/точка с запятой, URL с разделителями и ссылка на ячейку", () => {
  const context = setup();
  const link = "https://boosty.to/example/posts/test?a=1,2;b=3";
  assert.equal(context.extractLink_(null, `=HYPERLINK("${link}", "Название")`, {}), link);
  assert.equal(context.extractLink_(null, `=HYPERLINK("${link}"; "Название")`, {}), link);
  assert.equal(context.extractLink_(null, `=ГИПЕРССЫЛКА("${link}"; "Название")`, {}), link);
  const sheet = { getRange: (ref: string) => { assert.equal(ref, "C2"); return { getDisplayValue: () => link }; } };
  assert.equal(context.extractLink_(null, '=HYPERLINK($C$2; "Название")', sheet), link);
  assert.equal(context.extractLink_(null, '=HYPERLINK(CONCAT("https://boosty.to/", C2); "Название")', {}), null);
});

test("Apps Script отклоняет небезопасные URL", () => {
  const context = setup();
  for (const url of ["javascript:alert(1)", "https://boosty.to.evil.example/x", "https://boosty.to@evil.example/x", "http://boosty.to/x", "https://boosty.to/path with space"]) assert.equal(context.safeBoostyUrl_(url), null);
});

test("чтение A:B пропускает пустые ячейки, сохраняет sourceRow и частичные ссылки", () => {
  const link = "https://boosty.to/example/posts/test";
  const range = {
    getDisplayValues: () => [["Вышка 2 (2026)", "Декстер: Воскрешение 2 сезон"], ["", "  "], ["Ритуал (2017)", ""]],
    getRichTextValues: () => [[null, { getLinkUrl: () => null, getRuns: () => [{ getLinkUrl: () => link }] }], [null, null], [null, null]],
    getFormulas: () => [["", ""], ["", ""], ["", ""]],
  };
  const sheet = { getLastRow: () => 4, getMaxColumns: () => 2, getRange: (...args: unknown[]) => { assert.deepEqual(args, [2, 1, 3, 2]); return range; } };
  const context = setup({ SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }) } });
  const items = plain(context.readCatalog_());
  assert.equal(items.length, 3);
  assert.equal(items[0].title, "Вышка 2");
  assert.equal(items[1].url, link);
  assert.equal(items[1].season, 2);
  assert.equal(items[2].sourceRow, 4);
  assert.equal(items[2].id, "film-4");
});

test("таблица только с заголовками и несуществующий лист", () => {
  const context = setup({ SpreadsheetApp: { openById: () => ({ getSheetByName: () => ({ getLastRow: () => 1 }) }) } });
  assert.deepEqual(plain(context.readCatalog_()), []);
  const missing = setup({ SpreadsheetApp: { openById: () => ({ getSheetByName: () => null }) } });
  assert.throws(() => missing.readCatalog_(), /Не найден лист/);
});
