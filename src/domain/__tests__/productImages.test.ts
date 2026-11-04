import { productImageUrl } from '../productImages';
import { parseRetailCatalog } from '../retailCatalog';
import snapshot from '@/data/retail-prices.es.json';

const mercadona = 'https://prod-mercadona.imgix.net/images/rice.jpg?fit=crop&h=300&w=300';
test.each([
  ['mercadona', mercadona],
  ['aldi', 'https://s7g10.scene7.com/is/image/aldinord/rice'],
  ['lidl', 'https://www.lidl.es/assets/rice.png'],
  ['dia', 'https://www.dia.es/product_images/151/151_ISO_0_ES.jpg'],
  ['caprabo', 'https://www.capraboacasa.com//images/15349004.jpg'],
  [
    'ametller',
    'https://www.ametllerorigen.com/dw/image/v2/BLZV_PRD/on/demandware.static/-/Sites-mastercatalog_AMETLLER/default/dw123/images/products/1/1_1.jpg?sw=300&fmt=webp&q=80',
  ],
  [
    'open_prices',
    'https://images.openfoodfacts.org/images/products/001/740/011/2530/front_en.5.400.jpg',
  ],
] as const)('admite la foto del producto de su fuente declarada: %s', (provider, url) => {
  expect(productImageUrl(provider, url)).not.toBeNull();
  expect(productImageUrl(provider, productImageUrl(provider, url))).toBe(
    productImageUrl(provider, url),
  );
});

test.each([
  'http://prod-mercadona.imgix.net/images/rice.jpg',
  'https://prod-mercadona.imgix.net.evil.test/images/rice.jpg',
  'https://user:secret@prod-mercadona.imgix.net/images/rice.jpg',
  'https://prod-mercadona.imgix.net:8443/images/rice.jpg',
  'https://prod-mercadona.imgix.net/api/session.jpg',
  'https://prod-mercadona.imgix.net/images/rice.jpg?token=secret',
  'https://prod-mercadona.imgix.net/images/rice.jpg?w=300&w=400',
  'https://prod-mercadona.imgix.net/images/rice.jpg#secret',
  'data:image/png;base64,AA==',
  'javascript:alert(1)',
  'https://127.0.0.1/images/rice.jpg',
  'https://www.lidl.es/assets/rice.png',
])('descarta esquemas, rutas, consultas y fuentes ajenas: %s', (url) => {
  expect(productImageUrl('mercadona', url)).toBeNull();
});

test('una foto inválida no elimina el precio y el catálogo anterior sigue siendo compatible', () => {
  const plain = parseRetailCatalog(snapshot);
  const input = {
    ...snapshot,
    entries: snapshot.entries.map((p) => ({ ...p, imageUrl: 'https://evil.test/photo.jpg' })),
  };
  const withoutPhotos = parseRetailCatalog(input);
  expect(withoutPhotos.entries.map(({ imageUrl: _photo, ...price }) => price)).toEqual(
    plain.entries.map(({ imageUrl: _photo, ...price }) => price),
  );
  expect(withoutPhotos.entries.every((p) => !p.imageUrl)).toBe(true);
  const row = { ...snapshot.entries.find((p) => p.retailer === 'mercadona')!, imageUrl: mercadona };
  expect(parseRetailCatalog({ ...snapshot, entries: [row] }).entries[0].imageUrl).toBe(mercadona);
});
