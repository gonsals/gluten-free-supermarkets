import { normalizeStores } from './stores';

export const PRODUCT_SCHEMA = 1;
export const RULES_VERSION = '1.0.0';
export type GlutenState = 'declared_gluten_free' | 'declared_gluten' | 'unknown' | 'conflicting';
export interface GlutenAssessment {
  state: GlutenState;
  reasons: string[];
  traceWarnings: string[];
  rulesVersion: string;
}
export interface Product {
  barcode: string;
  name: string | null;
  brands: string[];
  stores?: string[];
  imageUrl: string | null;
  ingredientsText: string | null;
  allergensText: string | null;
  tracesText: string | null;
  labels: string[];
  allergens: string[];
  traces: string[];
  missingFields: string[];
  dataIssues: string[];
  source: {
    provider: 'open_food_facts';
    url: string;
    fetchedAt: string;
    updatedAt: string | null;
    environment: 'staging' | 'production';
    restoredAt?: string;
  };
  assessment: GlutenAssessment;
  schemaVersion: number;
}
export const glutenCopy: Record<
  GlutenState,
  {
    title: string;
    description: string;
    icon: 'checkmark-circle' | 'warning' | 'help-circle' | 'alert-circle';
  }
> = {
  declared_gluten_free: {
    title: 'Figura como sin gluten',
    description:
      'La fuente recoge una declaración sin gluten. Comprueba que coincide con el envase que tienes.',
    icon: 'checkmark-circle',
  },
  declared_gluten: {
    title: 'Gluten declarado',
    description:
      'La fuente incluye una declaración explícita de gluten. Revisa los datos y el envase.',
    icon: 'alert-circle',
  },
  unknown: {
    title: 'Información insuficiente',
    description: 'Los datos disponibles no permiten confirmar una declaración sobre gluten.',
    icon: 'help-circle',
  },
  conflicting: {
    title: 'Datos contradictorios',
    description:
      'Hay información incompatible o incompleta. Revisa el etiquetado y consulta al fabricante.',
    icon: 'warning',
  },
};
export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function text(value: unknown, limit = 12000): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, limit) : null;
}
function tags(value: unknown): string[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value
            .filter((x): x is string => typeof x === 'string')
            .map((x) => x.trim().toLowerCase().slice(0, 200))
            .filter(Boolean),
        ),
      ].slice(0, 150)
    : [];
}
const FREE = new Set([
  'en:no-gluten',
  'en:gluten-free',
  'en:certified-gluten-free',
  'en:crossed-grain-trademark',
  'en:gfco-gluten-free',
]);
export function assessGluten(
  labels: string[],
  allergens: string[],
  traces: string[],
  malformed = false,
): GlutenAssessment {
  const free = labels.some((x) => FREE.has(x));
  const contains = labels.includes('en:contains-gluten') || allergens.includes('en:gluten');
  const state: GlutenState =
    free && (contains || malformed)
      ? 'conflicting'
      : contains
        ? 'declared_gluten'
        : free
          ? 'declared_gluten_free'
          : 'unknown';
  const reasons: string[] = [];
  if (free) reasons.push('La fuente incluye una etiqueta de declaración sin gluten.');
  if (contains) reasons.push('La fuente declara gluten en etiquetas o alérgenos.');
  if (malformed) reasons.push('Algunos campos recibidos no tienen el formato esperado.');
  if (!free && !contains)
    reasons.push('No hay una declaración concluyente en los campos interpretados.');
  return {
    state,
    reasons,
    traceWarnings: traces.filter((x) => !['en:none', 'en:no'].includes(x)),
    rulesVersion: RULES_VERSION,
  };
}
function safeImage(value: unknown): string | null {
  try {
    const url = new URL(typeof value === 'string' ? value : '');
    return url.protocol === 'https:' && /(^|\.)openfoodfacts\.(org|net)$/.test(url.hostname)
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
export function normalizeProduct(
  raw: unknown,
  barcode: string,
  environment: 'staging' | 'production',
  now = new Date(),
): Product {
  if (!record(raw)) throw new Error('invalid_response');
  const ingredientsText = text(raw.ingredients_text_es) ?? text(raw.ingredients_text);
  const missingFields = ['labels_tags', 'allergens_tags', 'traces_tags', 'ingredients_text'].filter(
    (k) =>
      k === 'ingredients_text'
        ? ingredientsText === null
        : k === 'labels_tags'
          ? raw.labels_tags == null && raw.labels_hierarchy == null
          : raw[k] == null,
  );
  const malformed = ['labels_tags', 'labels_hierarchy', 'allergens_tags', 'traces_tags'].some(
    (k) =>
      raw[k] != null &&
      (!Array.isArray(raw[k]) || (raw[k] as unknown[]).some((x) => typeof x !== 'string')),
  );
  const labels = tags([
    ...(Array.isArray(raw.labels_tags) ? raw.labels_tags : []),
    ...(Array.isArray(raw.labels_hierarchy) ? raw.labels_hierarchy : []),
  ]);
  const allergens = tags(raw.allergens_tags);
  const traces = tags(raw.traces_tags);
  const timestamp =
    typeof raw.last_modified_t === 'number' &&
    raw.last_modified_t > 0 &&
    raw.last_modified_t * 1000 <= now.getTime()
      ? new Date(raw.last_modified_t * 1000).toISOString()
      : null;
  return {
    barcode,
    name: text(raw.product_name_es, 300) ?? text(raw.product_name, 300),
    brands: (text(raw.brands, 500) ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
    stores: normalizeStores(raw.stores, raw.stores_tags),
    imageUrl: safeImage(raw.image_front_url ?? raw.image_url),
    ingredientsText,
    allergensText: text(raw.allergens, 2000),
    tracesText: text(raw.traces, 2000),
    labels,
    allergens,
    traces,
    missingFields,
    dataIssues: malformed ? ['malformed_tags'] : [],
    source: {
      provider: 'open_food_facts',
      url: `https://world.openfoodfacts.${environment === 'production' ? 'org' : 'net'}/product/${barcode}`,
      fetchedAt: now.toISOString(),
      updatedAt: timestamp,
      environment,
    },
    assessment: assessGluten(labels, allergens, traces, malformed),
    schemaVersion: PRODUCT_SCHEMA,
  };
}
export function isProduct(value: unknown): value is Product {
  if (
    !record(value) ||
    value.schemaVersion !== PRODUCT_SCHEMA ||
    typeof value.barcode !== 'string' ||
    !record(value.source) ||
    !record(value.assessment)
  )
    return false;
  const strings = (input: unknown) =>
    Array.isArray(input) &&
    input.length <= 200 &&
    input.every((x) => typeof x === 'string' && x.length <= 2000);
  const nullableText = (input: unknown, max: number) =>
    input === null || (typeof input === 'string' && input.length <= max);
  return (
    /^\d{8}$|^\d{12,14}$/.test(value.barcode) &&
    nullableText(value.name, 300) &&
    nullableText(value.ingredientsText, 12000) &&
    nullableText(value.allergensText, 2000) &&
    nullableText(value.tracesText, 2000) &&
    (value.imageUrl === null || safeImage(value.imageUrl) !== null) &&
    strings(value.labels) &&
    strings(value.allergens) &&
    strings(value.traces) &&
    strings(value.brands) &&
    (value.stores === undefined ||
      (Array.isArray(value.stores) &&
        value.stores.length <= 20 &&
        value.stores.every(
          (store) => typeof store === 'string' && store.trim().length > 0 && store.length <= 100,
        ))) &&
    strings(value.missingFields) &&
    strings(value.dataIssues) &&
    typeof value.source.fetchedAt === 'string' &&
    Number.isFinite(Date.parse(value.source.fetchedAt)) &&
    (value.source.restoredAt === undefined ||
      (typeof value.source.restoredAt === 'string' &&
        Number.isFinite(Date.parse(value.source.restoredAt)))) &&
    typeof value.source.url === 'string' &&
    /^https:\/\/world\.openfoodfacts\.(org|net)\/product\/\d+$/.test(value.source.url) &&
    ['production', 'staging'].includes(String(value.source.environment)) &&
    (value.source.updatedAt === null ||
      (typeof value.source.updatedAt === 'string' &&
        Number.isFinite(Date.parse(value.source.updatedAt)))) &&
    typeof value.assessment.state === 'string' &&
    Object.hasOwn(glutenCopy, value.assessment.state) &&
    typeof value.assessment.rulesVersion === 'string' &&
    strings(value.assessment.reasons) &&
    strings(value.assessment.traceWarnings)
  );
}
export function refreshAssessment(product: Product): Product {
  return product.assessment.rulesVersion === RULES_VERSION
    ? product
    : {
        ...product,
        assessment: assessGluten(
          product.labels,
          product.allergens,
          product.traces,
          product.dataIssues.length > 0,
        ),
      };
}
