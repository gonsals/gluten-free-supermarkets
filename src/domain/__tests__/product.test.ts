import {
  assessGluten,
  isProduct,
  normalizeProduct,
  refreshAssessment,
  RULES_VERSION,
} from '../product';
import { normalizeBarcode, sameGtin } from '../barcode';
import {
  isPriceObservation,
  isPriceCurrent,
  parseAmount,
  validatePrice,
  unitPrice,
  type PriceObservation,
} from '../price';
import { BARCODE, product } from '@/tests/fixtures';
import { displayTag, traceDescription } from '../display';
import { calendarDate, calendarInstant } from '../calendar';

test('las fechas de precios respetan el día local y rechazan fechas inexistentes', () => {
  const local = new Date(2026, 9, 23, 0, 15);
  expect(calendarDate(local)).toBe('2026-10-23');
  const start = new Date(calendarInstant('2026-10-23'));
  expect(start.getDate()).toBe(23);
  expect(start.getHours()).toBe(0);
  expect(new Date(calendarInstant('2026-10-23', true)).getHours()).toBe(23);
  expect(() => calendarInstant('2026-02-30')).toThrow();
});

describe('Información de gluten basada en evidencia', () => {
  test('presenta etiquetas comprensibles y no convierte en trazas una declaración de ninguna', () => {
    expect(displayTag('en:no-gluten')).toBe('Sin gluten');
    expect(traceDescription([], 'en:none')).toBeNull();
    expect(traceDescription(['en:gluten'], 'en:none')).toBe('Gluten');
  });
  test.each([
    [[], [], [], 'unknown'],
    [['en:no-gluten'], [], [], 'declared_gluten_free'],
    [['en:gluten-free'], [], [], 'declared_gluten_free'],
    [['en:certified-gluten-free'], [], [], 'declared_gluten_free'],
    [['en:contains-gluten'], [], [], 'declared_gluten'],
    [[], ['en:gluten'], [], 'declared_gluten'],
    [['en:no-gluten'], ['en:gluten'], [], 'conflicting'],
    [['en:no-gluten', 'en:contains-gluten'], [], [], 'conflicting'],
    [[], [], ['en:gluten'], 'unknown'],
    [[], ['cs:unknown-wheat-description'], [], 'unknown'],
  ])('%j + %j + %j → %s', (labels, allergens, traces, expected) => {
    expect(assessGluten(labels as string[], allergens as string[], traces as string[]).state).toBe(
      expected,
    );
  });
  test('las trazas se conservan junto a la declaración sin gluten', () => {
    expect(assessGluten(['en:no-gluten'], [], ['en:gluten']).traceWarnings).toEqual(['en:gluten']);
    expect(assessGluten(['en:no-gluten'], [], ['en:gluten']).state).toBe('declared_gluten_free');
  });
  test('normaliza ausencias sin certificar ni lanzar', () => {
    const result = normalizeProduct({}, BARCODE, 'production');
    expect(result.assessment.state).toBe('unknown');
    expect(result.name).toBeNull();
    expect(result.missingFields).toContain('labels_tags');
  });
  test('un campo malformado no se oculta detrás de una etiqueta positiva', () => {
    const result = normalizeProduct(
      { labels_tags: ['en:no-gluten'], allergens_tags: 'en:gluten' },
      BARCODE,
      'production',
    );
    expect(result.assessment.state).toBe('conflicting');
    result.assessment.rulesVersion = 'old';
    expect(refreshAssessment(result).assessment.state).toBe('conflicting');
  });
  test('valida caché, fechas, origen de imagen y versione de reglas', () => {
    expect(isProduct(product())).toBe(true);
    expect(isProduct({ ...product(), brands: [5] })).toBe(false);
    expect(isProduct({ ...product(), source: { ...product().source, fetchedAt: 'bad' } })).toBe(
      false,
    );
    expect(
      normalizeProduct({ image_url: 'http://evil.example/test' }, BARCODE, 'production').imageUrl,
    ).toBeNull();
    expect(
      normalizeProduct(
        { image_url: 'https://images.openfoodfacts.org/test.jpg' },
        BARCODE,
        'production',
      ).imageUrl,
    ).toBeTruthy();
    expect(
      refreshAssessment({
        ...product(),
        assessment: { ...product().assessment, rulesVersion: 'old' },
      }).assessment.rulesVersion,
    ).toBe(RULES_VERSION);
  });
});
describe('Códigos y precios', () => {
  test.each(['3274080005003', '036000291452', '73513537', '00036000291452'])(
    'conserva el código %s',
    (code) => expect(normalizeBarcode(code)).toBe(code),
  );
  test.each(['3274080005004', '123', 'https://example.com', 'abc3274080005003', '3274080005003/'])(
    'rechaza %s',
    (code) => expect(() => normalizeBarcode(code)).toThrow('invalid_barcode'),
  );
  test('normaliza separadores y compara GTIN equivalentes sin perder ceros', () => {
    expect(normalizeBarcode('0360 0029 1452')).toBe('036000291452');
    expect(sameGtin('036000291452', '00036000291452')).toBe(true);
  });
  test.each([
    ['2,49', 249],
    ['1.2', 120],
    ['0,05', 5],
  ])('precio exacto %s', (input, expected) => expect(parseAmount(input as string)).toBe(expected));
  test.each(['0', '-1', 'NaN', '2,345', '1e3', 'Infinity'])('rechaza precio %s', (value) =>
    expect(() => parseAmount(value)).toThrow(),
  );
  const price: PriceObservation = {
    id: 'test-id-001',
    barcode: BARCODE,
    store: 'Tienda',
    location: 'Sucursal',
    amountMinor: 249,
    currency: 'EUR',
    observedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    quantity: 0.5,
    unit: 'kg',
    notes: '',
    offerEndsAt: null,
  };
  test('compara unidades y distingue observaciones antiguas', () => {
    expect(unitPrice(price)).toBe(498);
    expect(isPriceCurrent(price)).toBe(true);
    expect(
      isPriceCurrent({ ...price, observedAt: new Date(Date.now() - 8 * 86400000).toISOString() }),
    ).toBe(false);
  });
  test('valida importes y ofertas antes de persistir', () => {
    expect(() => validatePrice({ ...price, amountMinor: Infinity })).toThrow();
    expect(() => validatePrice({ ...price, offerEndsAt: '2000-01-01' })).toThrow();
    expect(() => validatePrice({ ...price, quantity: -1 })).toThrow();
  });
  test('rechaza precios persistidos malformados conservando observaciones históricas válidas', () => {
    expect(isPriceObservation({ ...price, observedAt: '2020-01-01T00:00:00Z' })).toBe(true);
    expect(isPriceObservation({ ...price, notes: { unexpected: true } })).toBe(false);
    expect(isPriceObservation({ ...price, unit: null })).toBe(false);
    expect(isPriceObservation({ ...price, observedAt: 'fecha inválida' })).toBe(false);
  });
});
