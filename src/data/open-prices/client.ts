import { normalizeBarcode, sameGtin } from '@/src/domain/barcode';
import type { PriceQuote } from '@/src/domain/comparison';
import { record } from '@/src/domain/product';

export interface PublicPricePage {
  quotes: PriceQuote[];
  page: number;
  total: number;
  more: boolean;
  skipped: number;
}
const PAGE_SIZE = 50;
const MAX_PAGE = 3;
export const OPEN_PRICES_BASE = 'https://prices.openfoodfacts.org';
const short = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';
function publicQuote(value: unknown, code: string): PriceQuote | null {
  if (
    !record(value) ||
    value.type !== 'PRODUCT' ||
    typeof value.product_code !== 'string' ||
    !sameGtin(value.product_code, code) ||
    value.currency !== 'EUR' ||
    !Number.isSafeInteger(value.id) ||
    Number(value.id) <= 0 ||
    (value.duplicate_of !== null && value.duplicate_of !== undefined) ||
    !record(value.location) ||
    !Number.isSafeInteger(value.location.id) ||
    Number(value.location.id) <= 0 ||
    value.location.type !== 'OSM' ||
    (value.price_per !== null && value.price_per !== undefined && value.price_per !== '') ||
    typeof value.price_is_discounted !== 'boolean' ||
    typeof value.date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.date)
  )
    return null;
  try {
    if (normalizeBarcode(value.product_code) !== value.product_code) return null;
  } catch {
    return null;
  }
  const observedAt = `${value.date}T00:00:00.000Z`;
  if (
    !Number.isFinite(Date.parse(observedAt)) ||
    new Date(observedAt).toISOString().slice(0, 10) !== value.date ||
    value.date > new Date().toISOString().slice(0, 10)
  )
    return null;
  const numeric =
    typeof value.price === 'number'
      ? value.price
      : typeof value.price === 'string' && /^\d+(?:\.\d{1,3})?$/.test(value.price)
        ? Number(value.price)
        : NaN;
  const amountMilli = Math.round(numeric * 1000);
  if (
    !Number.isFinite(numeric) ||
    numeric <= 0 ||
    numeric > 10000 ||
    !Number.isSafeInteger(amountMilli) ||
    Math.abs(numeric * 1000 - amountMilli) > 0.00001
  )
    return null;
  const location = value.location;
  const store = short(location.osm_name, 100) || short(location.osm_brand, 100);
  const address =
    short(location.osm_display_name, 500) ||
    [short(location.osm_address_city, 100), short(location.osm_address_country, 100)]
      .filter(Boolean)
      .join(', ');
  if (!store || !address) return null;
  const country = short(location.osm_address_country_code, 100).toUpperCase();
  const countryName = short(location.osm_address_country, 100).toLocaleLowerCase('es');
  return {
    id: `open_prices:${value.id}`,
    barcode: code,
    store,
    location: address,
    branchKey: `open_prices:${location.id}`,
    amountMilli,
    observedAt,
    recordedAt:
      typeof value.created === 'string' && Number.isFinite(Date.parse(value.created))
        ? value.created
        : observedAt,
    conditional: value.price_is_discounted || Boolean(value.discount_type),
    offerEndsAt: null,
    source: 'open_prices',
    sourceUrl: `${OPEN_PRICES_BASE}/prices/${value.id}`,
    countryCode: /^[A-Z]{2}$/.test(country)
      ? country
      : ['españa', 'spain', 'espagne'].includes(countryName)
        ? 'ES'
        : null,
  };
}

export function createOpenPricesClient(
  options: { fetcher?: typeof fetch; timeoutMs?: number; baseUrl?: string } = {},
) {
  const fetcher = options.fetcher ?? fetch;
  const base = options.baseUrl ?? OPEN_PRICES_BASE;
  const cache = new Map<string, { until: number; value: PublicPricePage }>();
  let cooldown = 0;
  return {
    async fetchPrices(input: string, page = 1, signal?: AbortSignal): Promise<PublicPricePage> {
      const code = normalizeBarcode(input);
      if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) throw new Error('invalid_page');
      if (signal?.aborted) throw new Error('cancelled');
      const digits = code.replace(/^0+/, '') || '0';
      const publicCode = digits.padStart(digits.length <= 8 ? 8 : 13, '0');
      const key = `${publicCode}:${page}`;
      const hit = cache.get(key);
      if (hit && hit.until > Date.now())
        return {
          ...hit.value,
          quotes: hit.value.quotes.map((quote) => ({ ...quote, barcode: code })),
        };
      if (Date.now() < cooldown) throw new Error('rate_limited');
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal?.addEventListener('abort', abort, { once: true });
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, options.timeoutMs ?? 8000);
      try {
        const query = new URLSearchParams({
          product_code: publicCode,
          currency: 'EUR',
          size: String(PAGE_SIZE),
          page: String(page),
          order_by: '-date,-created',
        });
        const response = await fetcher(`${base}/api/v1/prices?${query}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
          credentials: 'omit',
        });
        if (signal?.aborted) throw new Error('cancelled');
        if (response.status === 429) {
          const retry = Number(response.headers.get('Retry-After'));
          cooldown =
            Date.now() +
            Math.min(Number.isFinite(retry) && retry > 0 ? retry * 1000 : 60000, 86400000);
          throw new Error('rate_limited');
        }
        if (!response.ok) throw new Error('provider_error');
        if (Number(response.headers.get('Content-Length')) > 2 * 1024 * 1024)
          throw new Error('invalid_response');
        const raw = await response.text();
        if (raw.length > 2 * 1024 * 1024) throw new Error('invalid_response');
        let data: unknown;
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error('invalid_response');
        }
        if (
          !record(data) ||
          !Array.isArray(data.items) ||
          data.items.length > PAGE_SIZE ||
          data.page !== page ||
          !Number.isSafeInteger(data.total) ||
          Number(data.total) < 0 ||
          !Number.isSafeInteger(data.pages) ||
          Number(data.pages) < 0 ||
          data.size !== PAGE_SIZE
        )
          throw new Error('invalid_response');
        const quotes = data.items
          .map((value) => publicQuote(value, code))
          .filter((quote): quote is PriceQuote => quote !== null);
        const value = {
          quotes,
          page,
          total: Number(data.total),
          more: page < Math.min(Number(data.pages), MAX_PAGE),
          skipped: data.items.length - quotes.length,
        };
        if (signal?.aborted) throw new Error('cancelled');
        if (cache.size >= 100) cache.delete(cache.keys().next().value!);
        cache.set(key, { until: Date.now() + 300000, value });
        return value;
      } catch (error) {
        if (signal?.aborted) throw new Error('cancelled');
        if (timedOut) throw new Error('timeout');
        if (
          error instanceof Error &&
          ['cancelled', 'rate_limited', 'provider_error', 'invalid_response'].includes(
            error.message,
          )
        )
          throw error;
        throw new Error('offline');
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
      }
    },
  };
}
export const publicPricesClient = createOpenPricesClient();
