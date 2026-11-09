import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { Parser } from 'htmlparser2';

const root = resolve('out');
const prefix = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const data = JSON.parse(await readFile(resolve(root, 'catalog.json'), 'utf8'));
assert.ok(Array.isArray(data.items));
assert.ok(['google', 'demo'].includes(data.source));
const assets = [];
const parser = new Parser({ onopentag(name, attrs) {
  if (name === 'script' && attrs.src) assets.push(attrs.src);
  if (name === 'link' && ['stylesheet', 'icon'].includes(attrs.rel)) assets.push(attrs.href);
} });
parser.end(html);
assert.ok(assets.length > 0);
for (const url of assets) {
  if (/^https?:\/\//.test(url)) continue;
  assert.ok(url.startsWith(`${prefix}/`), `Неверный путь ресурса: ${url}`);
  const path = resolve(root, decodeURIComponent(new URL(url, 'https://pages.test').pathname.slice(prefix.length + 1)));
  assert.ok(path.startsWith(root + sep));
  await access(path);
}
await access(resolve(root, '.nojekyll'));
console.log(`Проверен статический экспорт: ${data.items.length} записей; ${assets.length} ресурсов; basePath=${prefix || '/'}.`);
