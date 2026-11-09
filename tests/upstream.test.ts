import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchGoogleCatalog, validateScriptUrl } from "../src/lib/upstream.ts";

const endpoint = "https://script.google.com/macros/s/TEST_DEPLOYMENT/exec";
const item = { id: "film-2", type: "movie", title: "Ритуал", year: 2017, season: null, url: "https://boosty.to/example/posts/test", posterUrl: null, sourceRow: 2 };

function mockFetch(response: () => Response | Promise<Response>): typeof fetch {
  return (async () => response()) as typeof fetch;
}

test("принимается опубликованный /exec, но не /dev и сторонний сервер", () => {
  assert.equal(validateScriptUrl(endpoint), endpoint);
  for (const value of [endpoint.replace("exec", "dev"), "https://example.com/exec", "http://script.google.com/macros/s/test/exec", "https://script.google.com.evil.example/macros/s/test/exec"]) {
    assert.throws(() => validateScriptUrl(value));
  }
});

test("JSON и ссылки проходят из источника без потери данных", async () => {
  const fetcher = (async (input, init) => {
    assert.equal(input, endpoint);
    assert.equal(init?.redirect, "follow");
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal);
    return Response.json({ items: [item] });
  }) as typeof fetch;
  assert.deepEqual(await fetchGoogleCatalog(endpoint, fetcher), [item]);
});

test("недоступный сервер, невалидный JSON, HTML авторизации и JSON ошибки", async () => {
  await assert.rejects(fetchGoogleCatalog(endpoint, mockFetch(() => new Response("unavailable", { status: 503 }))));
  await assert.rejects(fetchGoogleCatalog(endpoint, mockFetch(() => new Response("{broken"))), /INVALID_UPSTREAM_JSON/);
  await assert.rejects(fetchGoogleCatalog(endpoint, mockFetch(() => new Response("<html>Sign in</html>"))), /INVALID_UPSTREAM_JSON/);
  await assert.rejects(fetchGoogleCatalog(endpoint, mockFetch(() => Response.json({ error: "CATALOG_UNAVAILABLE" }))));
  await assert.rejects(fetchGoogleCatalog(endpoint, mockFetch(() => { throw new TypeError("network"); })));
});

test("успешный пустой каталог и ответ без тела различаются", async () => {
  assert.deepEqual(await fetchGoogleCatalog(endpoint, mockFetch(() => Response.json({ items: [] }))), []);
  await assert.rejects(fetchGoogleCatalog(endpoint, mockFetch(() => new Response(null))), /EMPTY_UPSTREAM_RESPONSE/);
});

test("слишком большой ответ ограничивается даже без Content-Length", async () => {
  await assert.rejects(fetchGoogleCatalog(endpoint, mockFetch(() => new Response("", { headers: { "Content-Length": "11000000" } }))), /CATALOG_TOO_LARGE/);
  await assert.rejects(fetchGoogleCatalog(endpoint, mockFetch(() => new Response("x".repeat(10 * 1024 * 1024 + 1)))), /CATALOG_TOO_LARGE/);
});
