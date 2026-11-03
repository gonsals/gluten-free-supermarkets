import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { publicPricesClient } from '@/src/data/open-prices/client';
import { searchText, type CatalogPricePage } from '@/src/domain/catalogSearch';
import { publicPriceError } from './usePublicPrices';

export function useCatalogSearch() {
  const [result, setResult] = useState<CatalogPricePage | null>(null);
  const [submitted, setSubmitted] = useState<{ text: string; store: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancelled, setCancelled] = useState(false);
  const generation = useRef(0),
    pending = useRef(false),
    request = useRef<AbortController | null>(null),
    interrupted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      setLoading(false);
      if (interrupted.current) {
        setCancelled(true);
        interrupted.current = false;
      }
      return () => {
        interrupted.current = pending.current;
        generation.current++;
        pending.current = false;
        request.current?.abort();
      };
    }, []),
  );
  async function search(text: string, store: string, page = 1) {
    if (pending.current) return;
    let input: { text: string; store: string };
    try {
      input = { text: searchText(text), store: store.trim() ? searchText(store, 1, 100) : '' };
    } catch {
      setError('Escribe entre 2 y 80 caracteres para buscar un producto.');
      return;
    }
    const token = ++generation.current,
      controller = new AbortController();
    request.current = controller;
    pending.current = true;
    setSubmitted(input);
    setLoading(true);
    setError('');
    setCancelled(false);
    if (page === 1) setResult(null);
    try {
      const next = await publicPricesClient.searchCatalog(
        input.text,
        input.store,
        page,
        controller.signal,
      );
      if (generation.current !== token) return;
      setResult((current) =>
        !current || page === 1
          ? next
          : {
              ...next,
              products: [
                ...new Map(
                  [...current.products, ...next.products].map((p) => [p.barcode, p]),
                ).values(),
              ],
              quotes: [
                ...new Map([...current.quotes, ...next.quotes].map((q) => [q.id, q])).values(),
              ],
              skipped: current.skipped + next.skipped,
              pricesLimited: current.pricesLimited || next.pricesLimited,
              priceError: current.priceError || next.priceError,
            },
      );
      if (next.priceError) setError(publicPriceError(new Error(next.priceError)));
    } catch (failure) {
      if (
        generation.current === token &&
        !(failure instanceof Error && failure.message === 'cancelled')
      )
        setError(publicPriceError(failure));
    } finally {
      if (generation.current === token) {
        pending.current = false;
        setLoading(false);
      }
    }
  }
  return {
    result,
    submitted,
    loading,
    error: error || (result?.priceError ? publicPriceError(new Error(result.priceError)) : ''),
    cancelled,
    search,
    cancel: () => {
      generation.current++;
      request.current?.abort();
      pending.current = false;
      setLoading(false);
      setCancelled(true);
    },
  };
}
