import { normalizeBarcode } from './barcode';
import { record } from './product';

export const MAX_BASKET_LINES = 100;
export const MAX_BASKET_QUANTITY = 99;
export interface BasketLine {
  barcode: string;
  name: string | null;
  quantity: number;
  addedAt: string;
}
export function validBasketQuantity(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= MAX_BASKET_QUANTITY;
}
export function isBasket(value: unknown): value is BasketLine[] {
  if (!Array.isArray(value) || value.length > MAX_BASKET_LINES) return false;
  const codes = new Set<string>();
  return value.every((line) => {
    if (!record(line)) return false;
    try {
      if (typeof line.barcode !== 'string' || normalizeBarcode(line.barcode) !== line.barcode)
        return false;
    } catch {
      return false;
    }
    const identity = line.barcode.padStart(14, '0');
    if (codes.has(identity)) return false;
    codes.add(identity);
    return (
      validBasketQuantity(line.quantity) &&
      (line.name === null || (typeof line.name === 'string' && line.name.length <= 300)) &&
      typeof line.addedAt === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(line.addedAt) &&
      Number.isFinite(Date.parse(line.addedAt)) &&
      new Date(line.addedAt).toISOString().slice(0, 19) === line.addedAt.slice(0, 19)
    );
  });
}
