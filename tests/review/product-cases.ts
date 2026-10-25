import type { GlutenState } from '@/src/domain/product';

// Synthetic contract examples for technical review, not medical approval.
export const productReviewCases: {
  id: string;
  focus: string;
  raw: Record<string, unknown>;
  expected: GlutenState;
  traces: string[];
  queriedAt?: string;
}[] = [
  { id: 'G-01', focus: 'Todos los campos ausentes', raw: {}, expected: 'unknown', traces: [] },
  {
    id: 'G-02',
    focus: 'Declaración sin gluten atribuida a la fuente',
    raw: { labels_tags: ['en:no-gluten'], ingredients_text: 'Arroz' },
    expected: 'declared_gluten_free',
    traces: [],
  },
  {
    id: 'G-03',
    focus: 'Gluten explícito',
    raw: { allergens_tags: ['en:gluten'] },
    expected: 'declared_gluten',
    traces: [],
  },
  {
    id: 'G-04',
    focus: 'Declaraciones incompatibles',
    raw: { labels_tags: ['en:no-gluten'], allergens_tags: ['en:gluten'] },
    expected: 'conflicting',
    traces: [],
  },
  {
    id: 'G-05',
    focus: 'Solo trazas',
    raw: { traces_tags: ['en:gluten'] },
    expected: 'unknown',
    traces: ['en:gluten'],
  },
  {
    id: 'G-06',
    focus: 'Declaración sin gluten y trazas simultáneas',
    raw: { labels_tags: ['en:no-gluten'], traces_tags: ['en:gluten'] },
    expected: 'declared_gluten_free',
    traces: ['en:gluten'],
  },
  {
    id: 'G-07',
    focus: 'Alérgenos con formato incorrecto',
    raw: { labels_tags: ['en:no-gluten'], allergens_tags: 'en:gluten' },
    expected: 'conflicting',
    traces: [],
  },
  {
    id: 'G-08',
    focus: 'Jerarquía de etiquetas con formato incorrecto',
    raw: { labels_tags: ['en:no-gluten'], labels_hierarchy: 'en:no-gluten' },
    expected: 'conflicting',
    traces: [],
  },
  {
    id: 'G-09',
    focus: 'Ingredientes locales y etiquetas de jerarquía',
    raw: { ingredients_text_es: 'Arroz y sal', labels_hierarchy: ['en:no-gluten'] },
    expected: 'declared_gluten_free',
    traces: [],
  },
  {
    id: 'G-10',
    focus: 'Texto sin taxonomía conservado sin inferencia',
    raw: { allergens: 'Texto original pendiente de interpretación' },
    expected: 'unknown',
    traces: [],
  },
  {
    id: 'G-11',
    focus: 'La fuente declara ninguna traza, sin declarar gluten',
    raw: { traces_tags: ['en:none'] },
    expected: 'unknown',
    traces: [],
  },
  {
    id: 'G-12',
    focus: 'Ficha guardada antigua, sin convertir la fecha en certificación',
    raw: { labels_tags: ['en:no-gluten'] },
    expected: 'declared_gluten_free',
    traces: [],
    queriedAt: '2024-10-25T08:00:00.000Z',
  },
];
