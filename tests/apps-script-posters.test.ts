import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createContext, runInContext } from "node:vm";

test("Apps Script читает постеры фильма из C, сериала из D в той же строке", () => {
  const range = {
    getDisplayValues: () => [["Ритуал (2017)", "Кэрри (2026) 1 сезон", "https://images.example.com/movie.jpg", "Постер"]],
    getRichTextValues: () => [[null, null, null, { getLinkUrl: () => "https://images.example.com/series.jpg" }]],
    getFormulas: () => [["", "", "", ""]],
  };
  const sheet = {
    getLastRow: () => 2,
    getMaxColumns: () => 26,
    getRange: (...args: unknown[]) => { assert.deepEqual(args, [2, 1, 1, 4]); return range; },
  };
  const context = createContext({ console, SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }) } });
  runInContext(readFileSync(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8"), context);
  const items = context.readCatalog_();
  assert.equal(items[0].posterUrl, "https://images.example.com/movie.jpg");
  assert.equal(items[1].posterUrl, "https://images.example.com/series.jpg");
});
