import { normalizeBarcode, sameGtin } from '@/src/domain/barcode';
import { AppError } from '@/src/domain/errors';
import { normalizeProduct, record, type Product } from '@/src/domain/product';

const FIELDS =
  'code,product_name,product_name_es,brands,stores,stores_tags,image_front_url,image_url,ingredients_text,ingredients_text_es,labels_tags,labels_hierarchy,allergens_tags,allergens,traces_tags,traces,last_modified_t';
export interface ProductClient {
  fetchProduct(code: string, signal?: AbortSignal): Promise<Product>;
}
export function createProductClient(options: {
  environment: 'production' | 'staging';
  native?: boolean;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}): ProductClient {
  const fetcher = options.fetcher ?? fetch;
  const notFound = new Map<string, number>();
  let rateLimitUntil = 0;
  return {
    async fetchProduct(input, signal) {
      const code = normalizeBarcode(input);
      if (signal?.aborted) throw new AppError('cancelled');
      if (Date.now() < rateLimitUntil)
        throw new AppError('rate_limited', rateLimitUntil - Date.now());
      if ((notFound.get(code) ?? 0) > Date.now()) throw new AppError('not_found');
      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        const abort = () => controller.abort();
        if (signal?.aborted) throw new AppError('cancelled');
        signal?.addEventListener('abort', abort, { once: true });
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, options.timeoutMs ?? 8000);
        try {
          const headers: Record<string, string> = { Accept: 'application/json' };
          if (options.native) headers['User-Agent'] = 'SinGluten/1.0';
          if (options.environment === 'staging') headers.Authorization = 'Basic b2ZmOm9mZg==';
          const response = await fetcher(
            `https://world.openfoodfacts.${options.environment === 'production' ? 'org' : 'net'}/api/v2/product/${code}?fields=${FIELDS}&app_name=SinGluten&app_version=1.0`,
            { headers, signal: controller.signal },
          );
          if (signal?.aborted) throw new AppError('cancelled');
          if (response.status === 429) {
            const seconds = Number(response.headers.get('Retry-After'));
            const untilDate = Date.parse(response.headers.get('Retry-After') ?? '');
            const delay =
              Number.isFinite(seconds) && seconds > 0
                ? seconds * 1000
                : Number.isFinite(untilDate) && untilDate > Date.now()
                  ? untilDate - Date.now()
                  : 60000;
            rateLimitUntil = Date.now() + Math.min(delay, 86400000);
            throw new AppError('rate_limited', rateLimitUntil - Date.now());
          }
          if (response.status === 404) {
            if (notFound.size >= 100) notFound.delete(notFound.keys().next().value!);
            notFound.set(code, Date.now() + 300000);
            throw new AppError('not_found');
          }
          if (!response.ok) {
            if (response.status >= 500 && attempt === 0) continue;
            throw new AppError('provider_error');
          }
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new AppError('invalid_response');
          }
          if (!record(data)) throw new AppError('invalid_response');
          if (data.status === 0) {
            if (notFound.size >= 100) notFound.delete(notFound.keys().next().value!);
            notFound.set(code, Date.now() + 300000);
            throw new AppError('not_found');
          }
          if (data.status !== 1 || !record(data.product)) throw new AppError('invalid_response');
          const returnedCode = data.product.code ?? data.code;
          if (returnedCode != null && typeof returnedCode !== 'string')
            throw new AppError('invalid_response');
          if (typeof returnedCode === 'string' && !sameGtin(returnedCode, code))
            throw new AppError('invalid_response');
          return normalizeProduct(data.product, code, options.environment);
        } catch (error) {
          if (signal?.aborted) throw new AppError('cancelled');
          if (timedOut) throw new AppError('timeout');
          if (error instanceof AppError) throw error;
          throw new AppError('offline');
        } finally {
          clearTimeout(timer);
          signal?.removeEventListener('abort', abort);
        }
      }
      throw new AppError('provider_error');
    },
  };
}
