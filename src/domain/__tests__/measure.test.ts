import { parseMeasure, perUnitMilli, requiredPackages, SCALE } from '../measure';

test('normaliza gramos, mililitros y multipacks sin perder precisión', () => {
  expect(parseMeasure('330', 'ml', '6')).toEqual({ quantity: 1980000, unit: 'l' });
  expect(parseMeasure('0,125', 'kg', '3')).toEqual(parseMeasure('375', 'g'));
  expect(parseMeasure('0.001', 'g')).toEqual({ quantity: 1, unit: 'kg' });
  expect(parseMeasure('0.0003', 'ml', '10')).toEqual({ quantity: 3, unit: 'l' });
  expect(parseMeasure('6', 'unit', '2')).toEqual({ quantity: 12 * SCALE, unit: 'unit' });
});
test.each(['0', '-1', '1e2', 'NaN', 'Infinity', '', '0.0000001', '10001'])(
  'rechaza cantidad inválida %s',
  (s) => {
    expect(() => parseMeasure(s, 'kg')).toThrow();
  },
);
test('no mezcla dimensiones, admite solo unidades enteras y acota packs', () => {
  expect(requiredPackages(parseMeasure('1', 'kg'), parseMeasure('1', 'l'))).toBeNull();
  expect(() => parseMeasure('0.5', 'unit')).toThrow();
  expect(() => parseMeasure('1', 'l', '100')).toThrow();
  expect(() => parseMeasure('1', 'l', '0')).toThrow();
  expect(() => parseMeasure('1', 'l', '1.5')).toThrow();
  expect(() => parseMeasure('0.0001', 'ml')).toThrow();
});
test('redondea solo el precio unitario y compra envases enteros con sobrante explícito', () => {
  expect(perUnitMilli(1000, parseMeasure('3', 'kg'))).toBe(333);
  expect(perUnitMilli(1, parseMeasure('2', 'kg'))).toBe(1);
  expect(requiredPackages(parseMeasure('1', 'kg'), parseMeasure('750', 'g'))).toEqual({
    packages: 2,
    surplus: { quantity: 500000, unit: 'kg' },
  });
  expect(requiredPackages(parseMeasure('1.98', 'l'), parseMeasure('330', 'ml', '6'))).toEqual({
    packages: 1,
    surplus: { quantity: 0, unit: 'l' },
  });
});
