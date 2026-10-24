import { normalizeProduct } from '@/src/domain/product';
export const BARCODE = '3274080005003';
export const OTHER_BARCODE = '3017620422003';
export function product(barcode = BARCODE) {
  return normalizeProduct(
    {
      code: barcode,
      product_name: 'Producto de prueba',
      brands: 'Marca',
      labels_tags: ['en:no-gluten'],
      allergens_tags: [],
      traces_tags: [],
      ingredients_text: 'Ingredientes de prueba',
    },
    barcode,
    'production',
    new Date('2026-10-23T00:00:00Z'),
  );
}
