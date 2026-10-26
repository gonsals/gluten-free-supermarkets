import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { publicPricesClient, type PublicPricePage } from '@/src/data/open-prices/client';

const messages: Record<string, string> = {
  offline: 'No se ha podido conectar con Open Prices. Tus anotaciones siguen disponibles.',
  timeout: 'Open Prices ha tardado demasiado. Puedes volver a intentarlo.',
  rate_limited: 'Open Prices ha limitado las consultas. Espera antes de volver a intentarlo.',
  invalid_response: 'Open Prices ha devuelto datos que no podemos interpretar con seguridad.',
  provider_error: 'Open Prices no está disponible en este momento.',
};
export function usePublicPrices(barcode: string) {
  const [result, setResult] = useState<PublicPricePage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const pending = useRef(false);
  const request = useRef<AbortController | null>(null);
  const lastRequestedPage = useRef(1);
  const load = useCallback(
    async (page: number) => {
      if (pending.current) return;
      pending.current = true;
      lastRequestedPage.current = page;
      const token = ++generation.current;
      const controller = new AbortController();
      request.current = controller;
      setLoading(true);
      setError('');
      try {
        const next = await publicPricesClient.fetchPrices(barcode, page, controller.signal);
        if (token === generation.current)
          setResult((current) =>
            page === 1 || !current
              ? next
              : {
                  ...next,
                  skipped: current.skipped + next.skipped,
                  quotes: [
                    ...new Map(
                      [...current.quotes, ...next.quotes].map((quote) => [quote.id, quote]),
                    ).values(),
                  ],
                },
          );
      } catch (error) {
        if (
          token === generation.current &&
          !(error instanceof Error && error.message === 'cancelled')
        )
          setError(
            messages[error instanceof Error ? error.message : ''] ?? messages.provider_error,
          );
      } finally {
        if (token === generation.current) {
          pending.current = false;
          setLoading(false);
        }
      }
    },
    [barcode],
  );
  useFocusEffect(
    useCallback(() => {
      void load(1);
      return () => {
        generation.current++;
        request.current?.abort();
        pending.current = false;
      };
    }, [load]),
  );
  return {
    result,
    loading,
    error,
    retry: () => void load(lastRequestedPage.current),
    loadMore: () => void load((result?.page ?? 0) + 1),
  };
}
