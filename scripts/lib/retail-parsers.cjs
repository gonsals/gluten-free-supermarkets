// Read-only adapters for the public Spanish storefronts. No sessions, API keys or images.
const SOURCES = {
  mercadona: 'https://tienda.mercadona.es',
  aldi: 'https://www.aldi.es',
  lidl: 'https://www.lidl.es',
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
function base(retailer, sku, name, sourceUrl, checkedAt) {
  const clean = text(name);
  if (!/^[\w-]{1,80}$/.test(String(sku)) || !clean || !officialUrl(sourceUrl, retailer))
    return null;
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
  };
}
function mercadona(payload, checkedAt) {
  if (!Array.isArray(payload?.categories)) throw new Error('Unexpected Mercadona category');
  return payload.categories.flatMap((category) =>
    (category.products ?? []).flatMap((p) => {
      const b = base('mercadona', p.id, p.display_name, p.share_url, checkedAt);
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
          group: `category:${payload.id}`,
          amountMilli,
          quantity:
            text(`${price.unit_size ?? ''} ${price.size_format ?? ''}`) || text(p.packaging),
          scope: 'Online · almacén vlc1 (Valencia); confirma tu código postal',
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
    const b = base('lidl', p.productId, p.title, `${SOURCES.lidl}${p.canonicalPath}`, checkedAt);
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
module.exports = { mercadona, aldi, lidl, money };
