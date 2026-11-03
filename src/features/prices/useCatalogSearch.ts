import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { publicPricesClient } from '@/src/data/open-prices/client';
import { searchText, type CatalogPricePage } from '@/src/domain/catalogSearch';
import { publicPriceError } from './usePublicPrices';
import { bundledRetailCatalog, fetchRetailCatalog } from '@/src/data/retail/client';
import { Platform } from 'react-native';
import { fetchLiveRetailCatalog } from '@/src/data/retail/live';

export function useCatalogSearch() {
  const [result, setResult] = useState<CatalogPricePage | null>(null);
  const [submitted, setSubmitted] = useState<{ text: string; store: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancelled, setCancelled] = useState(false);
  const [retailCatalog, setRetailCatalog] = useState(bundledRetailCatalog);
  const [retailOffline, setRetailOffline] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const generation = useRef(0),
    pending = useRef(false),
    request = useRef<AbortController | null>(null),
    interrupted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => setNow(Date.now()), 30000);
      setLoading(false);
      if (interrupted.current) {
        setCancelled(true);
        interrupted.current = false;
      }
      return () => {
        clearInterval(timer);
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
    setNow(Date.now());
    setLoading(true);
    setError('');
    setCancelled(false);
    if (page === 1) setResult(null);
    try {
      const [retail, observations] = await Promise.allSettled([
        page !== 1
          ? Promise.resolve({ catalog: retailCatalog, failed: retailOffline })
          : Platform.OS === 'web'
            ? fetchRetailCatalog(controller.signal).then((catalog) => ({ catalog, failed: false }))
            : fetchLiveRetailCatalog(retailCatalog, input.text, input.store, controller.signal),
        publicPricesClient.searchCatalog(input.text, input.store, page, controller.signal),
      ]);
      if (generation.current !== token) return;
      setNow(Date.now());
      if (retail.status === 'fulfilled') {
        setRetailCatalog(retail.value.catalog);
        setRetailOffline(retail.value.failed);
      } else setRetailOffline(true);
      if (observations.status === 'rejected') throw observations.reason;
      const next = observations.value;
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
    retailCatalog,
    retailOffline,
    now,
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
