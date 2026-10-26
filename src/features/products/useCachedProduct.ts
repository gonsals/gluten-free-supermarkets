import { useEffect, useState } from 'react';
import { normalizeBarcode } from '@/src/domain/barcode';
import type { Product } from '@/src/domain/product';
import { useLibrary } from '@/src/features/library/useLibrary';

export function useCachedProduct(input?: string): Product | null {
  const { repository, ready, data } = useLibrary();
  const [cached, setCached] = useState<{ code: string; product: Product | null } | null>(null);
  let code = '';
  try {
    if (input) code = normalizeBarcode(input);
  } catch {
    /* The form owns barcode errors. */
  }
  const fetchedAt = code ? data.cache[code] : undefined;
  useEffect(() => {
    if (!ready || !code) return;
    let active = true;
    void repository.getProduct(code).then(
      (product) => {
        if (active) setCached({ code, product });
      },
      () => {
        if (active) setCached({ code, product: null });
      },
    );
    return () => {
      active = false;
    };
  }, [code, fetchedAt, ready, repository]);
  return code && cached?.code === code ? cached.product : null;
}
