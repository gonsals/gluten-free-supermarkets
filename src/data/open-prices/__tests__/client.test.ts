import { createOpenPricesClient } from '../client';
import { BARCODE, OTHER_BARCODE } from '@/tests/fixtures';

function item(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    product_code: BARCODE,
    type: 'PRODUCT',
    price: 2.495,
    currency: 'EUR',
    price_per: null,
    date: new Date().toISOString().slice(0, 10),
    created: new Date().toISOString(),
    price_is_discounted: false,
    duplicate_of: null,
    location: {
      id: 4,
      type: 'OSM',
      osm_name: 'Tienda',
      osm_display_name: 'Tienda, Madrid, España',
      osm_address_country_code: 'ES',
    },
    ...overrides,
  };
}
function response(
  items: unknown[],
  options: { status?: number; page?: number; pages?: number; total?: number } = {},
) {
  return {
    status: options.status ?? 200,
    ok: !options.status || options.status === 200,
    headers: { get: () => null },
    text: async () =>
      JSON.stringify({
        items,
        page: options.page ?? 1,
        pages: options.pages ?? 1,
        total: options.total ?? items.length,
        size: 50,
      }),
  } as unknown as Response;
}
test('consulta GET sin credenciales, interpreta el contrato público y mantiene milésimas', async () => {
  const fetcher = jest.fn().mockResolvedValue(response([item()]));
  const client = createOpenPricesClient({ fetcher });
  const page = await client.fetchPrices(BARCODE);
  expect(page.quotes[0]).toMatchObject({
    amountMilli: 2495,
    source: 'open_prices',
    countryCode: 'ES',
    branchKey: 'open_prices:4',
  });
  const [url, init] = fetcher.mock.calls[0];
  expect(new URL(url).searchParams.get('product_code')).toBe(BARCODE);
  expect(new URL(url).searchParams.get('size')).toBe('50');
  expect(init.credentials).toBe('omit');
  expect(init.headers).not.toHaveProperty('Authorization');
  await client.fetchPrices(BARCODE);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test('rechaza registros ajenos, precios por peso, duplicados, importes y fechas inválidos', async () => {
  const fetcher = jest
    .fn()
    .mockResolvedValue(
      response([
        item(),
        item({ product_code: OTHER_BARCODE }),
        item({ price_per: 'KILOGRAM' }),
        item({ type: 'CATEGORY' }),
        item({ duplicate_of: 1 }),
        item({ price: -1 }),
        item({ price: 1.1234 }),
        item({ currency: 'USD' }),
        item({ date: '2026-02-30' }),
        item({ date: '2099-01-01' }),
        item({ date: null }),
        item({ location: null }),
        item({ price_is_discounted: 'false' }),
      ]),
    );
  const result = await createOpenPricesClient({ fetcher }).fetchPrices(BARCODE);
  expect(result.quotes).toHaveLength(1);
  expect(result.skipped).toBe(12);
});
test('normaliza UPC al código público canónico y respeta GTIN equivalentes en caché', async () => {
  const fetcher = jest.fn().mockResolvedValue(response([item({ product_code: '0036000291452' })]));
  const client = createOpenPricesClient({ fetcher });
  expect((await client.fetchPrices('036000291452')).quotes[0].barcode).toBe('036000291452');
  expect(new URL(fetcher.mock.calls[0][0]).searchParams.get('product_code')).toBe('0036000291452');
  expect((await client.fetchPrices('00036000291452')).quotes[0].barcode).toBe('00036000291452');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test('no confunde una respuesta inválida con ausencia de precios ni permite paginación ilimitada', async () => {
  const fetcher = jest
    .fn()
    .mockResolvedValue({ ...response([]), text: async () => '{"results":[]}' });
  const client = createOpenPricesClient({ fetcher });
  await expect(client.fetchPrices(BARCODE)).rejects.toThrow('invalid_response');
  await expect(client.fetchPrices(BARCODE, 4)).rejects.toThrow('invalid_page');
});
test('admite ausencia real de precios y limita tres páginas por consulta', async () => {
  const fetcher = jest.fn().mockResolvedValue(response([], { page: 3, pages: 100, total: 5000 }));
  const result = await createOpenPricesClient({ fetcher }).fetchPrices(BARCODE, 3);
  expect(result.quotes).toEqual([]);
  expect(result.more).toBe(false);
});
test('una limitación 429 aplica espera sin repetir peticiones', async () => {
  const fetcher = jest.fn().mockResolvedValue(response([], { status: 429 }));
  const client = createOpenPricesClient({ fetcher });
  await expect(client.fetchPrices(BARCODE)).rejects.toThrow('rate_limited');
  await expect(client.fetchPrices(OTHER_BARCODE)).rejects.toThrow('rate_limited');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test('cancelar antes o durante una lectura evita publicar y cachear la respuesta tardía', async () => {
  const controller = new AbortController();
  controller.abort();
  const fetcher = jest.fn();
  const client = createOpenPricesClient({ fetcher });
  await expect(client.fetchPrices(BARCODE, 1, controller.signal)).rejects.toThrow('cancelled');
  expect(fetcher).not.toHaveBeenCalled();
  let finish!: (response: Response) => void;
  fetcher
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue(response([]));
  const second = new AbortController();
  const pending = client.fetchPrices(BARCODE, 1, second.signal);
  second.abort();
  finish(response([item()]));
  await expect(pending).rejects.toThrow('cancelled');
  expect((await client.fetchPrices(BARCODE)).quotes).toEqual([]);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
