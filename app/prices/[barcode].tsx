import { useLocalSearchParams, useRouter } from 'expo-router';
import { normalizeBarcode, sameGtin } from '@/src/domain/barcode';
import { useLibrary } from '@/src/features/library/useLibrary';
import { PriceForm } from '@/src/features/prices/PriceForm';
import { PriceList } from '@/src/features/prices/PriceList';
import { SharedPrices } from '@/src/features/prices/SharedPrices';
import { Action, Copy, Heading, Notice, Screen } from '@/src/shared/ui';
import { PriceComparison } from '@/src/features/prices/PriceComparison';
import { useCachedProduct } from '@/src/features/products/useCachedProduct';

export default function ProductPricesScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  return <ProductPrices key={barcode} barcode={barcode} />;
}
function ProductPrices({ barcode }: { barcode: string }) {
  const router = useRouter();
  const { data, repository } = useLibrary();
  const product = useCachedProduct(barcode);
  let valid = true;
  try {
    normalizeBarcode(barcode);
  } catch {
    valid = false;
  }
  const prices = data.prices.filter((price) => valid && sameGtin(price.barcode, barcode));
  return (
    <Screen>
      <Heading>{product?.name ?? 'Comparar este producto'}</Heading>
      <Copy muted>
        Código {barcode}. Mismo producto y envase; los precios pueden cambiar y no confirman
        disponibilidad.
      </Copy>
      {valid ? (
        <>
          <PriceComparison barcode={barcode} prices={prices} />
          <Action
            title="Ver ficha e información sobre gluten"
            secondary
            onPress={() => router.push({ pathname: '/product/[barcode]', params: { barcode } })}
          />
          <PriceForm barcode={barcode} product={product} />
          <Heading>Tus anotaciones de este producto</Heading>
          <PriceList prices={prices} onDelete={(id) => repository.deletePrice(id)} />
          <SharedPrices
            barcode={barcode}
            localPrices={data.prices.filter((x) => x.barcode === barcode)}
          />
        </>
      ) : (
        <Notice error>El código de barras no es válido.</Notice>
      )}
    </Screen>
  );
}
