import snapshot from '@/data/retail-prices.es.json';
import { parseRetailCatalog, type RetailCatalog } from '@/src/domain/retailCatalog';

export const bundledRetailCatalog = parseRetailCatalog(snapshot);
// Static public file: no search terms, library contents, keys, cookies or paid backend.
const URL =
  'https://raw.githubusercontent.com/gonsals/gluten-free-supermarkets/gonsals/mejoras/data/retail-prices.es.json';
export function createRetailClient(transport: typeof fetch = fetch) {
  let cache: { at: number; data: RetailCatalog } | null = null;
  return async (signal: AbortSignal): Promise<RetailCatalog> => {
    if (signal.aborted) throw new Error('cancelled');
    if (cache && Date.now() - cache.at < 5 * 60 * 1000) return cache.data;
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 8000);
    try {
      const res = await transport(URL, {
        method: 'GET',
        credentials: 'omit',
        redirect: 'error',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('retail_unavailable');
      if (Number(res.headers.get('content-length')) > 2 * 1024 * 1024)
        throw new Error('retail_limit');
      const body = await res.text();
      if (body.length > 2 * 1024 * 1024) throw new Error('retail_limit');
      const data = parseRetailCatalog(JSON.parse(body));
      if (signal.aborted || controller.signal.aborted) throw new Error('cancelled');
      if (
        Date.parse(data.generatedAt) > Date.now() ||
        data.generatedAt < bundledRetailCatalog.generatedAt
      )
        throw new Error('retail_outdated');
      cache = { at: Date.now(), data };
      return data;
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
    }
  };
}
export const fetchRetailCatalog = createRetailClient();
