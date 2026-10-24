import { useCallback, useEffect, useRef, useState } from 'react';
import { library, productClient } from '@/src/data/repositories';
import { normalizeBarcode } from '@/src/domain/barcode';
import { errorCode, type ErrorCode } from '@/src/domain/errors';
import type { Product } from '@/src/domain/product';
import { reportTechnicalEvent } from '@/src/shared/telemetry';

interface LookupState {
  product: Product | null;
  loading: boolean;
  cached: boolean;
  error: ErrorCode | null;
  storageWarning: boolean;
}
const EMPTY: LookupState = {
  product: null,
  loading: false,
  cached: false,
  error: null,
  storageWarning: false,
};
export function useProductLookup() {
  const [state, setState] = useState<LookupState>(EMPTY);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const lastCode = useRef('');
  const cooldown = useRef(0);
  const reset = useCallback(() => {
    generation.current++;
    controller.current?.abort();
    setState(EMPTY);
  }, []);
  useEffect(
    () => () => {
      generation.current++;
      controller.current?.abort();
    },
    [],
  );
  const lookup = useCallback(
    async (input: string, options: { force?: boolean; recordHistory?: boolean } = {}) => {
      const id = ++generation.current;
      const startedAt = Date.now();
      controller.current?.abort();
      const active = new AbortController();
      controller.current = active;
      setState({ ...EMPTY, loading: true });
      let cached: Product | null = null;
      let storageWarning = false;
      try {
        const code = normalizeBarcode(input);
        lastCode.current = code;
        try {
          await library.load();
          cached = await library.getProduct(code);
        } catch {
          storageWarning = true;
        }
        if (id !== generation.current) return;
        if (cached)
          setState({ product: cached, loading: true, cached: true, error: null, storageWarning });
        const fresh = cached && Date.now() - Date.parse(cached.source.fetchedAt) < 86400000;
        let product = cached;
        if (!fresh || options.force) {
          if (Date.now() < cooldown.current) {
            setState({
              product: cached,
              loading: false,
              cached: Boolean(cached),
              error: 'rate_limited',
              storageWarning,
            });
            return;
          }
          product = await productClient.fetchProduct(code, active.signal);
        }
        if (!product || id !== generation.current) return;
        reportTechnicalEvent(
          fresh && !options.force ? 'cache_hit' : 'lookup_completed',
          Date.now() - startedAt,
        );
        try {
          await library.saveProduct(product, options.recordHistory !== false);
        } catch {
          storageWarning = true;
          reportTechnicalEvent('storage_failed');
        }
        if (id === generation.current)
          setState({
            product,
            loading: false,
            cached: Boolean(fresh && !options.force),
            error: null,
            storageWarning,
          });
      } catch (error) {
        if (id !== generation.current || active.signal.aborted) return;
        const code = errorCode(error);
        reportTechnicalEvent(
          code === 'timeout' ? 'lookup_timeout' : 'lookup_failed',
          Date.now() - startedAt,
        );
        if (code === 'rate_limited')
          cooldown.current =
            Date.now() + ((error as { retryAfterMs?: number }).retryAfterMs ?? 60000);
        setState({
          product: cached,
          loading: false,
          cached: Boolean(cached),
          error: code,
          storageWarning,
        });
      }
    },
    [],
  );
  const retry = useCallback(
    () => lookup(lastCode.current, { force: true, recordHistory: false }),
    [lookup],
  );
  return { ...state, lookup, retry, reset };
}
