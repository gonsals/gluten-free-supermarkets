// Read-only adapters for public storefronts. Product photo candidates are validated by the DTO.
const SOURCES = {
  mercadona: 'https://tienda.mercadona.es',
  aldi: 'https://www.aldi.es',
  lidl: 'https://www.lidl.es',
  dia: 'https://www.dia.es',
  caprabo: 'https://www.capraboacasa.com',
  ametller: 'https://www.ametllerorigen.com',
};
const text = (value, max = 300) =>
  typeof value === 'string'
    ? value
        .replace(/<[^>]*>/g, ' ')
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max)
    : '';
function money(value) {
  const s = String(value);
  if (!/^\d{1,5}(?:\.\d{1,3})?$/.test(s)) return null;
  const result = Math.round(Number(s) * 1000);
  return result > 0 && result <= 100000000 ? result : null;
}
function iso(value) {
  const time = typeof value === 'number' ? value * 1000 : Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
function officialUrl(value, retailer) {
  try {
    const url = new URL(value);
    return url.origin === SOURCES[retailer] &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
      ? url.href
      : null;
  } catch {
    return null;
  }
}
function base(retailer, sku, name, sourceUrl, checkedAt, photo) {
  const clean = text(name);
  if (
    (typeof sku !== 'string' && typeof sku !== 'number') ||
    (typeof sku === 'number' && (!Number.isSafeInteger(sku) || sku <= 0)) ||
    !/^[\w-]{1,80}$/.test(String(sku)) ||
    !clean ||
    !officialUrl(sourceUrl, retailer)
  )
    return null;
  let imageUrl;
  if (typeof photo === 'string' && photo.length <= 1200) {
    try {
      imageUrl = new URL(photo, SOURCES[retailer]).href;
    } catch {
      /* Optional photo. */
    }
  }
  return {
    id: `${retailer}:${sku}`,
    retailer,
    sku: String(sku),
    name: clean,
    sourceUrl,
    checkedAt,
    startsAt: null,
    endsAt: null,
    isOffer: false,
    conditions: '',
    unitPrice: null,
    ...(imageUrl ? { imageUrl } : {}),
  };
}
function mercadona(payload, checkedAt, context = {}) {
  const barcelona = context.warehouse === 'bcn1';
  if (!Array.isArray(payload?.categories)) throw new Error('Unexpected Mercadona category');
  return payload.categories.flatMap((category) =>
    (category.products ?? []).flatMap((p) => {
      const b = base('mercadona', p.id, p.display_name, p.share_url, checkedAt, p.thumbnail);
      const price = p.price_instructions;
      if (!b || p.published !== true || p.status != null || p.unavailable_from || !price) return [];
      const amountMilli = money(price.unit_price);
      // Bulk/variable weight selectors are not pack prices. Only explicit fixed packages enter.
      if (!amountMilli || price.selling_method !== 0 || price.approx_size || price.bunch_selector)
        return [];
      const reference = money(price.reference_price);
      return [
        {
          ...b,
          id: barcelona ? `${b.id}:bcn1` : b.id,
          group: `category:${payload.id}${barcelona ? '@bcn1' : ''}`,
          amountMilli,
          quantity:
            text(`${price.unit_size ?? ''} ${price.size_format ?? ''}`) || text(p.packaging),
          scope: barcelona
            ? 'Online · referencia solicitada para Barcelona; confirma tu código postal'
            : 'Online · almacén vlc1 (Valencia); confirma tu código postal',
          isOffer: price.price_decreased === true && money(price.previous_unit_price) > amountMilli,
          unitPrice:
            reference && ['kg', 'l', 'ud', 'dz'].includes(price.reference_format)
              ? { amountMilli: reference, unit: price.reference_format }
              : null,
        },
      ];
    }),
  );
}
function nextData(html) {
  const match = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Missing Aldi page data');
  return JSON.parse(match[1]).props.pageProps;
}
function aldi(html, checkedAt) {
  const page = nextData(html);
  const api = JSON.parse(page.apiData);
  const offers = api.find(([key, value]) => key === 'OFFER_GET' && value.req?.region === 'pen');
  if (!offers?.[1]?.res?.algoliaDataMap) throw new Error('Unexpected Aldi offers');
  return Object.values(offers[1].res.algoliaDataMap).flatMap((p) => {
    const b = base(
      'aldi',
      p.objectID,
      p.name,
      `${SOURCES.aldi}/producto/${p.productSlug}.html`,
      checkedAt,
      Array.isArray(p.assets)
        ? p.assets.find(
            (asset) => asset && asset.type === 'primary' && asset.isAiGenerated !== true,
          )?.url
        : undefined,
    );
    const price = p.currentPrice;
    if (!b || !p.isAvailable || p.isRecall || !price) return [];
    const promo = text(price.priceTagLabels?.promoText1);
    if (promo && !/^-\d{1,3}(?:[.,]\d+)?%$/.test(promo) && promo !== 'Formato XXL') return [];
    const amountMilli = money(price.priceValue),
      startsAt = iso(price.validFrom),
      endsAt = iso(price.validUntil);
    if (!amountMilli || !startsAt || !endsAt || Date.parse(endsAt) < Date.parse(startsAt))
      return [];
    const unit = price.basePrice?.find((v) => ['kg', 'l', 'unidad'].includes(v.basePriceScale));
    return [
      {
        ...b,
        group: 'weekly',
        amountMilli,
        startsAt,
        endsAt,
        quantity: text(p.salesUnit),
        scope: 'Península · web oficial, sin tienda seleccionada',
        conditions: 'Hasta fin de existencias. Confirma disponibilidad en tu tienda.',
        isOffer: money(price.strikePrice?.strikePriceValue) > amountMilli,
        unitPrice:
          unit && money(unit.basePriceValue)
            ? { amountMilli: money(unit.basePriceValue), unit: unit.basePriceScale }
            : null,
      },
    ];
  });
}
const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
function lidl(html, checkedAt) {
  const records = [...html.matchAll(/data-grid-data="([^"<>]+)"/g)].map((m) =>
    JSON.parse(decode(m[1])),
  );
  if (!records.length) throw new Error('Missing Lidl product grid');
  return records.flatMap((p) => {
    const b = base(
      'lidl',
      p.productId,
      p.title,
      `${SOURCES.lidl}${p.canonicalPath}`,
      checkedAt,
      p.image,
    );
    const region = p.regionsPrices?.['1'];
    if (!b || p.productType !== 'RETAIL' || !region || p.preventSelling) return [];
    // Never substitute a price from a different region or flatten loyalty into the regular price.
    return [
      ['regular', region.currentPrice, false],
      ['plus', region.currentLidlPlusPrice?.price, true],
    ].flatMap(([kind, price, loyalty]) => {
      if (
        !price ||
        price.currencyCode !== 'EUR' ||
        price.variantsHaveDifferentPrices ||
        price.discount?.showFrom ||
        price.discount?.showUpTo
      )
        return [];
      const discountText = text(price.discount?.discountText);
      if (discountText && !['Más barato', 'Bajada permanente', 'Oferta'].includes(discountText))
        return [];
      const amountMilli = money(price.price),
        startsAt = iso(price.startDate),
        endsAt = iso(price.endDate);
      if (!amountMilli || !startsAt || !endsAt || Date.parse(endsAt) < Date.parse(startsAt))
        return [];
      return [
        {
          ...b,
          group: 'weekly',
          id: `${b.id}:${kind}`,
          amountMilli,
          startsAt,
          endsAt,
          quantity: text(price.packaging?.text),
          scope: 'Zona de precio 1 de Lidl · confirma tu tienda',
          conditions: loyalty
            ? 'Requiere Lidl Plus. Confirma activación del cupón y existencias.'
            : 'Hasta fin de existencias. Confirma disponibilidad en tu tienda.',
          isOffer: loyalty || money(price.oldPrice) > amountMilli,
        },
      ];
    });
  });
}
function quantity(name) {
  return (
    text(name).match(
      /(?:\bpack\s+)?\d+(?:[.,]\d+)?\s*(?:x\s*\d+(?:[.,]\d+)?\s*)?(?:unidades|unidad|uds\.?|ud\.?|u\.?|kg|gr?|ml|cl|l)\b\.?$/i,
    )?.[0] ?? ''
  );
}
function dia(html, checkedAt, context = {}) {
  const match = html.match(/<script id="vike_pageContext"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Missing DIA page data');
  const state = JSON.parse(match[1]).INITIAL_STATE;
  const products = state?.l2?.plp_items?.length ? state.l2.plp_items : state?.l1?.items;
  if (!Array.isArray(products)) throw new Error('Unexpected DIA catalog');
  return products.flatMap((p) => {
    const b = base('dia', p.sku_id, p.display_name, `${SOURCES.dia}${p.url}`, checkedAt, p.image);
    const price = p.prices,
      amountMilli = money(price?.price);
    if (
      !b ||
      !amountMilli ||
      price.currency !== 'EUR' ||
      price.is_club_price ||
      !(p.units_in_stock > 0) ||
      p.weight > 0 ||
      p.average_weight > 0 ||
      /aprox/i.test(p.display_name)
    )
      return [];
    // Promotions without an explicit direct percentage reduction may depend on quantity/coupons.
    if (
      price.is_promo_price &&
      !(price.discount_percentage > 0 && money(price.strikethrough_price) > amountMilli)
    )
      return [];
    const units = { DOCENA: 'dz', LITRO: 'l', KILO: 'kg', UNIDAD: 'unidad' };
    return [
      {
        ...b,
        group: context.group,
        amountMilli,
        quantity: quantity(p.display_name),
        scope: 'Online · sin código postal seleccionado',
        conditions: 'Confirma precio, cobertura y promociones para tu dirección.',
        isOffer: price.is_promo_price === true,
        unitPrice:
          Object.hasOwn(units, price.measure_unit) && money(price.price_per_unit)
            ? { amountMilli: money(price.price_per_unit), unit: units[price.measure_unit] }
            : null,
      },
    ];
  });
}
function ametller(html, checkedAt, context = {}) {
  const lists = [
    ...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
  ]
    .map((m) => JSON.parse(m[1]))
    .filter((d) => d['@type'] === 'ItemList' && Array.isArray(d.itemListElement));
  if (!lists.length) throw new Error('Missing Ametller catalog');
  return lists.flatMap((d) =>
    d.itemListElement.flatMap(({ item: p }) => {
      if (!p || p['@type'] !== 'Product') return [];
      const b = base(
          'ametller',
          p.sku,
          p.name,
          p.url,
          checkedAt,
          Array.isArray(p.image) ? p.image[0] : p.image,
        ),
        offer = p.offers;
      const amountMilli = money(offer?.price);
      if (
        !b ||
        !amountMilli ||
        offer.priceCurrency !== 'EUR' ||
        !/^https?:\/\/schema.org\/InStock$/.test(offer.availability) ||
        /aprox|al corte/i.test(p.name)
      )
        return [];
      return [
        {
          ...b,
          group: context.group,
          amountMilli,
          quantity: quantity(p.name),
          startsAt: offer.validFrom ? iso(offer.validFrom) : null,
          endsAt: offer.priceValidUntil ? iso(offer.priceValidUntil) : null,
          scope: 'Online · sin código postal seleccionado',
          conditions: 'Confirma precio y disponibilidad para tu dirección.',
        },
      ];
    }),
  );
}
function caprabo(html, checkedAt, context = {}) {
  const blocks = html.split(/<div class="col border-0 product-item-lineal item-type-1\b/).slice(1);
  if (!blocks.length) throw new Error('Missing Caprabo product grid');
  return blocks.flatMap((block) => {
    const tag = block.match(/<a\b[^>]*\bclass="product-title-link"[^>]*>/)?.[0];
    if (!tag) return [];
    const metric = tag.match(/data-metrics="([^"]+)"/)?.[1],
      url = tag.match(/\bhref="([^"]+)"/)?.[1];
    if (!metric || !url) return [];
    const data = JSON.parse(decode(metric)),
      items = data.ecommerce?.items;
    if (data.ecommerce?.currency !== 'EUR' || items?.length !== 1) return [];
    const imageTag = block.match(/<img\b[^>]*\bclass="[^"]*\bproduct-img\b[^"]*"[^>]*>/)?.[0];
    const photo = imageTag?.match(/\ssrc="([^"]+)"/)?.[1];
    const p = items[0],
      b = base(
        'caprabo',
        p.item_id,
        p.item_name,
        decode(url),
        checkedAt,
        photo ? decode(photo) : undefined,
      );
    const displayed = block.match(
      /<span class="price-offer-now">\s*(\d+[.,]\d{2})\s*<\/span>/,
    )?.[1];
    const amountMilli = money(displayed?.replace(',', '.'));
    if (
      !b ||
      !amountMilli ||
      amountMilli !== money(p.price) ||
      /no-stock|out-of-stock|product-unavailable/.test(block)
    )
      return [];
    const promo = text(
      decode(
        block.match(
          /<!-- offer-description -->([\s\S]*?)class="product-col-50 price-offer"/,
        )?.[1] ?? '',
      ),
    );
    if (/2ª|2a\s*ud|segunda|3x2|club|cup[oó]n|tarjeta|acumul|[2-9]\s*x\s*\d/i.test(promo))
      return [];
    return [
      {
        ...b,
        group: context.group,
        amountMilli,
        quantity: quantity(p.item_name),
        scope: 'Online · sin código postal seleccionado',
        conditions: 'Precio simple publicado; confirma tienda, cobertura y existencias.',
      },
    ];
  });
}
module.exports = { mercadona, aldi, lidl, dia, caprabo, ametller, money };
