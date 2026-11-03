import snapshot from '@/data/retail-prices.es.json';
import { createRetailClient } from '../client';

function response(data: unknown = snapshot, options: { ok?: boolean; length?: string } = {}) {
  return {
    ok: options.ok ?? true,
    headers: { get: () => options.length ?? null },
    text: async () => JSON.stringify(data),
  } as unknown as Response;
}
test('descarga un único archivo fijo, sin búsquedas ni cookies, y reutiliza la caché', async () => {
  const fetcher = jest.fn().mockResolvedValue(response());
  const get = createRetailClient(fetcher);
  const signal = new AbortController().signal;
  await get(signal);
  await get(signal);
  expect(fetcher).toHaveBeenCalledTimes(1);
  const [url, init] = fetcher.mock.calls[0];
  expect(url).toMatch(/^https:\/\/raw.githubusercontent.com\/gonsals\//);
  expect(init).toMatchObject({ method: 'GET', credentials: 'omit', redirect: 'error' });
  expect(init.headers).toEqual({ Accept: 'application/json' });
});
test('los errores y datos inválidos no se almacenan como catálogo válido', async () => {
  const fetcher = jest
    .fn()
    .mockResolvedValueOnce(response({}, { ok: false }))
    .mockResolvedValueOnce(response({ ...snapshot, entries: [{ bad: true }] }))
    .mockResolvedValueOnce(response());
  const get = createRetailClient(fetcher),
    signal = new AbortController().signal;
  await expect(get(signal)).rejects.toThrow('retail_unavailable');
  await expect(get(signal)).rejects.toThrow();
  await expect(get(signal)).resolves.toHaveProperty('version', 1);
  expect(fetcher).toHaveBeenCalledTimes(3);
});
test('impide retroceder a un catálogo anterior o aceptar un archivo del futuro', async () => {
  for (const generatedAt of ['2000-01-01T00:00:00.000Z', '2099-01-01T00:00:00.000Z']) {
    await expect(
      createRetailClient(jest.fn().mockResolvedValue(response({ ...snapshot, generatedAt })))(
        new AbortController().signal,
      ),
    ).rejects.toThrow('retail_outdated');
  }
});
test('rechaza archivos demasiado grandes y cancelaciones sin pedir datos', async () => {
  await expect(
    createRetailClient(jest.fn().mockResolvedValue(response(snapshot, { length: '9000000' })))(
      new AbortController().signal,
    ),
  ).rejects.toThrow('retail_limit');
  const controller = new AbortController();
  controller.abort();
  const fetcher = jest.fn();
  await expect(createRetailClient(fetcher)(controller.signal)).rejects.toThrow('cancelled');
  expect(fetcher).not.toHaveBeenCalled();
});
