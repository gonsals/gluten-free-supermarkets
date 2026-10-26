import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { publicPricesClient, type PublicPricePage } from '@/src/data/open-prices/client';
import type { PriceQuote } from '@/src/domain/comparison';

export interface BasketPublicResult {
  codes: string[];
  pages: Record<string, PublicPricePage>;
  errors: Record<string, string>;
}
export function useBasketPrices(codes: string[]) {
  const [result, setResult] = useState<BasketPublicResult>({ codes: [], pages: {}, errors: {} });
  const [loading, setLoading] = useState(false);
  const state = useRef(result);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const key = codes.join(',');
  const cancel = useCallback(() => {
    generation.current++;
    request.current?.abort();
    request.current = null;
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => cancel, [cancel]));
  const current =
    result.codes.join(',') === key
      ? result
      : ({ codes, pages: {}, errors: {} } as BasketPublicResult);
  const load = async () => {
    if (request.current) return;
    const initial =
      state.current.codes.join(',') === key ? state.current : { codes, pages: {}, errors: {} };
    const batch = [
      ...codes.filter((code) => !initial.pages[code] && !initial.errors[code]),
      ...codes.filter((code) => Boolean(initial.errors[code])),
    ].slice(0, 10);
    if (!batch.length) return;
    const controller = new AbortController();
    request.current = controller;
    const token = ++generation.current;
    setLoading(true);
    let next = { ...initial, pages: { ...initial.pages }, errors: { ...initial.errors } };
    // Sequential: at most 10 page-1 requests per explicit action, no recursive pagination.
    for (const code of batch) {
      if (controller.signal.aborted) break;
      try {
        next.pages[code] = await publicPricesClient.fetchPrices(code, 1, controller.signal);
        delete next.errors[code];
      } catch (error) {
        if (controller.signal.aborted) break;
        next.errors[code] = error instanceof Error ? error.message : 'provider_error';
      }
      if (token !== generation.current) break;
      next = { ...next, pages: { ...next.pages }, errors: { ...next.errors } };
      state.current = next;
      setResult(next);
      if (next.errors[code] === 'rate_limited') break;
    }
    if (token === generation.current) {
      request.current = null;
      setLoading(false);
    }
  };
  const quotes: PriceQuote[] = Object.values(current.pages).flatMap((page) => page.quotes);
  return { ...current, quotes, loading, load, cancel };
}
