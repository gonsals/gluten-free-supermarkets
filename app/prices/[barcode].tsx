import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { normalizeBarcode } from '@/src/domain/barcode';
import { isPriceCurrent, money } from '@/src/domain/price';
import { useLibrary } from '@/src/features/library/useLibrary';
import { PriceForm } from '@/src/features/prices/PriceForm';
import { PriceList } from '@/src/features/prices/PriceList';
import { SharedPrices } from '@/src/features/prices/SharedPrices';
import { Card, Copy, Field, Heading, Notice, Screen } from '@/src/shared/ui';

export default function ProductPricesScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const { data, repository } = useLibrary();
  const [location, setLocation] = useState('');
  let valid = true;
  try {
    normalizeBarcode(barcode);
  } catch {
    valid = false;
  }
  const prices = data.prices.filter(
    (price) =>
      price.barcode === barcode &&
      `${price.location} ${price.store}`
        .toLocaleLowerCase('es')
        .includes(location.toLocaleLowerCase('es')),
  );
  const recent = prices.filter((price) => isPriceCurrent(price));
  const min = recent.length ? Math.min(...recent.map((x) => x.amountMinor)) : null;
  return (
    <Screen>
      <Heading>Compara tus observaciones</Heading>
      <Copy muted>
        Código {barcode}. Mismo producto y envase; los precios pueden cambiar y no confirman
        disponibilidad.
      </Copy>
      {valid ? (
        <>
          <PriceForm barcode={barcode} />
          <Field label="Filtrar tienda o localidad" value={location} onChangeText={setLocation} />
          {min !== null ? (
            <Card>
              <Copy>Menor precio observado recientemente: {money(min)}.</Copy>
              <Copy muted>
                Entre tus anotaciones de los últimos 7 días y ofertas no vencidas. Revisa fecha y
                condiciones de cada observación.
              </Copy>
            </Card>
          ) : null}
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
