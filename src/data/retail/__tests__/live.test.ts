import snapshot from '@/data/retail-prices.es.json';
import { parseRetailCatalog } from '@/src/domain/retailCatalog';
import { createLiveRetailClient, mercadonaCategories } from '../live';

const base = parseRetailCatalog(snapshot);
const reply = (data: unknown, ok = true) =>
  ({
    ok,
    headers: { get: () => null },
    text: async () => JSON.stringify(data),
  }) as unknown as Response;
const payload = {
  id: 77,
  categories: [
    {
      products: [
        {
          id: '31540',
          display_name: 'Huevos grandes L',
          published: true,
          status: null,
          share_url: 'https://tienda.mercadona.es/product/31540/huevos-grandes-l-paquete',
          price_instructions: {
            unit_price: '1.995',
            unit_size: 6,
            size_format: 'ud',
            selling_method: 0,
          },
        },
      ],
    },
  ],
};
test('resuelve categorías localmente con un máximo de tres y sin enviar términos a la tienda', () => {
  expect(mercadonaCategories('HUEVOS')).toEqual([77]);
  expect(mercadonaCategories('un producto desconocido')).toEqual([]);
  expect(mercadonaCategories('huevo leche mantequilla arroz pollo')).toHaveLength(3);
});
test('actualiza solo la categoría consultada, retira filas antiguas y cachea sin cambiar la fecha', async () => {
  const duplicated = { ...payload, categories: [payload.categories[0], payload.categories[0]] };
  const fetcher = jest.fn().mockResolvedValue(reply(duplicated));
  const client = createLiveRetailClient(fetcher),
    signal = new AbortController().signal;
  const { catalog, failed } = await client(base, 'Huevos', 'Mercadona', signal);
  expect(failed).toBe(false);
  const eggs = catalog.entries.filter(
    (p) => p.retailer === 'mercadona' && p.group === 'category:77@bcn1',
  );
  expect(eggs).toHaveLength(1);
  expect(eggs[0].amountMilli).toBe(1995);
  expect(catalog.entries.some((p) => p.retailer === 'aldi')).toBe(true);
  const again = await client(catalog, 'huevos L', 'Mercadona', signal);
  expect(again.catalog.entries.find((p) => p.id === eggs[0].id)?.checkedAt).toBe(eggs[0].checkedAt);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toBe('https://tienda.mercadona.es/api/categories/77/?wh=bcn1');
});
test('un fallo conserva importes y fechas originales, informa la fuente y enfría reintentos', async () => {
  const fetcher = jest.fn().mockResolvedValue(reply({}, false)),
    client = createLiveRetailClient(fetcher);
  const signal = new AbortController().signal;
  const { catalog, failed } = await client(base, 'huevos', 'Mercadona', signal);
  expect(failed).toBe(true);
  expect(catalog.entries).toEqual(base.entries);
  expect(catalog.sources.find((s) => s.retailer === 'mercadona')?.status).toBe('failed');
  await client(catalog, 'huevos', 'Mercadona', signal);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test('la cancelación no escribe ni recupera resultados tardíos', async () => {
  const controller = new AbortController();
  controller.abort();
  const fetcher = jest.fn();
  await expect(
    createLiveRetailClient(fetcher)(base, 'huevos', '', controller.signal),
  ).rejects.toThrow('cancelled');
  expect(fetcher).not.toHaveBeenCalled();
});
test('acota consultas múltiples de seis cadenas a once GET y no vuelve a pedir fuentes fallidas inmediatamente', async () => {
  const fetcher = jest.fn().mockRejectedValue(new Error('offline'));
  const client = createLiveRetailClient(fetcher),
    signal = new AbortController().signal;
  const query = 'huevos leche arroz pollo pan aceite verdura fruta pasta';
  await client(base, query, '', signal);
  expect(fetcher.mock.calls.length).toBeLessThanOrEqual(11);
  const count = fetcher.mock.calls.length;
  await client(base, query, '', signal);
  expect(fetcher.mock.calls.length).toBe(count);
});
