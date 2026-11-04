const diaItem = (extra = {}) => ({
  sku_id: '1',
  display_name: 'Huevos de ensayo 6 unidades',
  url: '/huevos-leche-y-mantequilla/huevos/p/1',
  units_in_stock: 2,
  weight: 0,
  prices: {
    currency: 'EUR',
    price: 2.5,
    price_per_unit: 5,
    measure_unit: 'DOCENA',
    is_club_price: false,
    is_promo_price: false,
    discount_percentage: 0,
  },
  ...extra,
});
const diaPage = (rows = [diaItem()], level = 'l2') =>
  `<script id="vike_pageContext" type="application/json">${JSON.stringify({
    INITIAL_STATE: {
      [level]: level === 'l1' ? { items: rows } : { plp_items: rows },
    },
  })}</script>`;
const capraboPage = ({
  price = 2.5,
  displayed = '2,50',
  currency = 'EUR',
  name = 'Huevos de ensayo, 6 uds.',
  promo = '',
} = {}) =>
  `<div class="col border-0 product-item-lineal item-type-1 col-xs-12"><a class="product-title-link" data-metrics="${JSON.stringify({ ecommerce: { currency, items: [{ item_id: '1', item_name: name, price }] } }).replaceAll('"', '&quot;')}" href="https://www.capraboacasa.com/es/productdetail/1-huevos/">${name}</a><!-- offer-description -->${promo}<div class="product-col-50 price-offer"><span class="price-offer-now"> ${displayed}</span></div></div>`;
const ametllerPage = (extra = {}) =>
  `<script type="application/ld+json">${JSON.stringify({
    '@type': 'ItemList',
    itemListElement: [
      {
        item: {
          '@type': 'Product',
          sku: '1',
          name: 'Huevos de ensayo - 6uds.',
          url: 'https://www.ametllerorigen.com/es/huevos/1.html',
          offers: { price: 2.5, priceCurrency: 'EUR', availability: 'https://schema.org/InStock' },
          image: 'excluded-image',
          ...extra,
        },
      },
    ],
  })}</script>`;
module.exports = { diaItem, diaPage, capraboPage, ametllerPage };
