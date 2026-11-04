import type { BasketLine } from './basket';
import type { StoreBranch } from './branches';
import { fold, type PriceQuote } from './comparison';

export interface BasketFilters {
  recentOnly: boolean;
  includeOffers: boolean;
  publicSpainOnly: boolean;
  location: string;
  now?: number;
}
export type MissingReason =
  'missing' | 'old' | 'future' | 'conditional' | 'expired' | 'country' | 'invalid' | 'provider';
export const missingCopy: Record<MissingReason, string> = {
  missing: 'Sin precio para esta sucursal',
  old: 'Observación fuera de los últimos 7 días',
  future: 'Fecha futura',
  conditional: 'Oferta o notas excluidas por los filtros',
  expired: 'Oferta vencida',
  country: 'Referencia pública fuera del filtro España',
  invalid: 'Importe o fecha no válidos',
  provider: 'Consulta pública sin completar; tampoco hay precio privado para esta sucursal',
};
export interface ComparedLine {
  line: BasketLine;
  quote: PriceQuote | null;
  candidate: PriceQuote | null;
  references: PriceQuote[];
  conflict: boolean;
  reason: MissingReason | null;
  amountMilli: number | null;
}
export interface ComparedBasket {
  branch: StoreBranch;
  lines: ComparedLine[];
  complete: boolean;
  coveredLines: number;
  coveredPackages: number;
  totalPackages: number;
  subtotalMilli: number | null;
}

/** Newest observation wins; a tied timestamp prefers private provenance, never a lower price. */
export function newerQuote(a: PriceQuote, b: PriceQuote): number {
  return (
    Date.parse(a.observedAt) - Date.parse(b.observedAt) ||
    Date.parse(a.recordedAt) - Date.parse(b.recordedAt) ||
    (a.source === b.source ? 0 : a.source === 'private' ? 1 : -1) ||
    a.id.localeCompare(b.id)
  );
}
export function ineligible(quote: PriceQuote, filters: BasketFilters): MissingReason | null {
  const now = filters.now ?? Date.now(),
    observed = Date.parse(quote.observedAt);
  if (
    !Number.isSafeInteger(quote.amountMilli) ||
    quote.amountMilli <= 0 ||
    quote.amountMilli > 10000000 ||
    !Number.isFinite(observed)
  )
    return 'invalid';
  if (observed > now + 60000) return 'future';
  if (
    quote.offerEndsAt &&
    (!Number.isFinite(Date.parse(quote.offerEndsAt)) || Date.parse(quote.offerEndsAt) < now)
  )
    return 'expired';
  if (filters.recentOnly && observed < now - 7 * 86400000) return 'old';
  if (!filters.includeOffers && quote.conditional) return 'conditional';
  if (filters.publicSpainOnly && quote.source === 'open_prices' && quote.countryCode !== 'ES')
    return 'country';
  return null;
}
export function compareBasket(
  basket: BasketLine[],
  branches: StoreBranch[],
  quotes: PriceQuote[],
  filters: BasketFilters,
  failedCodes: string[] = [],
): ComparedBasket[] {
  const query = fold(filters.location);
  const byCode = new Map<string, Map<string, PriceQuote>>();
  for (const quote of quotes) {
    const code = quote.barcode.padStart(14, '0');
    let references = byCode.get(code);
    if (!references) {
      references = new Map();
      byCode.set(code, references);
    }
    const previous = references.get(quote.branchKey);
    if (!previous || newerQuote(quote, previous) > 0) references.set(quote.branchKey, quote);
  }
  const failed = new Set(failedCodes.map((code) => code.padStart(14, '0')));
  return branches
    .filter((branch) => fold(`${branch.name} ${branch.address}`).includes(query))
    .map((branch) => {
      const lines: ComparedLine[] = basket.map((line) => {
        const indexed = byCode.get(line.barcode.padStart(14, '0'));
        const references = branch.references
          .map((ref) => indexed?.get(ref.key))
          .filter((quote): quote is PriceQuote => Boolean(quote))
          .sort((a, b) => newerQuote(b, a));
        const candidate = references[0] ?? null;
        let reason = candidate
          ? ineligible(candidate, filters)
          : failed.has(line.barcode.padStart(14, '0'))
            ? ('provider' as const)
            : ('missing' as const);
        const amount = candidate ? candidate.amountMilli * line.quantity : null;
        if (amount !== null && !Number.isSafeInteger(amount)) reason = 'invalid';
        return {
          line,
          candidate,
          references,
          conflict: new Set(references.map((q) => q.amountMilli)).size > 1,
          quote: reason ? null : candidate,
          reason,
          amountMilli: reason ? null : amount,
        };
      });
      const covered = lines.filter((line) => line.quote !== null);
      const subtotal = covered.reduce((sum, line) => sum + line.amountMilli!, 0);
      return {
        branch,
        lines,
        complete: lines.length > 0 && covered.length === lines.length,
        coveredLines: covered.length,
        coveredPackages: covered.reduce((sum, line) => sum + line.line.quantity, 0),
        totalPackages: basket.reduce((sum, line) => sum + line.quantity, 0),
        subtotalMilli: covered.length && Number.isSafeInteger(subtotal) ? subtotal : null,
      };
    })
    .sort(
      (a, b) =>
        Number(b.complete) - Number(a.complete) ||
        (a.complete && b.complete
          ? a.subtotalMilli! - b.subtotalMilli!
          : b.coveredLines - a.coveredLines) ||
        a.branch.id.localeCompare(b.branch.id),
    );
}
