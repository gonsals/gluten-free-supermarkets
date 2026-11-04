import { compareQuotes, fold, type PriceQuote } from './comparison';

export interface NamedProduct {
  barcode: string;
  name: string;
  brands: string;
  quantity: string;
}
export interface CatalogPricePage {
  products: NamedProduct[];
  quotes: PriceQuote[];
  page: number;
  more: boolean;
  total: number;
  skipped: number;
  pricesLimited: boolean;
  priceError: string | null;
}
export interface NamedPrice {
  product: NamedProduct;
  quote: PriceQuote;
}
export function searchText(value: string, minimum = 2, maximum = 80): string {
  const text = value.trim().replace(/\s+/g, ' ');
  if (text.length < minimum || text.length > maximum || /[\u0000-\u001f\u007f]/.test(value))
    throw new Error('invalid_search');
  return text;
}
export function namedPrices(
  products: NamedProduct[],
  quotes: PriceQuote[],
  options: {
    text: string;
    store: string;
    onlyOffers: boolean;
    includeOlder: boolean;
    now?: number;
  },
): NamedPrice[] {
  const groups = new Map<string, PriceQuote[]>();
  for (const quote of quotes) {
    const key = quote.barcode.padStart(14, '0');
    const group = groups.get(key) ?? [];
    group.push(quote);
    groups.set(key, group);
  }
  const distinct = new Map<string, NamedProduct>();
  for (const product of products) {
    if (fold(`${product.name} ${product.brands}`).includes(fold(options.text)))
      distinct.set(product.barcode.padStart(14, '0'), product);
  }
  return [...distinct]
    .flatMap(([key, product]) =>
      compareQuotes(groups.get(key) ?? [], {
        barcode: product.barcode,
        location: options.store,
        recentOnly: !options.includeOlder,
        includeOffers: true,
        publicSpainOnly: true,
        now: options.now,
      })
        .filter((quote) => !options.onlyOffers || quote.isOffer === true)
        .map((quote) => ({ product, quote })),
    )
    .sort(
      (a, b) =>
        a.quote.amountMilli - b.quote.amountMilli ||
        a.product.name.localeCompare(b.product.name, 'es') ||
        a.quote.id.localeCompare(b.quote.id),
    );
}
