import type { Retailer } from './retailSources';

type Provider = Retailer | 'open_prices';
const rules: Record<Provider, { host: string; path: RegExp; parameters?: Record<string, RegExp> }> =
  {
    mercadona: {
      host: 'prod-mercadona.imgix.net',
      path: /^\/images\/[\w/-]+\.(?:jpg|jpeg|png|webp)$/,
      parameters: { fit: /^(?:crop|clip|max)$/, h: /^\d{1,3}$/, w: /^\d{1,3}$/, auto: /^format$/ },
    },
    aldi: {
      host: 's7g10.scene7.com',
      path: /^\/is\/image\/aldinord\/[\w-]+$/,
      parameters: { wid: /^\d{1,3}$/, hei: /^\d{1,3}$/ },
    },
    lidl: { host: 'www.lidl.es', path: /^\/assets\/[\w-]+\.(?:jpg|jpeg|png|webp)$/ },
    dia: { host: 'www.dia.es', path: /^\/product_images\/[\w/-]+\.(?:jpg|jpeg|png|webp)$/ },
    caprabo: {
      host: 'www.capraboacasa.com',
      path: /^\/{1,2}images\/[\w-]+\.(?:jpg|jpeg|png|webp)$/,
    },
    ametller: {
      host: 'www.ametllerorigen.com',
      path: /^\/dw\/image\/v2\/[\w-]+\/on\/demandware\.static\/-\/Sites-mastercatalog_AMETLLER\/default\/[\w/-]+\.(?:jpg|jpeg|png|webp)$/,
      parameters: {
        sw: /^\d{1,3}$/,
        sh: /^\d{1,3}$/,
        fmt: /^(?:webp|jpg|jpeg|png)$/,
        q: /^\d{1,2}$/,
      },
    },
    open_prices: {
      host: 'images.openfoodfacts.org',
      path: /^\/images\/products\/\d+(?:\/\d+)*\/[\w.-]+\.(?:jpg|jpeg|png|webp)$/,
    },
  };

/** Only product assets from the declared source; a bad photo never invalidates its price. */
export function productImageUrl(provider: Provider, value: unknown): string | null {
  if (
    typeof value !== 'string' ||
    value.length > 1200 ||
    /[\s<>\\\u0000-\u001f\u007f]/.test(value) ||
    !Object.hasOwn(rules, provider)
  )
    return null;
  try {
    const url = new URL(value),
      rule = rules[provider];
    if (
      url.protocol !== 'https:' ||
      url.host !== rule.host ||
      url.username ||
      url.password ||
      url.hash ||
      !rule.path.test(url.pathname)
    )
      return null;
    const keys = [...url.searchParams.keys()];
    if (
      new Set(keys).size !== keys.length ||
      keys.some(
        (key) =>
          !rule.parameters ||
          !Object.hasOwn(rule.parameters, key) ||
          !rule.parameters[key].test(url.searchParams.get(key)!),
      )
    )
      return null;
    if (provider === 'aldi') {
      url.searchParams.set('wid', '300');
      url.searchParams.set('hei', '300');
    }
    return url.href;
  } catch {
    return null;
  }
}
