import { normalizeBarcode } from './barcode';
import { isMeasure, requiredPackages, type Measure } from './measure';
import { assessGluten, record, type Product } from './product';
import { compareBasket, type BasketFilters } from './basketComparison';
import type { PriceQuote } from './comparison';
import type { StoreBranch } from './branches';

export interface AlternativeMember {
  barcode: string;
  pack: Measure;
}
export interface AlternativeGroup {
  id: string;
  name: string;
  required: Measure;
  members: AlternativeMember[];
  glutenFreeOnly: boolean;
}
export const MAX_GROUPS = 20;
export function isAlternativeGroups(value: unknown): value is AlternativeGroup[] {
  if (!Array.isArray(value) || value.length > MAX_GROUPS) return false;
  const ids = new Set<string>();
  return value.every((g: unknown) => {
    if (
      !record(g) ||
      typeof g.id !== 'string' ||
      !/^[\w-]{1,100}$/.test(g.id) ||
      ids.has(g.id) ||
      typeof g.name !== 'string' ||
      !g.name.trim() ||
      g.name.length > 100 ||
      !isMeasure(g.required) ||
      typeof g.glutenFreeOnly !== 'boolean' ||
      !Array.isArray(g.members) ||
      g.members.length < 1 ||
      g.members.length > 10
    )
      return false;
    ids.add(g.id);
    const codes = new Set<string>();
    return g.members.every((m: unknown) => {
      if (
        !record(m) ||
        typeof m.barcode !== 'string' ||
        !isMeasure(m.pack) ||
        m.pack.unit !== (g.required as Measure).unit
      )
        return false;
      try {
        if (normalizeBarcode(m.barcode) !== m.barcode) return false;
      } catch {
        return false;
      }
      const code = m.barcode.padStart(14, '0');
      if (codes.has(code)) return false;
      codes.add(code);
      return true;
    });
  });
}
export function hasPositiveGlutenEvidence(product: Product | null): boolean {
  return Boolean(
    product &&
    assessGluten(product.labels, product.allergens, product.traces, product.dataIssues.length > 0)
      .state === 'declared_gluten_free',
  );
}
export function compareAlternative(
  group: AlternativeGroup,
  member: AlternativeMember,
  branches: StoreBranch[],
  quotes: PriceQuote[],
  filters: BasketFilters,
) {
  const requirement = requiredPackages(group.required, member.pack);
  if (!requirement || requirement.packages > 99) return [];
  return compareBasket(
    [
      {
        barcode: member.barcode,
        quantity: requirement.packages,
        name: null,
        addedAt: new Date(filters.now ?? Date.now()).toISOString(),
      },
    ],
    branches,
    quotes,
    filters,
  )
    .map((result) => {
      const quote = result.lines[0].quote;
      // Explicit pack declarations cannot silently override a contradictory recorded pack.
      const mismatch =
        quote?.packInvalid ||
        (quote?.pack &&
          (quote.pack.unit !== member.pack.unit || quote.pack.quantity !== member.pack.quantity));
      return {
        ...result,
        complete: mismatch ? false : result.complete,
        coveredLines: mismatch ? 0 : result.coveredLines,
        coveredPackages: mismatch ? 0 : result.coveredPackages,
        formatConflict: Boolean(mismatch),
        subtotalMilli: mismatch ? null : result.subtotalMilli,
        quote: mismatch ? null : quote,
      };
    })
    .sort(
      (a, b) =>
        (a.subtotalMilli === null ? 1 : 0) - (b.subtotalMilli === null ? 1 : 0) ||
        (a.subtotalMilli ?? 0) - (b.subtotalMilli ?? 0) ||
        a.branch.id.localeCompare(b.branch.id),
    );
}
