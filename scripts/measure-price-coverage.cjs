const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const { loadDomain } = require('./lib/load-domain.cjs');
const { createOpenPricesClient } = loadDomain('src/data/open-prices/client.ts');
const { validateCoveragePlan, summarizeCoverage } = loadDomain('src/domain/coverage.ts');
const ROOT = path.dirname(require.resolve('../package.json'));
const PLAN = path.join(ROOT, 'docs/datos/cobertura-madrid-2026-10-30.plan.json');
const SNAPSHOT = path.join(ROOT, 'docs/datos/cobertura-madrid-2026-10-30.snapshot.json');
const AGENT = 'SinGluten-coverage-study/1.0 (https://github.com/gonsals/gluten-free-supermarkets)';
const output = (value) => process.stdout.write(value + '\n');
const digest = (plan) => crypto.createHash('sha256').update(JSON.stringify(plan)).digest('hex');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function readJson(filename, limit) {
  if (fs.statSync(filename).size > limit) throw new Error('Measurement file exceeds size limit.');
  return JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, ''), (key, value) => {
    if (['__proto__', 'prototype', 'constructor'].includes(key))
      throw new Error('Invalid report key.');
    return value;
  });
}
function summarize(snapshot) {
  validateCoveragePlan(snapshot.plan);
  if (
    snapshot.schemaVersion !== 1 ||
    snapshot.planSha256 !== digest(snapshot.plan) ||
    !Number.isFinite(Date.parse(snapshot.startedAt)) ||
    !Array.isArray(snapshot.network) ||
    snapshot.network.length > 41
  )
    throw new Error('Invalid snapshot identity/time.');
  const result = {};
  for (const key of snapshot.plan.profiles) {
    const pages = snapshot.profiles[key];
    if (!Array.isArray(pages) || pages.length > 30) throw new Error('Invalid pages.');
    const seen = new Set();
    for (const page of pages) {
      if (
        !snapshot.plan.basket.some((i) => i.barcode === page.barcode) ||
        ![1, 2, 3].includes(page.page) ||
        !['ok', 'error', 'not_attempted'].includes(page.status) ||
        !Array.isArray(page.quotes) ||
        page.quotes.length > 50 ||
        page.quotes.some(
          (q) =>
            q.source !== 'open_prices' ||
            q.barcode !== page.barcode ||
            !Number.isSafeInteger(q.amountMilli) ||
            q.amountMilli <= 0 ||
            q.amountMilli > 10000000 ||
            typeof q.store !== 'string' ||
            typeof q.location !== 'string' ||
            !/^open_prices:\d+$/.test(q.id) ||
            !/^open_prices:\d+$/.test(q.branchKey) ||
            !Number.isFinite(Date.parse(q.observedAt)) ||
            !Number.isFinite(Date.parse(q.recordedAt)) ||
            typeof q.conditional !== 'boolean' ||
            q.offerEndsAt !== null ||
            q.sourceUrl !== 'https://prices.openfoodfacts.org/prices/' + q.id.slice(12) ||
            Object.keys(q).some(
              (k) =>
                ![
                  'id',
                  'barcode',
                  'store',
                  'location',
                  'branchKey',
                  'amountMilli',
                  'observedAt',
                  'recordedAt',
                  'conditional',
                  'offerEndsAt',
                  'source',
                  'sourceUrl',
                  'countryCode',
                ].includes(k),
            ),
        )
      )
        throw new Error('Invalid public page.');
      const identity = page.barcode + ':' + page.page;
      if (seen.has(identity) || (page.status !== 'ok' && page.quotes.length))
        throw new Error('Duplicate/failed page with data.');
      seen.add(identity);
    }
    result[key] = summarizeCoverage(
      snapshot.plan,
      pages,
      Date.parse(snapshot.startedAt),
      key === 'nearby_recent_page_1',
    );
  }
  return result;
}
async function collect() {
  const plan = readJson(PLAN, 50000);
  validateCoveragePlan(plan);
  const startedAt = new Date().toISOString();
  const snapshot = {
    schemaVersion: 1,
    startedAt,
    finishedAt: null,
    sourceCommit: cp
      .execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' })
      .trim(),
    planSha256: digest(plan),
    plan,
    preflight: null,
    network: [],
    profiles: {},
    attribution: {
      prices: 'Open Prices / Open Food Facts — ODbL 1.0',
      locations: '© OpenStreetMap contributors — ODbL 1.0',
      license: 'https://opendatacommons.org/licenses/odbl/1-0/',
    },
  };
  let attempts = 0,
    halted = false,
    previousAt = 0;
  const fetcher =
    (profile, diagnostic = false, preflight = false) =>
    async (input, init) => {
      if (!preflight && (++attempts > plan.limits.productionRequests || halted))
        throw new Error('budget_exhausted');
      if (init.signal?.aborted) throw new Error('cancelled');
      const url = new URL(input);
      if (diagnostic) {
        url.searchParams.set('lat', String(plan.diagnostic.lat));
        url.searchParams.set('lon', String(plan.diagnostic.lon));
        url.searchParams.set('radius_km', String(plan.diagnostic.radiusKm));
        url.searchParams.set(
          'date__gte',
          new Date(Date.parse(startedAt) - 7 * 86400000).toISOString().slice(0, 10),
        );
      }
      previousAt = Date.now();
      const entry = {
        profile,
        url: url.toString(),
        requestedAt: new Date().toISOString(),
        status: null,
        error: null,
      };
      snapshot.network.push(entry);
      try {
        const response = await fetch(url, {
          ...init,
          headers: { ...init.headers, 'User-Agent': AGENT },
        });
        entry.status = response.status;
        if (response.status === 429) halted = true;
        return response;
      } catch (error) {
        entry.error = error.name === 'AbortError' ? 'aborted' : 'network_error';
        throw error;
      }
    };
  const clients = {
    basket_page_1: createOpenPricesClient({ fetcher: fetcher('basket_page_1') }),
    product_up_to_3_pages: createOpenPricesClient({ fetcher: fetcher('product_up_to_3_pages') }),
    nearby_recent_page_1: createOpenPricesClient({
      fetcher: fetcher('nearby_recent_page_1', true),
    }),
  };
  // Official API requests testing in preproduction before production; one bounded GET.
  try {
    const staging = createOpenPricesClient({
      baseUrl: 'https://prices.openfoodfacts.net',
      fetcher: fetcher('preflight', false, true),
    });
    await staging.fetchPrices(plan.basket[0].barcode, 1);
    snapshot.preflight = 'ok';
  } catch (error) {
    throw new Error(`Preproduction contract failed (${error.message}); production not queried.`);
  }
  async function page(key, barcode, number) {
    const blank = {
      barcode,
      page: number,
      status: 'not_attempted',
      total: null,
      more: false,
      skipped: 0,
      quotes: [],
      error: null,
    };
    if (halted || attempts >= plan.limits.productionRequests) return blank;
    // Pace before invoking the client, preserving its full 8-second network deadline.
    const delay = Math.max(0, plan.limits.delayMs - (Date.now() - previousAt));
    if (delay) await sleep(delay);
    try {
      const data = await clients[key].fetchPrices(barcode, number);
      return { ...blank, ...data, status: 'ok' };
    } catch (error) {
      return { ...blank, status: 'error', error: error.message };
    }
  }
  snapshot.profiles.basket_page_1 = [];
  for (const item of plan.basket) {
    const result = await page('basket_page_1', item.barcode, 1);
    snapshot.profiles.basket_page_1.push(result);
    output(
      JSON.stringify({
        profile: 'basket_page_1',
        code: item.barcode,
        status: result.status,
        loaded: result.quotes.length,
        total: result.total,
      }),
    );
  }
  snapshot.profiles.product_up_to_3_pages = [...snapshot.profiles.basket_page_1];
  for (const item of plan.basket) {
    let previous = snapshot.profiles.basket_page_1.find((p) => p.barcode === item.barcode);
    for (let number = 2; number <= 3 && previous.status === 'ok' && previous.more; number++) {
      previous = await page('product_up_to_3_pages', item.barcode, number);
      snapshot.profiles.product_up_to_3_pages.push(previous);
    }
  }
  snapshot.profiles.nearby_recent_page_1 = [];
  for (const item of plan.basket)
    snapshot.profiles.nearby_recent_page_1.push(
      await page('nearby_recent_page_1', item.barcode, 1),
    );
  snapshot.finishedAt = new Date().toISOString();
  const summary = summarize(snapshot);
  const folder = path.join(ROOT, 'artifacts/iteration-12', startedAt.replaceAll(/[:.]/g, '-'));
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n', {
    flag: 'wx',
  });
  fs.writeFileSync(path.join(folder, 'summary.json'), JSON.stringify(summary, null, 2) + '\n', {
    flag: 'wx',
  });
  output(
    JSON.stringify({
      folder: path.relative(ROOT, folder),
      requests: attempts,
      summary: Object.fromEntries(
        Object.entries(summary).map(([key, s]) => [
          key,
          {
            eligibleProducts: s.productsWithEligiblePrice,
            errors: s.providerErrors,
            completeCandidates: s.completeCandidateBaskets,
            loaded: s.loaded,
          },
        ]),
      ),
    }),
  );
  if (halted || Object.values(summary).some((s) => !s.allProductRequestsSucceeded))
    process.exitCode = 2;
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--collect') return collect();
  if (args.length === 1 && args[0] === '--replay') {
    const snapshot = readJson(SNAPSHOT, 5 * 1024 * 1024);
    output(JSON.stringify(summarize(snapshot), null, 2));
    return;
  }
  throw new Error(
    'Use --collect (bounded network study to artifacts) or --replay (committed snapshot, offline).',
  );
}
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
module.exports = { summarize, readJson, digest };
