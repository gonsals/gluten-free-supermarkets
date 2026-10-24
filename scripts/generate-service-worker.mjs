import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
const root = join(process.cwd(), 'dist');
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)],
      ),
    )
  ).flat();
}
const assets = (await files(root)).filter(
  (file) => /\.(js|html|png|jpg|ico|ttf|woff2?)$/.test(file) && !file.endsWith('sw.js'),
);
const hash = createHash('sha256');
for (const file of assets) hash.update(await readFile(file));
const name = `singluten-shell-${hash.digest('hex').slice(0, 16)}`;
const urls = assets.map((file) => '/' + relative(root, file).replaceAll('\\', '/'));
await writeFile(
  join(root, 'sw.js'),
  `
const CACHE = ${JSON.stringify(name)};
const ASSETS = ${JSON.stringify(urls)};
// Let existing tabs finish using their current version before activating a new shell.
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('singluten-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(cache => cache.match('/index.html')).then(cached => cached || fetch(event.request)));
  } else if (ASSETS.includes(new URL(event.request.url).pathname)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request)).then(cached => cached || fetch(event.request)));
  }
});
`,
);
