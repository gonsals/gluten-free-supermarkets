import { createProductClient } from '../client';
import { BARCODE, OTHER_BARCODE } from '@/tests/fixtures';

const response = (body: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (key: string) => headers[key] ?? null },
    json: async () => body,
  }) as Response;
test('solicita campos acotados y normaliza producto con campos ausentes', async () => {
  const fetcher = jest.fn(async () => response({ status: 1, product: { code: BARCODE } }));
  const result = await createProductClient({ environment: 'production', fetcher }).fetchProduct(
    BARCODE,
  );
  expect(result.assessment.state).toBe('unknown');
  expect(fetcher.mock.calls).toHaveLength(1);
  expect(fetcher.mock.calls[0]).toBeDefined();
});
test('rechaza un código no válido antes de salir a la red', async () => {
  const fetcher = jest.fn();
  await expect(
    createProductClient({ environment: 'production', fetcher }).fetchProduct('bad'),
  ).rejects.toThrow('invalid_barcode');
  expect(fetcher).not.toHaveBeenCalled();
});
test('no encontrado se cachea brevemente y no significa gluten declarado', async () => {
  const fetcher = jest.fn(async () => response({ status: 0 }));
  const client = createProductClient({ environment: 'production', fetcher });
  await expect(client.fetchProduct(BARCODE)).rejects.toMatchObject({ code: 'not_found' });
  await expect(client.fetchProduct(BARCODE)).rejects.toMatchObject({ code: 'not_found' });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test('respeta Retry-After en lugar de repetir inmediatamente', async () => {
  const fetcher = jest.fn(async () => response({}, 429, { 'Retry-After': '60' }));
  const client = createProductClient({ environment: 'production', fetcher });
  await expect(client.fetchProduct(BARCODE)).rejects.toMatchObject({ code: 'rate_limited' });
  await expect(client.fetchProduct(OTHER_BARCODE)).rejects.toMatchObject({ code: 'rate_limited' });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test('un 5xx se reintenta una sola vez y un fallo de red se distingue', async () => {
  const fetcher = jest.fn(async () => response({}, 503));
  await expect(
    createProductClient({ environment: 'production', fetcher }).fetchProduct(BARCODE),
  ).rejects.toMatchObject({ code: 'provider_error' });
  expect(fetcher).toHaveBeenCalledTimes(2);
  const offline = jest.fn(async () => {
    throw new TypeError('network');
  });
  await expect(
    createProductClient({ environment: 'production', fetcher: offline }).fetchProduct(BARCODE),
  ).rejects.toMatchObject({ code: 'offline' });
});
test('no muestra como propio el producto de otro código', async () => {
  for (const returnedCode of [OTHER_BARCODE, Number(BARCODE)]) {
    const fetcher = jest.fn(async () => response({ status: 1, product: { code: returnedCode } }));
    await expect(
      createProductClient({ environment: 'production', fetcher }).fetchProduct(BARCODE),
    ).rejects.toMatchObject({ code: 'invalid_response' });
  }
});
test('diferencia JSON inválido, cancelación y timeout', async () => {
  const invalid = jest.fn(async () => ({
    ...response(null),
    json: async () => {
      throw new SyntaxError();
    },
  }));
  await expect(
    createProductClient({ environment: 'production', fetcher: invalid }).fetchProduct(BARCODE),
  ).rejects.toMatchObject({ code: 'invalid_response' });
  const controller = new AbortController();
  controller.abort();
  const fetcher = jest.fn();
  await expect(
    createProductClient({ environment: 'production', fetcher }).fetchProduct(
      BARCODE,
      controller.signal,
    ),
  ).rejects.toMatchObject({ code: 'cancelled' });
  expect(fetcher).not.toHaveBeenCalled();
  const hanging: typeof fetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('abort')));
    });
  await expect(
    createProductClient({ environment: 'production', fetcher: hanging, timeoutMs: 5 }).fetchProduct(
      BARCODE,
    ),
  ).rejects.toMatchObject({ code: 'timeout' });
});
