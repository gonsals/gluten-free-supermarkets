import { normalizeBarcode, sameGtin } from '@/src/domain/barcode';
import { fold, type PriceQuote } from '@/src/domain/comparison';
import { searchText, type CatalogPricePage, type NamedProduct } from '@/src/domain/catalogSearch';
import { record } from '@/src/domain/product';
import { productImageUrl } from '@/src/domain/productImages';

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
function discountDescription(value: unknown): string {
  const types: Record<string, string> = {
    LOYALTY_PROGRAM: 'Requiere tarjeta o programa de fidelidad.',
    QUANTITY: 'Oferta por cantidad; consulta las unidades necesarias.',
    EXPIRES_SOON: 'Rebaja por fecha de consumo próxima.',
    PICK_IT_YOURSELF: 'Condiciones de recogida; consulta la fuente.',
    SALE: 'Descuento observado en la tienda.',
    SEASONAL: 'Oferta de temporada.',
    SECOND_HAND: 'Producto de segunda mano.',
  };
  return typeof value === 'string' && Object.hasOwn(types, value)
    ? types[value]
    : 'Condiciones no detalladas; consulta la fuente.';
}
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
  const searches = new Map<string, { until: number; value: CatalogPricePage }>();
  let cooldown = 0;
  async function request(
    path: string,
    query: URLSearchParams,
    page: number,
    size: number,
    signal?: AbortSignal,
  ) {
    if (signal?.aborted) throw new Error('cancelled');
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
      const response = await fetcher(`${base}/api/v1/${path}?${query}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        credentials: 'omit',
      });
      if (signal?.aborted) throw new Error('cancelled');
      if (response.status === 429) {
        const raw = response.headers.get('Retry-After');
        const seconds = Number(raw);
        const date = Date.parse(raw ?? '');
        const delay =
          Number.isFinite(seconds) && seconds > 0
            ? seconds * 1000
            : Number.isFinite(date) && date > Date.now()
              ? date - Date.now()
              : 60000;
        cooldown = Date.now() + Math.min(delay, 86400000);
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
        data.items.length > size ||
        data.page !== page ||
        !Number.isSafeInteger(data.total) ||
        Number(data.total) < 0 ||
        !Number.isSafeInteger(data.pages) ||
        Number(data.pages) < 0 ||
        data.size !== size
      )
        throw new Error('invalid_response');
      if (signal?.aborted) throw new Error('cancelled');
      return {
        items: data.items as unknown[],
        total: Number(data.total),
        pages: Number(data.pages),
      };
    } catch (error) {
      if (signal?.aborted) throw new Error('cancelled');
      if (timedOut) throw new Error('timeout');
      if (
        error instanceof Error &&
        ['cancelled', 'rate_limited', 'provider_error', 'invalid_response'].includes(error.message)
      )
        throw error;
      throw new Error('offline');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }
  const publicCode = (code: string) => {
    const digits = code.replace(/^0+/, '') || '0';
    return digits.padStart(digits.length <= 8 ? 8 : 13, '0');
  };
  const cloneSearch = (value: CatalogPricePage): CatalogPricePage => ({
    ...value,
    products: value.products.map((p) => ({ ...p })),
    quotes: value.quotes.map((q) => ({ ...q })),
  });
  return {
    async fetchPrices(input: string, page = 1, signal?: AbortSignal): Promise<PublicPricePage> {
      const code = normalizeBarcode(input);
      if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) throw new Error('invalid_page');
      if (signal?.aborted) throw new Error('cancelled');
      const canonical = publicCode(code),
        key = `${canonical}:${page}`;
      const hit = cache.get(key);
      if (hit && hit.until > Date.now())
        return { ...hit.value, quotes: hit.value.quotes.map((q) => ({ ...q, barcode: code })) };
      const data = await request(
        'prices',
        new URLSearchParams({
          product_code: canonical,
          currency: 'EUR',
          size: String(PAGE_SIZE),
          page: String(page),
          order_by: '-date,-created',
        }),
        page,
        PAGE_SIZE,
        signal,
      );
      const quotes = data.items
        .map((value) => publicQuote(value, code))
        .filter((q): q is PriceQuote => q !== null);
      const value = {
        quotes,
        page,
        total: data.total,
        more: page < Math.min(data.pages, MAX_PAGE),
        skipped: data.items.length - quotes.length,
      };
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(key, { until: Date.now() + 300000, value });
      return value;
    },
    async searchCatalog(
      input: string,
      storeInput = '',
      page = 1,
      signal?: AbortSignal,
    ): Promise<CatalogPricePage> {
      const text = searchText(input),
        store = storeInput.trim() ? searchText(storeInput, 1, 100) : '';
      if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) throw new Error('invalid_page');
      if (signal?.aborted) throw new Error('cancelled');
      const key = JSON.stringify([
        text.toLocaleLowerCase('es'),
        store.toLocaleLowerCase('es'),
        page,
      ]);
      const hit = searches.get(key);
      if (hit && hit.until > Date.now()) return cloneSearch(hit.value);
      const data = await request(
        'products',
        new URLSearchParams({
          product_name__like: text,
          price_count__gte: '1',
          source: 'off',
          size: '20',
          page: String(page),
          order_by: '-price_count',
        }),
        page,
        20,
        signal,
      );
      const products = new Map<string, NamedProduct>();
      for (const raw of data.items) {
        if (
          !record(raw) ||
          raw.source !== 'off' ||
          typeof raw.code !== 'string' ||
          typeof raw.product_name !== 'string' ||
          !raw.product_name.trim() ||
          raw.product_name.length > 300
        )
          continue;
        try {
          const code = normalizeBarcode(raw.code);
          if (
            code !== raw.code ||
            !fold(`${raw.product_name} ${short(raw.brands, 200)}`).includes(fold(text))
          )
            continue;
          const imageUrl = productImageUrl('open_prices', raw.image_url);
          products.set(code.padStart(14, '0'), {
            barcode: code,
            name: raw.product_name.trim(),
            brands: short(raw.brands, 200),
            quantity: short(raw.quantity, 100),
            ...(imageUrl ? { imageUrl } : {}),
          });
        } catch {
          /* A malformed catalogue code never enters a price query. */
        }
      }
      const value: CatalogPricePage = {
        products: [...products.values()],
        quotes: [],
        page,
        total: data.total,
        more: page < Math.min(data.pages, MAX_PAGE),
        skipped: data.items.length - products.size,
        pricesLimited: false,
        priceError: null,
      };
      if (products.size) {
        try {
          const query = new URLSearchParams({
            product_code__in: value.products.map((p) => publicCode(p.barcode)).join(','),
            type: 'PRODUCT',
            currency: 'EUR',
            size: String(PAGE_SIZE),
            page: '1',
            order_by: '-date,-created',
            location__type: 'OSM',
            duplicate_of__isnull: 'true',
          });
          const prices = await request('prices', query, 1, PAGE_SIZE, signal);
          value.pricesLimited = prices.pages > 1;
          for (const row of prices.items) {
            const product =
              record(row) && typeof row.product_code === 'string'
                ? products.get(row.product_code.padStart(14, '0'))
                : undefined;
            const quote = product ? publicQuote(row, product.barcode) : null;
            if (
              quote &&
              (!store || fold(`${quote.store} ${quote.location}`).includes(fold(store)))
            ) {
              // Search-only fields keep existing price reports and backups compatible.
              value.quotes.push({
                ...quote,
                isOffer: record(row) && row.price_is_discounted === true,
                ...(quote.conditional
                  ? { conditions: discountDescription(record(row) ? row.discount_type : null) }
                  : {}),
              });
            } else value.skipped++;
          }
        } catch (error) {
          if (signal?.aborted || (error instanceof Error && error.message === 'cancelled'))
            throw new Error('cancelled');
          value.priceError = error instanceof Error ? error.message : 'provider_error';
        }
      }
      if (signal?.aborted) throw new Error('cancelled');
      if (!value.priceError) {
        if (searches.size >= 30) searches.delete(searches.keys().next().value!);
        searches.set(key, { until: Date.now() + 300000, value: cloneSearch(value) });
      }
      return value;
    },
  };
}
export const publicPricesClient = createOpenPricesClient();
