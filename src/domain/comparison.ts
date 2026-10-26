import { sameGtin } from './barcode';
import type { PriceObservation } from './price';

export interface PriceQuote {
  id: string;
  barcode: string;
  store: string;
  location: string;
  branchKey: string;
  amountMilli: number;
  observedAt: string;
  recordedAt: string;
  conditional: boolean;
  offerEndsAt: string | null;
  source: 'private' | 'open_prices';
  sourceUrl: string | null;
  countryCode: string | null;
  conditions?: string;
}
export const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ');
export function privateReferenceKey(store: string, location: string): string {
  return `private:${JSON.stringify([fold(store), fold(location)])}`;
}
export function privateQuotes(prices: PriceObservation[]): PriceQuote[] {
  return prices.map((price) => ({
    id: `private:${price.id}`,
    barcode: price.barcode,
    store: price.store,
    location: price.location,
    branchKey: privateReferenceKey(price.store, price.location),
    amountMilli: price.amountMinor * 10,
    observedAt: price.observedAt,
    recordedAt: price.createdAt,
    conditional: Boolean(price.offerEndsAt || price.notes.trim()),
    offerEndsAt: price.offerEndsAt,
    source: 'private',
    sourceUrl: null,
    countryCode: null,
    conditions: price.notes.trim(),
  }));
}
export function quoteMoney(amountMilli: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(amountMilli / 1000);
}
export function compareQuotes(
  quotes: PriceQuote[],
  options: {
    barcode: string;
    location?: string;
    recentOnly?: boolean;
    includeOffers?: boolean;
    publicSpainOnly?: boolean;
    now?: number;
  },
): PriceQuote[] {
  const now = options.now ?? Date.now();
  const branches = new Map<string, PriceQuote>();
  for (const quote of quotes) {
    if (!sameGtin(quote.barcode, options.barcode)) continue;
    // Select the newest record before filtering conditions/age. A discarded newer
    // observation must never resurrect an older, cheaper price in the same branch.
    const previous = branches.get(quote.branchKey);
    const order = Date.parse(quote.observedAt) - Date.parse(previous?.observedAt ?? '');
    if (
      !previous ||
      order > 0 ||
      (order === 0 &&
        (quote.recordedAt > previous.recordedAt ||
          (quote.recordedAt === previous.recordedAt && quote.id > previous.id)))
    )
      branches.set(quote.branchKey, quote);
  }
  const query = fold(options.location ?? '');
  return [...branches.values()]
    .filter((quote) => {
      const observed = Date.parse(quote.observedAt);
      return (
        Number.isFinite(observed) &&
        observed <= now + 60000 &&
        (!options.recentOnly || observed >= now - 7 * 86400000) &&
        (options.includeOffers || !quote.conditional) &&
        (!quote.offerEndsAt || Date.parse(quote.offerEndsAt) >= now) &&
        (!options.publicSpainOnly || quote.source === 'private' || quote.countryCode === 'ES') &&
        fold(`${quote.store} ${quote.location}`).includes(query)
      );
    })
    .sort(
      (a, b) =>
        a.amountMilli - b.amountMilli ||
        Date.parse(b.observedAt) - Date.parse(a.observedAt) ||
        a.id.localeCompare(b.id),
    );
}
