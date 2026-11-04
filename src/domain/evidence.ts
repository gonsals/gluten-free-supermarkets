import type { Product } from './product';
import { displayTag } from './display';

export interface EvidenceField {
  id: 'ingredients' | 'allergens' | 'labels' | 'traces';
  title: string;
  value: string | null;
}

// Read the normalized content, including localized/text fallbacks. Cached
// missingFields may come from an older normalizer and must not hide valid text.
export function evidenceFields(product: Product): EvidenceField[] {
  const declaredTraces = product.traces.map(displayTag).join(', ');
  const tracesText = product.tracesText
    ?.split(',')
    .map((item) => displayTag(item.trim()))
    .join(', ');
  return [
    { id: 'ingredients', title: 'Ingredientes', value: product.ingredientsText },
    {
      id: 'allergens',
      title: 'Alérgenos declarados',
      value: product.allergens.map(displayTag).join(', ') || product.allergensText || null,
    },
    { id: 'labels', title: 'Etiquetas', value: product.labels.map(displayTag).join(', ') || null },
    { id: 'traces', title: 'Trazas declaradas', value: declaredTraces || tracesText || null },
  ];
}
