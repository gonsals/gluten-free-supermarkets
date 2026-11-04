import { record } from './product';
import { privateReferenceKey, type PriceQuote } from './comparison';

export interface BranchReference {
  key: string;
  source: PriceQuote['source'];
}
export interface StoreBranch {
  id: string;
  name: string;
  address: string;
  references: BranchReference[];
}
export const MAX_BRANCHES = 50;
export function referenceOf(quote: PriceQuote): BranchReference {
  return { key: quote.branchKey, source: quote.source };
}
export function isBranchReference(value: unknown): value is BranchReference {
  if (!record(value) || typeof value.key !== 'string' || value.key.length > 550) return false;
  if (value.source === 'open_prices') return /^open_prices:[1-9]\d{0,15}$/.test(value.key);
  if (value.source !== 'private' || !value.key.startsWith('private:')) return false;
  try {
    const parts: unknown = JSON.parse(value.key.slice(8));
    return (
      Array.isArray(parts) &&
      parts.length === 2 &&
      parts.every((part) => typeof part === 'string' && part.trim().length > 0) &&
      parts[0].length <= 100 &&
      parts[1].length <= 150 &&
      privateReferenceKey(parts[0], parts[1]) === value.key
    );
  } catch {
    return false;
  }
}
export function isBranches(value: unknown): value is StoreBranch[] {
  if (!Array.isArray(value) || value.length > MAX_BRANCHES) return false;
  const ids = new Set<string>(),
    references = new Set<string>();
  return value.every((branch) => {
    if (
      !record(branch) ||
      typeof branch.id !== 'string' ||
      !/^[\w-]{1,100}$/.test(branch.id) ||
      ids.has(branch.id) ||
      typeof branch.name !== 'string' ||
      !branch.name.trim() ||
      branch.name.length > 100 ||
      typeof branch.address !== 'string' ||
      !branch.address.trim() ||
      branch.address.length > 200 ||
      !Array.isArray(branch.references) ||
      branch.references.length > 20
    )
      return false;
    ids.add(branch.id);
    return branch.references.every((ref) => {
      if (!isBranchReference(ref) || references.has(ref.key)) return false;
      references.add(ref.key);
      return true;
    });
  });
}
export function referenceLabel(reference: BranchReference): string {
  if (reference.source === 'open_prices')
    return `Open Prices · ubicación ${reference.key.slice(12)}`;
  try {
    return (JSON.parse(reference.key.slice(8)) as string[]).join(' · ');
  } catch {
    return reference.key;
  }
}
