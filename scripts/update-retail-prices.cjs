/* eslint-disable no-console */
/* global __dirname, Buffer */
// Fixed public pages only. Failed groups keep their dates; no private library is read.
const fs = require('node:fs/promises');
const path = require('node:path');
const parsers = require('./lib/retail-parsers.cjs');
const { loadDomain } = require('./lib/load-domain.cjs');
const { parseRetailCatalog } = loadDomain('src/domain/retailCatalog.ts');
const { categoryPages, retailerNames } = loadDomain('src/domain/retailSources.ts');
const target = path.resolve(__dirname, '../data/retail-prices.es.json');
const args = process.argv?.slice(2) ?? [];
const selected =
  args.length === 2 && args[0] === '--retailer' && Object.hasOwn(retailerNames, args[1])
    ? args[1]
    : null;
if (args.length && !selected) throw new Error('Use --retailer with a supported chain');
const categories = [77, 72, 75, 118, 120, 121, 112, 27, 29, 38, 59, 60, 54, 122, 126, 78, 80];
const jobs = [
  ...categories.map((id) => ({
    retailer: 'mercadona',
    group: `category:${id}@bcn1`,
    url: `https://tienda.mercadona.es/api/categories/${id}/?wh=bcn1`,
  })),
  { retailer: 'aldi', group: 'weekly', url: 'https://www.aldi.es/ofertas.html' },
  {
    retailer: 'lidl',
    group: 'weekly',
    url: 'https://www.lidl.es/c/store/ofertas-semanales/a10089449',
  },
  ...categoryPages(),
];
async function read(url) {
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 10000);
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
    previous = parseRetailCatalog(JSON.parse(await fs.readFile(target, 'utf8')));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const checkedAt = new Date().toISOString();
  const sourceDefaults = Object.keys(retailerNames).map((retailer) => ({
    retailer,
    status: 'ok',
    attemptedAt: checkedAt,
  }));
  const entries = [],
    sources = [];
  let refreshed = 0;
  for (const retailer of Object.keys(retailerNames)) {
    if (selected && selected !== retailer) {
      entries.push(...previous.entries.filter((p) => p.retailer === retailer));
      const oldSource = previous.sources.find((s) => s.retailer === retailer);
      if (oldSource) sources.push(oldSource);
      continue;
    }
    const valid = [],
      done = new Set();
    let failed = false;
    for (const job of jobs.filter((j) => j.retailer === retailer)) {
      try {
        const body = await read(job.url),
          payload = retailer === 'mercadona' ? JSON.parse(body) : body;
        if (retailer === 'mercadona' && `category:${payload.id}@bcn1` !== job.group)
          throw new Error('Unexpected category');
        const rows = parsers[retailer](payload, checkedAt, {
          group: job.group,
          ...(retailer === 'mercadona' ? { warehouse: 'bcn1' } : {}),
        });
        if (!rows.length || rows.some((p) => p.group !== job.group))
          throw new Error('Unexpected category data');
        const data = parseRetailCatalog({
          version: 1,
          generatedAt: checkedAt,
          sources: sourceDefaults,
          entries: [...new Map(rows.map((p) => [p.id, p])).values()],
        });
        valid.push(...data.entries);
        done.add(job.group);
        refreshed++;
      } catch (e) {
        failed = true;
        console.error(
          `${retailer}/${job.group}: refresh failed (${e.message}); previous dates preserved`,
        );
        if (/^HTTP (403|429)$/.test(e.message)) break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
    const old = previous.entries.filter((p) => p.retailer === retailer && !done.has(p.group));
    const rows = [...new Map([...old, ...valid].map((p) => [p.id, p])).values()];
    entries.push(...rows);
    sources.push({ retailer, status: failed ? 'failed' : 'ok', attemptedAt: checkedAt });
    console.log(`${retailer}: ${valid.length} public records read; ${done.size} groups refreshed`);
  }
  if (!refreshed) throw new Error('All sources failed; file left untouched');
  const current = entries.filter((p) => p.retailer !== 'mercadona' || p.group.endsWith('@bcn1'));
  const feed = parseRetailCatalog({
    version: 1,
    generatedAt: checkedAt,
    sources,
    entries: current,
  });
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target + '.tmp', JSON.stringify(feed, null, 2) + '\n');
  await fs.rename(target + '.tmp', target);
  if (sources.some((s) => s.status === 'failed' && (!selected || s.retailer === selected)))
    process.exitCode = 1;
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
