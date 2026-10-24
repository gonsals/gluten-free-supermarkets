import { useState } from 'react';
import { useLibrary } from '@/src/features/library/useLibrary';
import { PriceForm } from '@/src/features/prices/PriceForm';
import { PriceList } from '@/src/features/prices/PriceList';
import { Copy, Field, Heading, Screen } from '@/src/shared/ui';

export default function PricesScreen() {
  const { data, repository } = useLibrary();
  const [query, setQuery] = useState('');
  const q = query.trim().toLocaleLowerCase('es');
  return (
    <Screen>
      <Heading eyebrow="Tu cuaderno de compra">Precios observados</Heading>
      <Copy muted>
        Anota y compara precios del mismo código y formato. Son observaciones, no un catálogo de
        precios vigentes ni una garantía de stock.
      </Copy>
      <PriceForm />
      <Field
        label="Filtrar mis precios"
        placeholder="Código, tienda o localidad"
        value={query}
        onChangeText={setQuery}
      />
      <PriceList
        prices={data.prices.filter((x) =>
          `${x.barcode} ${x.store} ${x.location}`.toLocaleLowerCase('es').includes(q),
        )}
        onDelete={(id) => repository.deletePrice(id)}
      />
    </Screen>
  );
}
