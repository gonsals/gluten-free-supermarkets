const NAMES: Record<string, string> = {
  'en:no-gluten': 'Sin gluten',
  'en:gluten-free': 'Sin gluten',
  'en:contains-gluten': 'Contiene gluten',
  'en:certified-gluten-free': 'Certificación sin gluten declarada en la fuente',
  'en:crossed-grain-trademark': 'Espiga barrada declarada en la fuente',
  'en:gluten': 'Gluten',
  'en:wheat': 'Trigo',
  'en:barley': 'Cebada',
  'en:rye': 'Centeno',
  'en:oats': 'Avena',
  'en:milk': 'Leche',
  'en:eggs': 'Huevo',
  'en:nuts': 'Frutos de cáscara',
  'en:soybeans': 'Soja',
  'en:peanuts': 'Cacahuetes',
  'en:organic': 'Ecológico',
  'en:vegan': 'Vegano',
  'en:vegetarian': 'Vegetariano',
  'en:no-milk': 'Sin leche',
  'en:none': 'Ninguno declarado en la fuente',
  'en:no': 'Ninguno declarado en la fuente',
};
export function displayTag(tag: string): string {
  return NAMES[tag] ?? tag.replace(/^[a-z]{2}:/, '').replaceAll('-', ' ');
}
export function traceDescription(tags: string[], original: string | null): string | null {
  if (tags.length) return tags.map(displayTag).join(', ');
  if (
    !original ||
    ['en:none', 'en:no', 'none', 'aucun', 'ninguno', 'no'].includes(original.trim().toLowerCase())
  )
    return null;
  return original
    .split(',')
    .map((item) => displayTag(item.trim()))
    .join(', ');
}
