import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PriceForm } from '../PriceForm';
import { BARCODE, product } from '@/tests/fixtures';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

const mockAddPrice = jest.fn().mockResolvedValue(undefined);
jest.mock('@/src/features/library/useLibrary', () => ({
  useLibrary: () => ({ ready: true, repository: { addPrice: mockAddPrice } }),
}));
jest.mock('@/src/features/products/useCachedProduct', () => ({ useCachedProduct: () => null }));

test('sugiere Mercadona por Hacendado y guarda la tienda corregida por la persona', async () => {
  await render(<PriceForm barcode={BARCODE} product={{ ...product(), brands: ['Hacendado'] }} />);
  const store = screen.getByLabelText('Supermercado o tienda');
  expect(store.props.value).toBe('Mercadona');
  await fireEvent.changeText(store, 'Otra tienda');
  await fireEvent.changeText(screen.getByLabelText('Precio en euros'), '2,49');
  await fireEvent.changeText(screen.getByLabelText('Sucursal o localidad'), 'Madrid');
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar precio privado' }));
  await waitFor(() =>
    expect(mockAddPrice).toHaveBeenCalledWith(
      expect.objectContaining({ store: 'Otra tienda', amountMinor: 249, barcode: BARCODE }),
    ),
  );
});
test('una ficha que llega tarde no sustituye ni rellena de nuevo una tienda editada o vaciada', async () => {
  const view = await render(<PriceForm barcode={BARCODE} product={null} />);
  await fireEvent.changeText(screen.getByLabelText('Supermercado o tienda'), 'Mi tienda');
  await view.rerender(
    <PriceForm barcode={BARCODE} product={{ ...product(), stores: ['Mercadona'] }} />,
  );
  expect(screen.getByLabelText('Supermercado o tienda').props.value).toBe('Mi tienda');
  await fireEvent.changeText(screen.getByLabelText('Supermercado o tienda'), '');
  await view.rerender(
    <PriceForm barcode={BARCODE} product={{ ...product(), stores: ['Carrefour'] }} />,
  );
  expect(screen.getByLabelText('Supermercado o tienda').props.value).toBe('');
});
test('varias tiendas requieren elegir y una ficha sin evidencia deja la entrada libre', async () => {
  const view = await render(<PriceForm barcode={BARCODE} product={product()} />);
  expect(screen.getByLabelText('Supermercado o tienda').props.value).toBe('');
  await view.rerender(
    <PriceForm barcode={BARCODE} product={{ ...product(), stores: ['Mercadona', 'Carrefour'] }} />,
  );
  expect(screen.getByLabelText('Supermercado o tienda').props.value).toBe('');
  await fireEvent.press(screen.getByRole('button', { name: 'Usar Carrefour' }));
  expect(screen.getByLabelText('Supermercado o tienda').props.value).toBe('Carrefour');
});
