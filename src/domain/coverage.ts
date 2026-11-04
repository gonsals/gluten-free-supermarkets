import { normalizeBarcode } from './barcode';
import { compareBasket, ineligible, newerQuote } from './basketComparison';
import { fold, type PriceQuote } from './comparison';
import { record } from './product';
import type { StoreBranch } from './branches';

export interface CoverageItem {
  barcode: string;
  name: string;
  quantity: number;
  segment: 'general' | 'marketed_gluten_free';
  identitySource: string;
}
export interface CoveragePlan {
  schemaVersion: 1;
  id: string;
  selection: string;
  zone: { countryCode: 'ES'; text: string; label: string };
  limits: {
    products: 10;
    pagesPerProduct: 3;
    pageSize: 50;
    productionRequests: 40;
    delayMs: number;
    timeoutMs: 8000;
  };
  profiles: string[];
  diagnostic: {
    label: string;
    lat: number;
    lon: number;
    radiusKm: number;
    recentDays: 7;
    page: 1;
    note: string;
  };
  basket: CoverageItem[];
}
export type CoverageStatus = 'ok' | 'error' | 'not_attempted';
export interface CoveragePage {
  barcode: string;
  page: number;
  status: CoverageStatus;
  total: number | null;
  more: boolean;
  skipped: number;
  quotes: PriceQuote[];
  error: string | null;
}
export function validateCoveragePlan(value: unknown): asserts value is CoveragePlan {
  if (
    !record(value) ||
    value.schemaVersion !== 1 ||
    typeof value.id !== 'string' ||
    !/^[a-z0-9-]{1,80}$/.test(value.id) ||
    !record(value.zone) ||
    value.zone.countryCode !== 'ES' ||
    typeof value.zone.text !== 'string' ||
    !value.zone.text.trim() ||
    typeof value.zone.label !== 'string' ||
    value.zone.label.length > 300 ||
    value.zone.text.length > 100 ||
    typeof value.selection !== 'string' ||
    value.selection.length > 2000 ||
    !Array.isArray(value.profiles) ||
    value.profiles.join(',') !== 'basket_page_1,product_up_to_3_pages,nearby_recent_page_1' ||
    !record(value.limits) ||
    value.limits.products !== 10 ||
    value.limits.pagesPerProduct !== 3 ||
    value.limits.pageSize !== 50 ||
    value.limits.productionRequests !== 40 ||
    value.limits.timeoutMs !== 8000 ||
    !Number.isInteger(value.limits.delayMs) ||
    Number(value.limits.delayMs) < 2000 ||
    Number(value.limits.delayMs) > 10000 ||
    !record(value.diagnostic) ||
    typeof value.diagnostic.lat !== 'number' ||
    !Number.isFinite(value.diagnostic.lat) ||
    Math.abs(value.diagnostic.lat) > 90 ||
    typeof value.diagnostic.lon !== 'number' ||
    !Number.isFinite(value.diagnostic.lon) ||
    Math.abs(value.diagnostic.lon) > 180 ||
    typeof value.diagnostic.radiusKm !== 'number' ||
    !Number.isFinite(value.diagnostic.radiusKm) ||
    value.diagnostic.radiusKm <= 0 ||
    value.diagnostic.radiusKm > 25 ||
    typeof value.diagnostic.label !== 'string' ||
    value.diagnostic.label.length > 300 ||
    value.diagnostic.recentDays !== 7 ||
    value.diagnostic.page !== 1 ||
    !Array.isArray(value.basket) ||
    value.basket.length !== 10
  )
    throw new Error('invalid_coverage_plan');
  const seen = new Set<string>();
  for (const item of value.basket) {
    if (
      !record(item) ||
      typeof item.barcode !== 'string' ||
      normalizeBarcode(item.barcode) !== item.barcode ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      item.name.length > 300 ||
      !Number.isInteger(item.quantity) ||
      Number(item.quantity) < 1 ||
      Number(item.quantity) > 99 ||
      !['general', 'marketed_gluten_free'].includes(String(item.segment)) ||
      typeof item.identitySource !== 'string' ||
      !item.identitySource.startsWith('https://')
    )
      throw new Error('invalid_coverage_plan');
    const key = item.barcode.padStart(14, '0');
    if (seen.has(key)) throw new Error('duplicate_coverage_code');
    seen.add(key);
  }
}
const filtersAt = (now: number) => ({
  now,
  recentOnly: true,
  includeOffers: false,
  publicSpainOnly: true,
  location: '',
});

/** Observed loaded sample only. No observed row is not the same as provider failure or missing stock. */
export function summarizeCoverage(
  plan: CoveragePlan,
  pages: CoveragePage[],
  now: number,
  spatial = false,
) {
  if (!Number.isFinite(now)) throw new Error('invalid_coverage_time');
  const filters = filtersAt(now);
  const rows = plan.basket.map((item) => {
    const found = pages.filter((p) => p.barcode === item.barcode);
    const first = found.find((p) => p.page === 1);
    const successful = found.filter((p) => p.status === 'ok');
    const byReference = new Map<string, PriceQuote>();
    const quotes = successful.flatMap((p) => p.quotes);
    for (const q of quotes) {
      const previous = byReference.get(q.branchKey);
      if (!previous || newerQuote(q, previous) > 0) byReference.set(q.branchKey, q);
    }
    const latest = [...byReference.values()];
    const zone = latest.filter(
      (q) => q.countryCode === 'ES' && (spatial || fold(q.location).includes(fold(plan.zone.text))),
    );
    const eligible = zone.filter((q) => !ineligible(q, filters));
    return {
      barcode: item.barcode,
      name: item.name,
      segment: item.segment,
      status: first?.status ?? 'not_attempted',
      error: first?.error ?? null,
      successfulPages: successful.length,
      extraPageErrors: found.filter((p) => p.page > 1 && p.status === 'error').length,
      providerTotal: first?.total ?? null,
      truncated: successful.at(-1)?.more ?? false,
      loaded: quotes.length,
      skipped: successful.reduce((n, p) => n + p.skipped, 0),
      oldestLoaded: quotes.length ? quotes.map((q) => q.observedAt).sort()[0] : null,
      newestLoaded: quotes.length
        ? quotes
            .map((q) => q.observedAt)
            .sort()
            .at(-1)!
        : null,
      recentReferences: latest.filter((q) => !ineligible(q, { ...filters, publicSpainOnly: false }))
        .length,
      eligibleSpanishReferences: latest.filter((q) => !ineligible(q, filters)).length,
      spanishReferences: latest.filter((q) => q.countryCode === 'ES').length,
      zoneReferences: zone.length,
      eligibleReferences: eligible.length,
      zoneExclusions: zone
        .filter((q) => ineligible(q, filters))
        .map((q) => ({ reference: q.branchKey, reason: ineligible(q, filters) })),
      eligible,
      zone,
    };
  });
  const refs = new Map<string, PriceQuote>();
  rows.flatMap((r) => r.zone).forEach((q) => refs.set(q.branchKey, q));
  // Analysis scaffolding only: these OSM IDs are candidates, never saved/confirmed user branches.
  const branches: StoreBranch[] = [...refs.values()].map((q) => ({
    id: q.branchKey,
    name: q.store,
    address: q.location,
    references: [{ key: q.branchKey, source: 'open_prices' }],
  }));
  const basket = plan.basket.map((i) => ({
    barcode: i.barcode,
    name: i.name,
    quantity: i.quantity,
    addedAt: new Date(now).toISOString(),
  }));
  const quotes = rows.flatMap((r) => r.zone);
  const comparisons = compareBasket(basket, branches, quotes, filters);
  const completed = rows.filter((r) => r.status === 'ok').length;
  const covered = rows.filter((r) => r.eligibleReferences > 0).length;
  const gluten = rows.filter((r) => r.segment === 'marketed_gluten_free');
  return {
    scope: spatial ? plan.diagnostic.label : plan.zone.label,
    products: rows.length,
    successfulProducts: completed,
    providerErrors: rows.filter((r) => r.status === 'error').length,
    notAttempted: rows.filter((r) => r.status === 'not_attempted').length,
    productsWithAnyLoadedPrice: rows.filter((r) => r.loaded > 0).length,
    productsWithoutProviderRows: rows.filter((r) => r.status === 'ok' && r.providerTotal === 0)
      .length,
    productsWithOnlyRejectedRows: rows.filter(
      (r) => r.status === 'ok' && Number(r.providerTotal) > 0 && r.loaded === 0,
    ).length,
    productsWithRecentPriceAnywhere: rows.filter((r) => r.recentReferences > 0).length,
    productsWithEligibleSpanishPrice: rows.filter((r) => r.eligibleSpanishReferences > 0).length,
    productsWithEligiblePrice: covered,
    coveredPercent: (100 * covered) / rows.length,
    marketedGlutenFree: {
      products: gluten.length,
      withEligiblePrice: gluten.filter((r) => r.eligibleReferences > 0).length,
    },
    loaded: rows.reduce((n, r) => n + r.loaded, 0),
    successfulPages: rows.reduce((n, r) => n + r.successfulPages, 0),
    completeCandidateBaskets: comparisons.filter((r) => r.complete).length,
    candidateReferences: branches.length,
    maximumCoveredLinesAtOneReference: Math.max(0, ...comparisons.map((r) => r.coveredLines)),
    allProductRequestsSucceeded:
      completed === rows.length && rows.every((r) => r.extraPageErrors === 0),
    anyTruncated: rows.some((r) => r.truncated),
    rows: rows.map(({ eligible, zone, ...row }) => row),
    references: comparisons.map((r) => ({
      key: r.branch.id,
      store: r.branch.name,
      location: r.branch.address,
      coveredLines: r.coveredLines,
      complete: r.complete,
      subtotalMilli: r.subtotalMilli,
      missing: r.lines
        .filter((l) => !l.quote)
        .map((l) => ({ barcode: l.line.barcode, reason: l.reason })),
    })),
  };
}
