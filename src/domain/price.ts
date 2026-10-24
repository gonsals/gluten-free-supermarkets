import { record } from './product';

export interface PriceObservation {
  id: string;
  barcode: string;
  store: string;
  location: string;
  amountMinor: number;
  currency: 'EUR';
  observedAt: string;
  createdAt: string;
  quantity: number | null;
  unit: 'kg' | 'l' | 'unit' | null;
  offerEndsAt: string | null;
  notes: string;
}
/** Validate persisted/remote records without expiring historical observations. */
export function isPriceObservation(value: unknown): value is PriceObservation {
  return (
    record(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    value.id.length <= 250 &&
    typeof value.barcode === 'string' &&
    /^(?:\d{8}|\d{12,14})$/.test(value.barcode) &&
    typeof value.store === 'string' &&
    value.store.trim().length > 0 &&
    value.store.length <= 100 &&
    typeof value.location === 'string' &&
    value.location.trim().length > 0 &&
    value.location.length <= 150 &&
    typeof value.amountMinor === 'number' &&
    Number.isSafeInteger(value.amountMinor) &&
    value.amountMinor > 0 &&
    value.amountMinor <= 1000000 &&
    value.currency === 'EUR' &&
    typeof value.observedAt === 'string' &&
    Number.isFinite(Date.parse(value.observedAt)) &&
    typeof value.createdAt === 'string' &&
    Number.isFinite(Date.parse(value.createdAt)) &&
    typeof value.notes === 'string' &&
    value.notes.length <= 500 &&
    ((value.quantity === null && value.unit === null) ||
      (typeof value.quantity === 'number' &&
        Number.isFinite(value.quantity) &&
        value.quantity > 0 &&
        value.quantity <= 10000 &&
        ['kg', 'l', 'unit'].includes(String(value.unit)))) &&
    (value.offerEndsAt === null ||
      (typeof value.offerEndsAt === 'string' &&
        Number.isFinite(Date.parse(value.offerEndsAt)) &&
        Date.parse(value.offerEndsAt) >= Date.parse(value.observedAt)))
  );
}
export function parseAmount(input: string): number {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(normalized))
    throw new Error('Introduce un precio válido, por ejemplo 2,49.');
  const [whole, cents = ''] = normalized.split('.');
  const amount = Number(whole) * 100 + Number(cents.padEnd(2, '0'));
  if (amount <= 0 || amount > 1000000)
    throw new Error('El precio debe ser mayor que cero y no superar 10.000 €.');
  return amount;
}
export function validatePrice(price: PriceObservation): void {
  if (
    !price.store.trim() ||
    price.store.length > 100 ||
    !price.location.trim() ||
    price.location.length > 150 ||
    !Number.isSafeInteger(price.amountMinor) ||
    price.amountMinor <= 0 ||
    price.amountMinor > 1000000 ||
    price.currency !== 'EUR' ||
    price.notes.length > 500
  )
    throw new Error('Revisa tienda, localidad e importe.');
  const observed = Date.parse(price.observedAt);
  if (
    !Number.isFinite(observed) ||
    observed > Date.now() + 60000 ||
    observed < Date.now() - 365 * 86400000
  )
    throw new Error('La observación debe ser de los últimos 12 meses y no puede ser futura.');
  if (
    price.quantity !== null &&
    (!Number.isFinite(price.quantity) ||
      price.quantity <= 0 ||
      price.quantity > 10000 ||
      !price.unit)
  )
    throw new Error('La cantidad debe ser positiva y tener una unidad.');
  if (price.quantity === null && price.unit !== null)
    throw new Error('Indica la cantidad para comparar por unidad.');
  if (
    price.offerEndsAt &&
    (!Number.isFinite(Date.parse(price.offerEndsAt)) || Date.parse(price.offerEndsAt) < observed)
  )
    throw new Error('La oferta debe terminar después de la fecha de observación.');
}
export function unitPrice(price: PriceObservation): number | null {
  return price.quantity ? price.amountMinor / price.quantity : null;
}
export function money(amountMinor: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
    amountMinor / 100,
  );
}
export function isPriceCurrent(price: PriceObservation, now = Date.now()): boolean {
  return (
    now - Date.parse(price.observedAt) <= 7 * 86400000 &&
    (!price.offerEndsAt || Date.parse(price.offerEndsAt) >= now)
  );
}
