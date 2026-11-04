import {
  categoryPages,
  retailerNames,
  retailStore as storeFilter,
} from '@/src/domain/retailSources';
import {
  parseRetailCatalog,
  mercadonaCategories,
  retailStore,
  type RetailCatalog,
  type RetailPrice,
  type Retailer,
} from '@/src/domain/retailCatalog';

export { mercadonaCategories } from '@/src/domain/retailCatalog';

// The CLI and the mobile app execute exactly the same pure parsers; no fs/Node dependencies.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const parsers = require('../../../scripts/lib/retail-parsers.cjs') as Record<
  Retailer,
  (
    payload: unknown,
    checkedAt: string,
    context?: { group: string; warehouse?: string },
  ) => RetailPrice[]
>;
async function page(url: string, transport: typeof fetch, parent: AbortSignal): Promise<string> {
  if (parent.aborted) throw new Error('cancelled');
  const controller = new AbortController(),
    abort = () => controller.abort();
  parent.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 8000);
  try {
    const res = await transport(url, {
      method: 'GET',
      credentials: 'omit',
      redirect: 'error',
      signal: controller.signal,
    });
    if (!res.ok || Number(res.headers.get('content-length')) > 6 * 1024 * 1024)
      throw new Error('retail_unavailable');
    const body = await res.text();
    if (body.length > 6 * 1024 * 1024 || parent.aborted || controller.signal.aborted)
      throw new Error('retail_unavailable');
    return body;
  } finally {
    clearTimeout(timer);
    parent.removeEventListener('abort', abort);
  }
}
export function createLiveRetailClient(transport: typeof fetch = fetch) {
  // Cache by source + category, never by private inputs. Failed attempts are cooled down too.
  const cache = new Map<string, { at: number; rows: RetailPrice[] | null }>();
  return async (
    base: RetailCatalog,
    query: string,
    store: string,
    signal: AbortSignal,
  ): Promise<{
    catalog: RetailCatalog;
    failed: boolean;
  }> => {
    const jobs: { retailer: Retailer; group: string; url: string }[] = [];
    const filter = retailStore(store);
    if (
      !filter ||
      'mercadona'.includes(filter) ||
      filter.includes('mercadona') ||
      filter.includes('barcelona')
    ) {
      for (const id of mercadonaCategories(query))
        jobs.push({
          retailer: 'mercadona',
          group: `category:${id}@bcn1`,
          url: `https://tienda.mercadona.es/api/categories/${id}/?wh=bcn1`,
        });
    }
    if (!filter || 'aldi'.includes(filter) || filter.includes('peninsula'))
      jobs.push({ retailer: 'aldi', group: 'weekly', url: 'https://www.aldi.es/ofertas.html' });
    if (!filter || 'lidl'.includes(filter))
      jobs.push({
        retailer: 'lidl',
        group: 'weekly',
        url: 'https://www.lidl.es/c/store/ofertas-semanales/a10089449',
      });
    const perSource = new Map<Retailer, number>();
    jobs.push(
      ...categoryPages(query).filter((job) => {
        if (filter && !storeFilter(retailerNames[job.retailer]).includes(filter)) return false;
        const count = perSource.get(job.retailer) ?? 0;
        perSource.set(job.retailer, count + 1);
        return count < 2;
      }),
    );
    const checkedAt = new Date().toISOString();
    base = {
      ...base,
      sources: [
        ...base.sources,
        ...Object.keys(retailerNames)
          .filter((r) => !base.sources.some((s) => s.retailer === r))
          .map((r) => ({
            retailer: r as Retailer,
            status: 'failed' as const,
            attemptedAt: checkedAt,
          })),
      ],
    };
    const results = await Promise.all(
      jobs.map(async (job) => {
        const key = `${job.retailer}:${job.group}`,
          old = cache.get(key);
        if (old && Date.now() - old.at < (old.rows ? 15 * 60 * 1000 : 60 * 1000))
          return { ...job, rows: old.rows };
        try {
          const body = await page(job.url, transport, signal);
          const rows = parsers[job.retailer](
            job.retailer === 'mercadona' ? JSON.parse(body) : body,
            checkedAt,
            { group: job.group, ...(job.retailer === 'mercadona' ? { warehouse: 'bcn1' } : {}) },
          );
          if (rows.some((row) => row.group !== job.group)) throw new Error('unexpected_category');
          // An empty/changed source is uncertain, never evidence to erase the last known catalog.
          if (!rows.length) throw new Error('empty_catalog');
          const valid = parseRetailCatalog({
            ...base,
            entries: [...new Map(rows.map((row) => [row.id, row])).values()],
          }).entries;
          cache.set(key, { at: Date.now(), rows: valid });
          return { ...job, rows: valid };
        } catch {
          if (!signal.aborted) cache.set(key, { at: Date.now(), rows: null });
          return { ...job, rows: null };
        }
      }),
    );
    if (signal.aborted) throw new Error('cancelled');
    const refreshed = results.filter((r) => r.rows !== null);
    const entries = base.entries.filter(
      (p) => !refreshed.some((r) => p.retailer === r.retailer && p.group === r.group),
    );
    const distinct = new Map(
      [...entries, ...refreshed.flatMap((r) => r.rows ?? [])].map((p) => [p.id, p]),
    );
    const sources = base.sources.map((source) => {
      const attempted = results.filter((r) => r.retailer === source.retailer);
      return attempted.length
        ? {
            ...source,
            attemptedAt: checkedAt,
            status: attempted.some((r) => r.rows === null) ? ('failed' as const) : ('ok' as const),
          }
        : source;
    });
    return {
      catalog: parseRetailCatalog({
        ...base,
        sources,
        generatedAt: checkedAt,
        entries: [...distinct.values()],
      }),
      failed: results.some((r) => r.rows === null),
    };
  };
}
export const fetchLiveRetailCatalog = createLiveRetailClient();
