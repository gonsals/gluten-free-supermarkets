import { BARCODE, OTHER_BARCODE, product } from '@/tests/fixtures';
import {
  compareAlternative,
  hasPositiveGlutenEvidence,
  isAlternativeGroups,
  type AlternativeGroup,
} from '../alternatives';
import { parseMeasure, perUnitMilli } from '../measure';
import { privateQuotes } from '../comparison';
import type { PriceObservation } from '../price';

const now = Date.now();
const quotes = privateQuotes([
  {
    id: 'a',
    barcode: BARCODE,
    store: 'A',
    location: 'Calle 1',
    amountMinor: 200,
    currency: 'EUR',
    observedAt: new Date(now).toISOString(),
    createdAt: new Date(now).toISOString(),
    quantity: 0.5,
    unit: 'kg',
    offerEndsAt: null,
    notes: '',
  } satisfies PriceObservation,
]);
const branch = {
  id: 'a',
  name: 'A',
  address: 'Calle 1',
  references: [{ source: 'private' as const, key: quotes[0].branchKey }],
};
const group: AlternativeGroup = {
  id: 'one',
  name: 'Arroz',
  required: parseMeasure('1', 'kg'),
  glutenFreeOnly: false,
  members: [
    { barcode: BARCODE, pack: parseMeasure('500', 'g') },
    { barcode: OTHER_BARCODE, pack: parseMeasure('750', 'g') },
  ],
};
const filters = {
  recentOnly: true,
  includeOffers: false,
  publicSpainOnly: true,
  location: '',
  now,
};
test('desembolso de envases no se sustituye por el precio por kilo', () => {
  const a = compareAlternative(group, group.members[0], [branch], quotes, filters)[0];
  const bquotes = [
    { ...quotes[0], barcode: OTHER_BARCODE, amountMilli: 2400, pack: parseMeasure('750', 'g') },
  ];
  const b = compareAlternative(group, group.members[1], [branch], bquotes, filters)[0];
  expect(a.subtotalMilli).toBe(4000);
  expect(b.subtotalMilli).toBe(4800);
  expect(perUnitMilli(a.quote!.amountMilli, group.members[0].pack)).toBe(4000);
  expect(perUnitMilli(b.quote!.amountMilli, group.members[1].pack)).toBe(3200);
});
test('excluye discrepancia de formato en la última anotación sin rescatar el precio previo', () => {
  const result = compareAlternative(
    group,
    group.members[0],
    [branch],
    [
      ...quotes,
      {
        ...quotes[0],
        id: 'new',
        observedAt: new Date(now + 1000).toISOString(),
        pack: parseMeasure('750', 'g'),
      },
    ],
    filters,
  )[0];
  expect(result.formatConflict).toBe(true);
  expect(result.subtotalMilli).toBeNull();
});
test('un precio sin formato solo usa la declaración explícita del grupo; sin precio no inventa cero', () => {
  const q = { ...quotes[0], pack: undefined };
  expect(compareAlternative(group, group.members[0], [branch], [q], filters)[0].subtotalMilli).toBe(
    4000,
  );
  expect(
    compareAlternative(group, group.members[1], [branch], [q], filters)[0].subtotalMilli,
  ).toBeNull();
});
test('el filtro positivo recalcula evidencia, conserva trazas y excluye ausencia y contradicciones', () => {
  expect(hasPositiveGlutenEvidence(null)).toBe(false);
  expect(hasPositiveGlutenEvidence({ ...product(), labels: [], allergens: [] })).toBe(false);
  expect(hasPositiveGlutenEvidence({ ...product(), allergens: ['en:gluten'] })).toBe(false);
  expect(hasPositiveGlutenEvidence({ ...product(), dataIssues: ['malformed_tags'] })).toBe(false);
  expect(hasPositiveGlutenEvidence({ ...product(), traces: ['en:gluten'] })).toBe(true);
});
test('grupos acotados, compatibles y sin GTIN equivalente repetido', () => {
  expect(isAlternativeGroups([group])).toBe(true);
  expect(
    isAlternativeGroups([
      { ...group, members: [...group.members, { ...group.members[0], barcode: '0' + BARCODE }] },
    ]),
  ).toBe(false);
  expect(isAlternativeGroups([{ ...group, required: parseMeasure('1', 'l') }])).toBe(false);
  expect(isAlternativeGroups([{ ...group, members: [] }])).toBe(false);
  expect(isAlternativeGroups(Array(21).fill(group))).toBe(false);
  expect(
    isAlternativeGroups([
      { ...group, members: [{ barcode: '3274080005004', pack: parseMeasure('1', 'kg') }] },
    ]),
  ).toBe(false);
});
test('el formato legado con decimales representables se conserva, fracciones de unidad no se usan', () => {
  const base = {
    id: 'old',
    barcode: BARCODE,
    store: 'A',
    location: 'Calle 1',
    amountMinor: 200,
    currency: 'EUR' as const,
    observedAt: new Date(now).toISOString(),
    createdAt: new Date(now).toISOString(),
    quantity: 1.001,
    unit: 'kg' as const,
    offerEndsAt: null,
    notes: '',
  };
  expect(privateQuotes([base])[0]).toMatchObject({
    packInvalid: false,
    pack: { quantity: 1001000, unit: 'kg' },
  });
  const incompatible = privateQuotes([{ ...base, unit: 'unit', quantity: 0.5 }]);
  expect(
    compareAlternative(group, group.members[0], [branch], incompatible, filters)[0].formatConflict,
  ).toBe(true);
});
