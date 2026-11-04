export type MeasureUnit = 'kg' | 'l' | 'unit';
export type InputUnit = MeasureUnit | 'g' | 'ml';
/** Integer millionths of kg, litre or item. Never compare different dimensions. */
export interface Measure {
  quantity: number;
  unit: MeasureUnit;
}
export const SCALE = 1000000;
export function isMeasure(value: unknown): value is Measure {
  if (!value || typeof value !== 'object') return false;
  const m = value as Measure;
  return (
    Number.isSafeInteger(m.quantity) &&
    m.quantity > 0 &&
    m.quantity <= 10000 * SCALE &&
    ['kg', 'l', 'unit'].includes(m.unit) &&
    (m.unit !== 'unit' || m.quantity % SCALE === 0)
  );
}
export function parseMeasure(text: string, unit: InputUnit, count = '1'): Measure {
  const input = text.trim().replace(',', '.');
  if (!/^\d{1,8}(\.\d{1,6})?$/.test(input) || !/^\d{1,2}$/.test(count) || +count < 1 || +count > 99)
    throw new Error('Indica una cantidad positiva y entre 1 y 99 componentes del pack.');
  const [whole, decimal = ''] = input.split('.');
  const raw = (BigInt(whole) * BigInt(SCALE) + BigInt(decimal.padEnd(6, '0'))) * BigInt(count);
  const divisor = unit === 'g' || unit === 'ml' ? 1000n : 1n;
  if (raw % divisor !== 0n) throw new Error('La cantidad requiere más precisión de la admitida.');
  const quantity = Number(raw / divisor);
  const measure: Measure = { quantity, unit: unit === 'g' ? 'kg' : unit === 'ml' ? 'l' : unit };
  if (!isMeasure(measure))
    throw new Error(
      'Cantidad fuera de rango o precisión no admitida. Las unidades deben ser enteras.',
    );
  return measure;
}
export function measureText(m: Measure): string {
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 6 }).format(m.quantity / SCALE)} ${m.unit === 'unit' ? 'unidades' : m.unit}`;
}
/** Half-up rounding for display only; package totals never use this rounded value. */
export function perUnitMilli(amountMilli: number, measure: Measure): number {
  if (!isMeasure(measure) || !Number.isSafeInteger(amountMilli) || amountMilli <= 0)
    throw new Error('invalid_measure');
  const n = BigInt(amountMilli) * BigInt(SCALE),
    d = BigInt(measure.quantity);
  return Number((n * 2n + d) / (d * 2n));
}
export function requiredPackages(need: Measure, pack: Measure) {
  if (!isMeasure(need) || !isMeasure(pack) || need.unit !== pack.unit) return null;
  const packages = Math.floor((need.quantity - 1) / pack.quantity) + 1;
  return {
    packages,
    surplus: { quantity: packages * pack.quantity - need.quantity, unit: need.unit },
  };
}
