import { useLocalSearchParams, useRouter } from 'expo-router';
import { normalizeBarcode, sameGtin } from '@/src/domain/barcode';
import { useLibrary } from '@/src/features/library/useLibrary';
import { PriceForm } from '@/src/features/prices/PriceForm';
import { PriceList } from '@/src/features/prices/PriceList';
import { SharedPrices } from '@/src/features/prices/SharedPrices';
import { Action, Copy, Heading, Notice, Screen } from '@/src/shared/ui';
import { PriceComparison } from '@/src/features/prices/PriceComparison';
import { useCachedProduct } from '@/src/features/products/useCachedProduct';
import { AddToBasket } from '@/src/features/basket/AddToBasket';
import { Disclosure } from '@/src/shared/Disclosure';

export default function ProductPricesScreen() {
  const { barcode, name, offers, older } = useLocalSearchParams<{
    barcode: string;
    name?: string;
    offers?: string;
    older?: string;
  }>();
  const resultName = typeof name === 'string' ? name.slice(0, 300).trim() : '';
  return (
    <ProductPrices
      key={`${barcode}:${offers === '1'}:${older === '1'}`}
      barcode={barcode}
      resultName={resultName}
      offers={offers === '1'}
      older={older === '1'}
    />
  );
}
function ProductPrices({
  barcode,
  resultName,
  offers,
  older,
}: {
  barcode: string;
  resultName: string;
  offers: boolean;
  older: boolean;
}) {
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
      <Heading>{product?.name ?? (resultName || 'Comparar este producto')}</Heading>
      <Copy muted>
        Código {barcode}. Mismo producto y envase; los precios pueden cambiar y no confirman
        disponibilidad.
      </Copy>
      {valid ? (
        <>
          <PriceComparison
            barcode={barcode}
            prices={prices}
            initialOffers={offers}
            initialRecentOnly={!older}
          />
          <AddToBasket barcode={barcode} product={product ?? undefined} />
          <Action
            title={`Mi cesta (${data.basket.length})`}
            secondary
            icon="basket-outline"
            onPress={() => router.push('/basket')}
          />
          <Action
            title="Ver ficha e información sobre gluten"
            secondary
            onPress={() => router.push({ pathname: '/product/[barcode]', params: { barcode } })}
          />
          <PriceForm barcode={barcode} product={product} />
          <Disclosure title={`Mis anotaciones de este producto (${prices.length})`}>
            <PriceList prices={prices} onDelete={(id) => repository.deletePrice(id)} />
          </Disclosure>
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
