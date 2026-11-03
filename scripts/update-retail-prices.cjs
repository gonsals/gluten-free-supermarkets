/* eslint-disable no-console */
/* global __dirname, Buffer */
// Bounded, sequential public reads. Old records retain their original date on partial failure.
const fs = require('node:fs/promises');
const path = require('node:path');
const parsers = require('./lib/retail-parsers.cjs');
const { loadDomain } = require('./lib/load-domain.cjs');
const { parseRetailCatalog } = loadDomain('src/domain/retailCatalog.ts');
const target = path.resolve(__dirname, '../data/retail-prices.es.json');
// Reviewed staple categories. No entire-store traversal or product-detail crawling.
const categories = [77, 72, 75, 118, 120, 121, 112, 27, 29, 38, 59, 60, 54, 122, 126, 78, 80];
async function read(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'error',
      credentials: 'omit',
      headers: {
        'User-Agent': 'MesaPriceCatalog/1.0 (+https://github.com/gonsals/gluten-free-supermarkets)',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const chunks = [];
    let size = 0;
    for await (const chunk of res.body) {
      size += chunk.byteLength;
      if (size > 6 * 1024 * 1024) {
        controller.abort();
        throw new Error('Page exceeds limit');
      }
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally {
    clearTimeout(timeout);
  }
}
async function main() {
  let previous = { entries: [], sources: [] };
  try {
    previous = JSON.parse(await fs.readFile(target, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const checkedAt = new Date().toISOString();
  const entries = [],
    sources = [];
  for (const retailer of ['mercadona', 'aldi', 'lidl']) {
    try {
      let rows = [];
      if (retailer === 'mercadona') {
        for (const id of categories) {
          const payload = JSON.parse(
            await read(`https://tienda.mercadona.es/api/categories/${id}/?wh=vlc1`),
          );
          if (payload.id !== id) throw new Error('Unexpected category');
          rows.push(...parsers.mercadona(payload, checkedAt));
          await new Promise((resolve) => setTimeout(resolve, 1100));
        }
      } else {
        const url =
          retailer === 'aldi'
            ? 'https://www.aldi.es/ofertas.html'
            : 'https://www.lidl.es/c/store/ofertas-semanales/a10089449';
        rows = parsers[retailer](await read(url), checkedAt);
      }
      if (!rows.length || rows.length > 5000) throw new Error('Unexpected catalog size');
      rows = parseRetailCatalog({
        version: 1,
        generatedAt: checkedAt,
        entries: [...new Map(rows.map((row) => [row.id, row])).values()],
        sources: ['mercadona', 'aldi', 'lidl'].map((r) => ({
          retailer: r,
          status: 'ok',
          attemptedAt: checkedAt,
        })),
      }).entries;
      entries.push(...new Map(rows.map((row) => [row.id, row])).values());
      sources.push({ retailer, status: 'ok', attemptedAt: checkedAt });
      console.log(`${retailer}: ${rows.length} public records`);
    } catch (error) {
      entries.push(...previous.entries.filter((row) => row.retailer === retailer));
      sources.push({ retailer, status: 'failed', attemptedAt: checkedAt });
      console.error(`${retailer}: refresh failed (${error.message}); previous dates preserved`);
    }
  }
  if (sources.every((s) => s.status === 'failed'))
    throw new Error('All sources failed; file left untouched');
  const feed = parseRetailCatalog({ version: 1, generatedAt: checkedAt, sources, entries });
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target + '.tmp', JSON.stringify(feed, null, 2) + '\n');
  await fs.rename(target + '.tmp', target);
  if (sources.some((s) => s.status === 'failed')) process.exitCode = 1;
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
