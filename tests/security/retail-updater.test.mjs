import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '../..');
const source = fs.readFileSync(path.join(root, 'scripts/update-retail-prices.cjs'), 'utf8');
const original = JSON.parse(fs.readFileSync(path.join(root, 'data/retail-prices.es.json'), 'utf8'));
const aldi = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
  props: {
    pageProps: {
      apiData: JSON.stringify([
        [
          'OFFER_GET',
          {
            req: { region: 'pen' },
            res: {
              algoliaDataMap: {
                1: {
                  objectID: '1',
                  name: 'Patatas',
                  productSlug: 'patatas-1',
                  isAvailable: true,
                  salesUnit: '3 kg',
                  currentPrice: { priceValue: 2.85, validFrom: 1793574000, validUntil: 1794178799 },
                },
              },
            },
          },
        ],
      ]),
    },
  },
})}</script>`;
const lidl = (invalid) =>
  `<div data-grid-data="${JSON.stringify({
    productId: '1',
    title: 'Patata',
    productType: 'RETAIL',
    canonicalPath: invalid ? '/unexpected-path' : '/p/patata/p1',
    regionsPrices: {
      1: {
        currentPrice: {
          price: 1.19,
          currencyCode: 'EUR',
          startDate: '2026-11-01T23:00Z',
          endDate: '2026-11-08T22:59:59Z',
          packaging: { text: '1 kg' },
        },
      },
    },
  }).replaceAll('"', '&quot;')}"></div>`;
async function run({ fail = [], invalidLidl = false } = {}) {
  const calls = [],
    writes = [],
    moves = [],
    process = { exitCode: 0 };
  const memory = {
    async readFile() {
      return JSON.stringify(original);
    },
    async mkdir() {},
    async writeFile(file, body) {
      writes.push({ file, data: JSON.parse(body) });
    },
    async rename(from, to) {
      moves.push({ from, to });
    },
  };
  const promise = vm.runInNewContext(source, {
    __dirname: path.join(root, 'scripts'),
    Buffer,
    AbortController,
    process,
    console: { log() {}, error() {} },
    setTimeout(fn, ms) {
      if (ms === 1100) queueMicrotask(fn);
      return 1;
    },
    clearTimeout() {},
    require(name) {
      if (name === 'node:fs/promises') return memory;
      if (name === 'node:path') return path;
      if (name === './lib/retail-parsers.cjs')
        return require('../../scripts/lib/retail-parsers.cjs');
      if (name === './lib/load-domain.cjs') return require('../../scripts/lib/load-domain.cjs');
      throw new Error('Unexpected import ' + name);
    },
    async fetch(input, options) {
      const url = new URL(input),
        retailer = url.hostname.includes('mercadona')
          ? 'mercadona'
          : url.hostname.includes('aldi')
            ? 'aldi'
            : 'lidl';
      calls.push({ url: input, options });
      let body;
      if (retailer === 'mercadona') {
        const id = Number(url.pathname.split('/').at(-2));
        body = JSON.stringify({
          id,
          categories: [
            {
              products: [
                {
                  id: String(id + 10000),
                  display_name: 'Producto de ensayo',
                  published: true,
                  status: null,
                  share_url: `https://tienda.mercadona.es/product/${id + 10000}/ensayo`,
                  price_instructions: {
                    unit_price: '1.995',
                    selling_method: 0,
                    unit_size: 1,
                    size_format: 'kg',
                  },
                },
              ],
            },
          ],
        });
      } else body = retailer === 'aldi' ? aldi : lidl(invalidLidl);
      return {
        ok: !fail.includes(retailer),
        status: fail.includes(retailer) ? 429 : 200,
        body: (async function* () {
          yield Buffer.from(body);
        })(),
      };
    },
  });
  await promise;
  return { calls, writes, moves, exitCode: process.exitCode };
}
test('actualizador completo: 19 lecturas fijas sin sesiones y escritura atómica solo del catálogo', async () => {
  const result = await run();
  assert.equal(result.calls.length, 19);
  assert.equal(result.writes.length, 1);
  assert.equal(result.moves.length, 1);
  assert.equal(result.exitCode, 0);
  assert.equal(result.writes[0].data.entries.length, 19);
  assert.ok(result.writes[0].file.endsWith('retail-prices.es.json.tmp'));
  assert.ok(result.moves[0].to.endsWith('retail-prices.es.json'));
  for (const { options } of result.calls) assert.equal(options.credentials, 'omit');
});
test('fallo parcial: conserva los datos y fechas originales de esa cadena y devuelve error', async () => {
  const result = await run({ fail: ['aldi'] }),
    feed = result.writes[0].data;
  assert.equal(result.exitCode, 1);
  assert.deepEqual(
    feed.entries.filter((p) => p.retailer === 'aldi'),
    original.entries.filter((p) => p.retailer === 'aldi'),
  );
  assert.equal(feed.sources.find((s) => s.retailer === 'aldi').status, 'failed');
});
test('si fallan todas las fuentes no escribe ni reintenta ni sustituye el archivo', async () => {
  const result = await run({ fail: ['mercadona', 'aldi', 'lidl'] });
  assert.equal(result.exitCode, 1);
  assert.equal(result.calls.length, 3);
  assert.equal(result.writes.length, 0);
  assert.equal(result.moves.length, 0);
});
test('valida el contrato normalizado de cada fuente antes de publicar enlaces o precios', async () => {
  const result = await run({ invalidLidl: true }),
    feed = result.writes[0].data;
  assert.equal(result.exitCode, 1);
  assert.deepEqual(
    feed.entries.filter((p) => p.retailer === 'lidl'),
    original.entries.filter((p) => p.retailer === 'lidl'),
  );
});
