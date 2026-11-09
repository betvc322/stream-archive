import assert from "node:assert/strict";
import { test } from "node:test";
import { getPosterUrl } from "../src/lib/catalog.ts";
import { fetchPublishedCatalog, parsePublishedCatalog, publishedSheetEndpoint } from "../src/lib/published-sheet.ts";

const endpoint = "https://docs.google.com/spreadsheets/d/e/TEST_PUBLICATION/pubhtml?gid=0&single=true";
const header = '<tr><th>1</th><td>Фильмы</td><td>Сериалы</td><td>Постер фильма</td><td>Постер сериала</td></tr>';
const wrap = (rows: string) => `<table class="waffle">${header}${rows}</table>`;

test("публичная ссылка нормализуется, сторонние адреса и обычная ссылка редактора отклоняются", () => {
  assert.equal(publishedSheetEndpoint(endpoint), "https://docs.google.com/spreadsheets/d/e/TEST_PUBLICATION/pubhtml/sheet?headers=false&gid=0");
  for (const value of ["https://example.com/test", "https://docs.google.com/spreadsheets/d/ID/edit", endpoint.replace("gid=0", "gid=oops")]) {
    assert.throws(() => publishedSheetEndpoint(value));
  }
});

test("частичная ссылка, Google-редирект и HTML-сущности импортируются вместе с годом/сезоном", () => {
  const html = wrap('<tr><th>2</th><td><a href="https://www.google.com/url?q=https%3A%2F%2Fboosty.to%2Fexample%2Fposts%2Ftest%3Fa%3D1%26b%3D2&amp;sa=D">Фильм &amp; ещё 2</a> (2026)</td><td><a href="https://boosty.to/example?postsTagsIds=123">Сериал</a> 2 сезон</td><td>https://images.example.com/film.jpg</td><td><a href="https://www.google.com/url?q=https%3A%2F%2Fimages.example.com%2Fseries.jpg">Постер</a></td></tr>');
  const items = parsePublishedCatalog(html);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "Фильм & ещё 2");
  assert.equal(items[0].year, 2026);
  assert.equal(items[0].url, "https://boosty.to/example/posts/test?a=1&b=2");
  assert.equal(items[0].posterUrl, "https://images.example.com/film.jpg");
  assert.equal(items[1].title, "Сериал");
  assert.equal(items[1].season, 2);
  assert.equal(items[1].posterUrl, "https://images.example.com/series.jpg");
});

test("пустые строки пропускаются, отсутствующие и опасные ссылки не становятся кликабельными", () => {
  const items = parsePublishedCatalog(wrap('<tr><th>2</th><td></td><td></td></tr><tr><th>3</th><td><a href="javascript:alert(1)">1917</a></td><td></td><td>javascript:alert(1)</td></tr>'));
  assert.equal(items.length, 1);
  assert.equal(items[0].sourceRow, 3);
  assert.equal(items[0].year, null);
  assert.equal(items[0].url, null);
  assert.equal(items[0].posterUrl, null);
  assert.deepEqual(parsePublishedCatalog(wrap("")), []);
});

test("форма входа, неверные заголовки и поврежденная публикация считаются ошибкой", () => {
  assert.throws(() => parsePublishedCatalog('<html>Войдите в Google</html>'), /INVALID_PUBLISHED_SHEET/);
  assert.throws(() => parsePublishedCatalog('<table class="waffle"><tr><th>1</th><td>Другое</td><td>Сериалы</td></tr></table>'));
});

test("постеры: HTTPS без учетных данных; HTTP и javascript отклоняются", () => {
  assert.equal(getPosterUrl("https://m.media-amazon.com/images/test.jpg"), "https://m.media-amazon.com/images/test.jpg");
  for (const value of ["javascript:alert(1)", "http://images.example.com/x", "https://user:pass@images.example.com/x", "data:image/svg+xml,test"]) assert.equal(getPosterUrl(value), null);
});

test("загрузка публикации обрабатывает HTTP-ошибки и HTML без таблицы", async () => {
  const mock = (response: Response) => (async () => response) as typeof fetch;
  await assert.rejects(fetchPublishedCatalog(endpoint, mock(new Response("unavailable", { status: 503 }))));
  await assert.rejects(fetchPublishedCatalog(endpoint, mock(new Response("Sign in"))));
  assert.deepEqual(await fetchPublishedCatalog(endpoint, mock(new Response(wrap("")))), []);
});
