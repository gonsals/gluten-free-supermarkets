import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { library } from '@/src/data/repositories';
import { normalizeBarcode } from '@/src/domain/barcode';
import { errorCopy, errorCode } from '@/src/domain/errors';
import type { Product } from '@/src/domain/product';
import { ProductCard } from '@/src/features/products/ProductCard';
import { useProductLookup } from '@/src/features/products/useProductLookup';
import { Action, Heading, Notice, Screen } from '@/src/shared/ui';

export default function ProductScreen() {
  const params = useLocalSearchParams<{ barcode: string; consultedAt?: string }>();
  return (
    <ProductDetails
      key={params.barcode}
      barcode={params.barcode}
      consultedAt={params.consultedAt}
    />
  );
}
function ProductDetails({ barcode, consultedAt }: { barcode: string; consultedAt?: string }) {
  const params = { barcode, consultedAt };
  const router = useRouter();
  const [stored, setStored] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const lookup = useProductLookup();
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const code = normalizeBarcode(barcode);
        const product = await library.getProduct(code);
        if (active) {
          setStored(product);
          if (!product)
            setMessage(
              'No hay una ficha guardada en este dispositivo. Puedes consultarla en la fuente.',
            );
        }
      } catch (error) {
        if (active) setMessage(errorCopy[errorCode(error)]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [barcode]);
  const product = lookup.product ?? stored;
  return (
    <Screen>
      <Heading>Información del producto</Heading>
      {loading ? <ActivityIndicator /> : null}
      {message && !product ? <Notice>{message}</Notice> : null}
      {lookup.error && !product ? <Notice error>{errorCopy[lookup.error]}</Notice> : null}
      {params.consultedAt && product && params.consultedAt !== product.source.fetchedAt ? (
        <Notice>
          Esta ficha tiene una consulta más reciente que la entrada que has abierto. La fecha del
          historial se conserva.
        </Notice>
      ) : null}
      {product ? (
        <ProductCard
          product={product}
          cached={!lookup.product || lookup.cached}
          onRefresh={() =>
            void lookup.lookup(params.barcode, { force: true, recordHistory: false })
          }
          refreshing={lookup.loading}
          refreshError={lookup.error ? errorCopy[lookup.error] : undefined}
          onPrices={() =>
            router.push({ pathname: '/prices/[barcode]', params: { barcode: product.barcode } })
          }
        />
      ) : !loading ? (
        <Action
          title="Consultar en la fuente"
          onPress={() => void lookup.lookup(params.barcode)}
          busy={lookup.loading}
        />
      ) : null}
      {lookup.storageWarning ? (
        <Notice error>No se ha podido guardar esta actualización en el dispositivo.</Notice>
      ) : null}
    </Screen>
  );
}
