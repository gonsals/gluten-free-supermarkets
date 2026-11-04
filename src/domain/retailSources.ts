import { fold } from './comparison';

export type Retailer = 'mercadona' | 'aldi' | 'lidl' | 'dia' | 'caprabo' | 'ametller';
export interface RetailJob {
  retailer: Retailer;
  group: string;
  url: string;
}
export const retailerNames: Record<Retailer, string> = {
  mercadona: 'Mercadona',
  aldi: 'Aldi',
  lidl: 'Lidl',
  dia: 'DIA',
  caprabo: 'Caprabo',
  ametller: 'Ametller Origen',
};
export const retailerHosts: Record<Retailer, string> = {
  mercadona: 'tienda.mercadona.es',
  aldi: 'www.aldi.es',
  lidl: 'www.lidl.es',
  dia: 'www.dia.es',
  caprabo: 'www.capraboacasa.com',
  ametller: 'www.ametllerorigen.com',
};
const families = {
  eggs: /huevo|clara|\bous?\b/,
  milk: /leche|llet|bebida vegetal|avena|soja/,
  rice: /arroz|arros/,
  pasta: /pasta|macarron|espagueti|spaghetti|fideo/,
  oil: /aceite|\boli\b|vinagre/,
  fruit:
    /fruta|fruita|manzana|poma|platano|platan|naranja|taronja|mandarina|pera|kiwi|aguacate|limon|uva/,
  vegetables:
    /verdura|patata|tomate|tomaquet|cebolla|ceba|zanahoria|pastanaga|calabac|brocoli|champinon|berenjena|coliflor/,
  chicken: /pollo|pollastre|pavo/,
  bread: /\bpan\b|\bpa\b/,
};
type Family = keyof typeof families;
const pages: [Retailer, Family, string][] = [
  ['dia', 'eggs', '/huevos-leche-y-mantequilla/huevos/c/L2055'],
  ['dia', 'milk', '/huevos-leche-y-mantequilla/leche/c/L2051'],
  ['dia', 'rice', '/arroz-pastas-y-legumbres/arroz/c/L2042'],
  ['dia', 'pasta', '/arroz-pastas-y-legumbres/macarrones-espaguetis-y-pastas-secas/c/L2044'],
  ['dia', 'oil', '/aceites-salsas-y-especias/aceites/c/L2046'],
  ['dia', 'fruit', '/frutas/c/L105'],
  ['dia', 'vegetables', '/verduras/c/L104'],
  ['dia', 'chicken', '/carnes/pollo/c/L2202'],
  ['dia', 'bread', '/panaderia/c/L112'],
  ['caprabo', 'eggs', '/es/supermercado/2059698-frescos/2059760-huevos/'],
  [
    'caprabo',
    'milk',
    '/es/supermercado/2059806-alimentacion/2059807-leche-batidos-y-bebidas-vegetales/',
  ],
  [
    'caprabo',
    'rice',
    '/es/supermercado/2059806-alimentacion/2060029-legumbres-arroz-y-pasta/2060032-arroz/',
  ],
  [
    'caprabo',
    'oil',
    '/es/supermercado/2059806-alimentacion/2059988-aceite-vinagre-sal-harina-y-pan-rallado/',
  ],
  ['caprabo', 'fruit', '/es/supermercado/2059698-frescos/2059699-frutas/'],
  ['caprabo', 'vegetables', '/es/supermercado/2059698-frescos/2059710-verduras-y-hortalizas/'],
  ['caprabo', 'chicken', '/es/supermercado/2059698-frescos/2059746-carnes-y-aves/2059753-pollo/'],
  ['caprabo', 'bread', '/es/supermercado/2059698-frescos/2059783-panaderia-y-pasteleria/'],
  ['ametller', 'eggs', '/es/lacteos-y-huevos/huevos-frescos'],
  ['ametller', 'milk', '/es/lacteos-y-huevos/leche-y-batidos'],
  ['ametller', 'rice', '/es/despensa/arroz-legumbres-y-cereales'],
  ['ametller', 'pasta', '/es/despensa/pasta-seca'],
  ['ametller', 'oil', '/es/despensa/aceite-vinagre-sal-y-especias'],
  ['ametller', 'fruit', '/es/fruta'],
  ['ametller', 'vegetables', '/es/verdura'],
  ['ametller', 'chicken', '/es/carne-envasada/pollo-pavo-y-conejo'],
];
export const retailStore = (value: string): string =>
  fold(value)
    .replace(/\blidel\b/g, 'lidl')
    .replace(/\bdia\b/g, 'dia')
    .replace(/\besclat\b/g, 'bonpreu')
    .replace(/\b(?:barcelona|bcn)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
export function categoryPages(query?: string): RetailJob[] {
  return pages
    .filter(([, family]) => query === undefined || families[family].test(fold(query)))
    .map(([retailer, family, path]) => ({
      retailer,
      group: `category:${family}`,
      url: `https://${retailerHosts[retailer]}${path}`,
    }));
}
export function knownRetailGroup(retailer: Retailer, group: string): boolean {
  if (retailer === 'mercadona') return /^category:\d+(?:@bcn1)?$/.test(group);
  if (retailer === 'aldi' || retailer === 'lidl') return group === 'weekly';
  return categoryPages().some((p) => p.retailer === retailer && p.group === group);
}
export const externalBarcelonaStores = [
  { name: 'Bonpreu / Esclat', url: 'https://www.compraonline.bonpreuesclat.cat/' },
  { name: 'Condis', url: 'https://compraonline.condis.es/' },
  { name: 'Consum', url: 'https://tienda.consum.es/es' },
  { name: 'Carrefour', url: 'https://www.carrefour.es/supermercado/' },
  { name: 'Alcampo', url: 'https://www.compraonline.alcampo.es/' },
];
