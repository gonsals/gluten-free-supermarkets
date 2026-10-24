import { act, renderHook, waitFor } from '@testing-library/react-native';
import { library, productClient } from '@/src/data/repositories';
import { useProductLookup } from '../useProductLookup';
import { AppError } from '@/src/domain/errors';
import type { Product } from '@/src/domain/product';
import { BARCODE, OTHER_BARCODE, product } from '@/tests/fixtures';

jest.mock('@/src/data/repositories', () => ({
  library: { load: jest.fn(), getProduct: jest.fn(), saveProduct: jest.fn() },
  productClient: { fetchProduct: jest.fn() },
}));
const fetchProduct = jest.mocked(productClient.fetchProduct);
const getProduct = jest.mocked(library.getProduct);
const saveProduct = jest.mocked(library.saveProduct);
beforeEach(() => {
  fetchProduct.mockReset();
  getProduct.mockReset().mockResolvedValue(null);
  saveProduct.mockReset().mockResolvedValue(undefined);
  jest.mocked(library.load).mockResolvedValue(undefined);
});
test('cerrar y consultar B impide que una respuesta antigua A reemplace el resultado', async () => {
  let resolveA!: (value: Product) => void;
  fetchProduct
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveA = resolve;
        }),
    )
    .mockResolvedValueOnce(product(OTHER_BARCODE));
  const { result } = await renderHook(() => useProductLookup());
  let pending!: Promise<void>;
  await act(async () => {
    pending = result.current.lookup(BARCODE);
  });
  await waitFor(() => expect(fetchProduct).toHaveBeenCalledTimes(1));
  await act(async () => {
    result.current.reset();
    await result.current.lookup(OTHER_BARCODE);
  });
  await act(async () => {
    resolveA(product());
    await pending;
  });
  expect(result.current.product?.barcode).toBe(OTHER_BARCODE);
  expect(saveProduct).toHaveBeenCalledTimes(1);
});
test('reiniciar limpia error y carga; el mismo código puede consultarse de nuevo', async () => {
  fetchProduct.mockRejectedValueOnce(new AppError('not_found')).mockResolvedValueOnce(product());
  const { result } = await renderHook(() => useProductLookup());
  await act(async () => {
    await result.current.lookup(BARCODE);
  });
  expect(result.current.error).toBe('not_found');
  await act(() => result.current.reset());
  expect(result.current.error).toBeNull();
  expect(result.current.loading).toBe(false);
  await act(async () => {
    await result.current.lookup(BARCODE);
  });
  expect(result.current.product?.barcode).toBe(BARCODE);
});
test('sin red conserva ficha guardada, fecha original y error de actualización', async () => {
  getProduct.mockResolvedValue(product());
  fetchProduct.mockRejectedValue(new AppError('offline'));
  const { result } = await renderHook(() => useProductLookup());
  await act(async () => {
    await result.current.lookup(BARCODE, { force: true });
  });
  expect(result.current.product).toEqual(product());
  expect(result.current.cached).toBe(true);
  expect(result.current.error).toBe('offline');
  expect(result.current.loading).toBe(false);
});
test('fallar el disco no impide leer un resultado de la API ni finge haberlo guardado', async () => {
  fetchProduct.mockResolvedValue(product());
  saveProduct.mockRejectedValue(new AppError('storage_error'));
  const { result } = await renderHook(() => useProductLookup());
  await act(async () => {
    await result.current.lookup(BARCODE);
  });
  expect(result.current.product).toEqual(product());
  expect(result.current.storageWarning).toBe(true);
});
