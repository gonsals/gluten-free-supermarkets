// CAL-01: synthetic local-use GTINs, products, shops and prices. No real retailer data.
// Expected amounts below were worked out by hand; no app calculator/normalizer is imported.
export const items = {
  rice: { code: '2000000000015', name: 'Arroz de prueba 500 g', amount: '500', unit: 'Gramos' },
  alternative: {
    code: '2000000000022',
    name: 'Arroz de prueba 750 g',
    amount: '750',
    unit: 'Gramos',
  },
  milk: { code: '2000000000039', name: 'Leche de prueba 1 l', amount: '1', unit: 'Litros' },
} as const;
export const privateRows = [
  { shop: 'A', item: 'rice', cents: 189 },
  { shop: 'A', item: 'alternative', cents: 270 },
  { shop: 'A', item: 'milk', cents: 120 },
  { shop: 'B', item: 'rice', cents: 165 },
  { shop: 'B', item: 'alternative', cents: 240 },
  { shop: 'B', item: 'milk', cents: 140 },
  { shop: 'C', item: 'rice', cents: 130 },
] as const;
export const groupName = 'Arroz de prueba para 1,2 kg';
export const expected = {
  original: { a: '8,07', b: '7,75', partialC: '3,90', difference: '0,32' },
  substituted: { a: '7,80', b: '7,60', difference: '0,20' },
  public: { partialA: '5,415', withOffersA: '7,215', difference: '0,535', abroad: '1,80' },
};
export function dates() {
  const now = Date.now();
  return {
    now: new Date(now).toISOString(),
    previous: new Date(now - 86400000).toISOString(),
    old: new Date(now - 9 * 86400000).toISOString(),
  };
}
export function seedCopy(oldMilk = false, abroad = false) {
  const at = dates();
  return {
    format: 'sin-gluten-library',
    version: 4,
    backupVersion: 4,
    exportedAt: at.now,
    history: [],
    favorites: {},
    cache: {},
    products: [],
    cloudOwner: null,
    groups: [],
    basket: [
      { barcode: items.rice.code, name: items.rice.name, quantity: 3, addedAt: at.previous },
      { barcode: items.milk.code, name: items.milk.name, quantity: 2, addedAt: at.previous },
    ],
    branches: [
      ...['A', 'B', 'C'].map((shop) => ({
        id: 'test-' + shop,
        name: 'Ensayo ' + shop,
        address: 'Calle ' + shop + ' 1, Madrid',
        references: [
          {
            key: `private:["ensayo ${shop.toLowerCase()}","calle ${shop.toLowerCase()} 1"]`,
            source: 'private',
          },
        ],
      })),
      ...(abroad
        ? [
            {
              id: 'test-fr',
              name: 'Ensayo Francia',
              address: 'Rue de test 1, Paris',
              references: [{ key: 'open_prices:202', source: 'open_prices' }],
            },
          ]
        : []),
    ],
    prices: privateRows.map((row, index) => ({
      id: 'cal01-' + index,
      barcode: items[row.item].code,
      store: 'Ensayo ' + row.shop,
      location: 'Calle ' + row.shop + ' 1',
      amountMinor: row.cents,
      currency: 'EUR',
      observedAt: oldMilk && row.shop === 'A' && row.item === 'milk' ? at.old : at.previous,
      createdAt: at.previous,
      quantity: row.item === 'rice' ? 0.5 : row.item === 'alternative' ? 0.75 : 1,
      unit: row.item === 'milk' ? 'l' : 'kg',
      offerEndsAt: null,
      notes: '',
    })),
  };
}
export function publicRows(code: string) {
  const milk = code === items.milk.code;
  const today = dates().now.slice(0, 10);
  const quote = (
    id: number,
    branch: number,
    country: string,
    price: string,
    discounted: boolean,
    date = today,
  ) => ({
    id,
    type: 'PRODUCT',
    product_code: code,
    currency: 'EUR',
    price,
    price_is_discounted: discounted,
    price_per: null,
    date,
    location: {
      id: branch,
      type: 'OSM',
      osm_name: branch === 101 ? 'Ensayo A' : 'Ensayo Francia',
      osm_display_name: branch === 101 ? 'Calle A 1, Madrid' : 'Rue de test 1, Paris',
      osm_address_country_code: country,
    },
  });
  return [
    quote(milk ? 802 : 801, 101, 'ES', milk ? '0.90' : '1.805', milk),
    quote(milk ? 804 : 803, 202, 'FR', milk ? '0.30' : '0.40', false),
    quote(milk ? 806 : 805, 101, 'ES', '0.10', false, dates().old.slice(0, 10)),
  ];
}
