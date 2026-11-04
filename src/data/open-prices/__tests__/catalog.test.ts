import { createOpenPricesClient } from '../client';
import { BARCODE, OTHER_BARCODE } from '@/tests/fixtures';

const catalog = (overrides = {}) => ({
  code: BARCODE,
  product_name: 'Huevos camperos',
  source: 'off',
  brands: 'Ensayo',
  quantity: '6 unidades',
  creator: 'not-for-app',
  ...overrides,
});
const price = (overrides = {}) => ({
  id: 1,
  product_code: BARCODE,
  type: 'PRODUCT',
  price: '1.995',
  currency: 'EUR',
  price_per: null,
  price_is_discounted: true,
  discount_type: 'LOYALTY_PROGRAM',
  date: new Date().toISOString().slice(0, 10),
  owner: 'not-for-app',
  proof: { secret: 'not-for-app' },
  location: {
    id: 3,
    type: 'OSM',
    osm_name: 'Tienda',
    osm_display_name: 'Madrid, España',
    osm_address_country_code: 'ES',
  },
  ...overrides,
});
const response = (items: unknown[], size = 20, extra = {}) =>
  ({
    ok: true,
    status: 200,
    headers: { get: () => null },
    text: async () =>
      JSON.stringify({ items, size, page: 1, pages: 1, total: items.length, ...extra }),
  }) as unknown as Response;

test('conserva solo fotos de producto de Open Food Facts sin alterar precios o metadatos privados', async () => {
  for (const [url, accepted] of [
    ['https://images.openfoodfacts.org/images/products/001/740/011/2530/front_en.5.400.jpg', true],
    ['https://evil.test/photo.jpg', false],
  ] as const) {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(response([catalog({ image_url: url })]))
      .mockResolvedValueOnce(response([price()], 50));
    const result = await createOpenPricesClient({ fetcher }).searchCatalog('Huevos', '');
    expect(result.products[0].imageUrl).toBe(accepted ? url : undefined);
    expect(result.quotes[0].amountMilli).toBe(1995);
    expect(JSON.stringify(result)).not.toContain('not-for-app');
  }
});

test('busca nombres y luego precios en dos GET acotados sin enviar el filtro de tienda o datos privados', async () => {
  const fetcher = jest
    .fn()
    .mockResolvedValueOnce(response([catalog()]))
    .mockResolvedValueOnce(response([price()], 50));
  const client = createOpenPricesClient({ fetcher });
  const result = await client.searchCatalog('Huevos', 'Madrid');
  const [first, second] = fetcher.mock.calls.map(([url, init]) => {
    expect(init.credentials).toBe('omit');
    expect(init.headers).not.toHaveProperty('Authorization');
    return new URL(url);
  });
  expect(first.searchParams.get('product_name__like')).toBe('Huevos');
  expect(first.searchParams.get('source')).toBe('off');
  expect(first.searchParams.get('size')).toBe('20');
  expect(second.searchParams.get('product_code__in')).toBe(BARCODE);
  expect(second.searchParams.get('price_is_discounted')).toBeNull();
  expect(second.searchParams.get('location__osm_name__contains')).toBeNull();
  expect(second.toString()).not.toContain('Madrid');
  expect(result.quotes[0]).toMatchObject({
    amountMilli: 1995,
    isOffer: true,
    conditions: expect.stringContaining('fidelidad'),
  });
  expect(result.products[0]).toEqual({
    barcode: BARCODE,
    name: 'Huevos camperos',
    brands: 'Ensayo',
    quantity: '6 unidades',
  });
  expect(JSON.stringify(result)).not.toContain('not-for-app');
  result.products[0].name = 'mutated';
  result.quotes[0].store = 'mutated';
  const cached = await client.searchCatalog('Huevos', 'Madrid');
  expect(cached.products[0].name).toBe('Huevos camperos');
  expect(cached.quotes[0].store).toBe('Tienda');
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test('rechaza códigos, metadatos y filas ajenas y no consulta precios si no hay productos válidos', async () => {
  const fetcher = jest
    .fn()
    .mockResolvedValueOnce(
      response([
        catalog({ code: 'invalid' }),
        catalog({ product_name: 'Arroz' }),
        catalog({ source: 'opf' }),
      ]),
    );
  expect((await createOpenPricesClient({ fetcher }).searchCatalog('huevos')).products).toHaveLength(
    0,
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
  const other = jest
    .fn()
    .mockResolvedValueOnce(response([catalog()]))
    .mockResolvedValueOnce(
      response(
        [
          price(),
          price({ product_code: OTHER_BARCODE }),
          price({ price_per: 'KILOGRAM' }),
          price({ date: '2099-01-01' }),
        ],
        50,
      ),
    );
  const result = await createOpenPricesClient({ fetcher: other }).searchCatalog('huevos');
  expect(result.quotes).toHaveLength(1);
  expect(result.skipped).toBe(3);
});

test('distingue vacío, fallo de precios y límites de la muestra; el fallo no se guarda en caché', async () => {
  const fetcher = jest
    .fn()
    .mockResolvedValueOnce(response([catalog()], 20, { pages: 5, total: 90 }))
    .mockResolvedValueOnce({ ok: false, status: 503, headers: { get: () => null } });
  const client = createOpenPricesClient({ fetcher });
  const partial = await client.searchCatalog('huevos');
  expect(partial).toMatchObject({
    products: [expect.anything()],
    quotes: [],
    priceError: 'provider_error',
    more: true,
  });
  fetcher
    .mockResolvedValueOnce(response([catalog()]))
    .mockResolvedValueOnce(response([price()], 50, { pages: 3, total: 120 }));
  expect((await client.searchCatalog('huevos')).pricesLimited).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(4);
});

test('valida búsqueda y paginación antes de consultar y distingue contratos inválidos', async () => {
  const fetcher = jest.fn().mockResolvedValue(response([], 50));
  const client = createOpenPricesClient({ fetcher });
  for (const text of ['', 'a', 'x'.repeat(81), 'huevos\n'])
    await expect(client.searchCatalog(text)).rejects.toThrow('invalid_search');
  await expect(client.searchCatalog('huevos', '', 4)).rejects.toThrow('invalid_page');
  expect(fetcher).not.toHaveBeenCalled();
  await expect(client.searchCatalog('huevos')).rejects.toThrow('invalid_response');
});

test('429 comparte espera entre búsquedas y consultas por código', async () => {
  const fetcher = jest
    .fn()
    .mockResolvedValue({ ok: false, status: 429, headers: { get: () => '60' } });
  const client = createOpenPricesClient({ fetcher });
  await expect(client.searchCatalog('huevos')).rejects.toThrow('rate_limited');
  await expect(client.fetchPrices(BARCODE)).rejects.toThrow('rate_limited');
  await expect(client.searchCatalog('leche')).rejects.toThrow('rate_limited');
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test('cancelación y timeout detienen la búsqueda sin emitir la segunda petición', async () => {
  const fetcher = jest.fn(
    (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) =>
        init.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
      ),
  );
  const controller = new AbortController();
  const call = createOpenPricesClient({ fetcher: fetcher as typeof fetch }).searchCatalog(
    'huevos',
    '',
    1,
    controller.signal,
  );
  controller.abort();
  await expect(call).rejects.toThrow('cancelled');
  await expect(
    createOpenPricesClient({ fetcher: fetcher as typeof fetch, timeoutMs: 5 }).searchCatalog(
      'huevos',
    ),
  ).rejects.toThrow('timeout');
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test('limita cuerpos de respuesta y aplica el filtro local de tienda sin reetiquetar otro país', async () => {
  const huge = jest
    .fn()
    .mockResolvedValue({ ok: true, status: 200, headers: { get: () => String(3 * 1024 * 1024) } });
  await expect(createOpenPricesClient({ fetcher: huge }).searchCatalog('huevos')).rejects.toThrow(
    'invalid_response',
  );
  const fetcher = jest
    .fn()
    .mockResolvedValueOnce(response([catalog()]))
    .mockResolvedValueOnce(
      response(
        [
          price(),
          price({
            id: 2,
            discount_type: '__proto__',
            location: {
              id: 9,
              type: 'OSM',
              osm_name: 'Otra tienda',
              osm_display_name: 'Paris',
              osm_address_country_code: 'FR',
            },
          }),
        ],
        50,
      ),
    );
  const result = await createOpenPricesClient({ fetcher }).searchCatalog('huevos', 'Tienda');
  expect(result.quotes).toHaveLength(2);
  expect(result.quotes[1].countryCode).toBe('FR');
  expect(result.quotes[1].conditions).toBe('Condiciones no detalladas; consulta la fuente.');
});
