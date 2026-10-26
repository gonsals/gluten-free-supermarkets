import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useLibrary } from '@/src/features/library/useLibrary';
import { PriceForm } from '@/src/features/prices/PriceForm';
import { PriceList } from '@/src/features/prices/PriceList';
import { Action, Card, Copy, Field, Heading, Notice, Screen } from '@/src/shared/ui';
import { normalizeBarcode } from '@/src/domain/barcode';
import { glutenCopy } from '@/src/domain/product';
import { compareQuotes, privateQuotes, quoteMoney } from '@/src/domain/comparison';
import type { ProductSummary } from '@/src/data/local/library';

export default function PricesScreen() {
  const router = useRouter();
  const { data, repository } = useLibrary();
  const [query, setQuery] = useState('');
  const [priceQuery, setPriceQuery] = useState('');
  const [limit, setLimit] = useState(20);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [glutenFreeOnly, setGlutenFreeOnly] = useState(false);
  const q = query.trim().toLocaleLowerCase('es');
  const products = new Map<string, ProductSummary>(
    [
      ...[...data.history].reverse(),
      ...Object.values(data.favorites).filter((favorite) => !favorite.deleted),
    ].map((item) => [item.barcode, item]),
  );
  const localQuotes = privateQuotes(data.prices);
  for (const price of data.prices)
    if (!products.has(price.barcode))
      products.set(price.barcode, {
        barcode: price.barcode,
        name: `Producto ${price.barcode}`,
        brands: '',
        state: 'unknown',
        fetchedAt: '',
      });
  const matching = [...products.values()].filter(
    (item) =>
      (!glutenFreeOnly || item.state === 'declared_gluten_free') &&
      `${item.name} ${item.brands} ${item.barcode}`.toLocaleLowerCase('es').includes(q),
  );
  function compare() {
    try {
      const barcode = normalizeBarcode(code);
      setMessage('');
      router.push({ pathname: '/prices/[barcode]', params: { barcode } });
    } catch {
      setMessage('Introduce un código EAN o UPC válido.');
    }
  }
  return (
    <Screen>
      <Heading eyebrow="Tu compra, mejor de precio">Comparar precios</Heading>
      <Copy muted>
        Busca un producto para consultar aportaciones públicas y tus anotaciones por tienda. La
        comparación usa el mismo código y envase; no es un catálogo completo ni garantiza
        existencias.
      </Copy>
      <Card>
        <Field
          label="Código para comparar precios"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={24}
        />
        <Action title="Comparar este código" onPress={compare} />
        <Action
          title="Escanear un producto para comparar"
          secondary
          icon="scan-outline"
          onPress={() => router.navigate('/scan')}
        />
        {message ? <Notice error>{message}</Notice> : null}
      </Card>
      <Field
        label="Buscar productos guardados"
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          setLimit(20);
        }}
        placeholder="Nombre, marca o código"
      />
      <Action
        title="Solo productos con declaración sin gluten"
        selected={glutenFreeOnly}
        secondary={!glutenFreeOnly}
        onPress={() => {
          setGlutenFreeOnly((value) => !value);
          setLimit(20);
        }}
      />
      {glutenFreeOnly ? (
        <Copy muted>
          Este filtro describe una declaración de la fuente; comprueba trazas y envase. No certifica
          aptitud.
        </Copy>
      ) : null}
      {matching.slice(0, limit).map((item) => {
        const quotes = compareQuotes(localQuotes, { barcode: item.barcode, recentOnly: true });
        return (
          <Card key={item.barcode}>
            <Copy>{item.name}</Copy>
            <Copy muted>
              {glutenCopy[item.state].title} · {item.barcode}
            </Copy>
            <Copy>
              {quotes.length
                ? `Desde ${quoteMoney(quotes[0].amountMilli)} en tus anotaciones recientes sin condiciones.`
                : 'Todavía no hay un precio privado reciente comparable.'}
            </Copy>
            <Action
              title={`Comparar ${item.name}`}
              secondary
              onPress={() =>
                router.push({ pathname: '/prices/[barcode]', params: { barcode: item.barcode } })
              }
            />
          </Card>
        );
      })}
      {matching.length > limit ? (
        <Action
          title="Mostrar 20 productos más"
          secondary
          onPress={() => setLimit((value) => value + 20)}
        />
      ) : null}
      {!matching.length ? (
        <Notice>
          {glutenFreeOnly
            ? 'No hay productos guardados que cumplan este filtro.'
            : 'Escanea o introduce un código para empezar. También puedes anotar precios manualmente.'}
        </Notice>
      ) : null}
      <PriceForm />
      <Field
        label="Filtrar mis precios"
        placeholder="Código, tienda o localidad"
        value={priceQuery}
        onChangeText={setPriceQuery}
      />
      <PriceList
        prices={data.prices.filter((x) =>
          `${x.barcode} ${x.store} ${x.location}`
            .toLocaleLowerCase('es')
            .includes(priceQuery.trim().toLocaleLowerCase('es')),
        )}
        onDelete={(id) => repository.deletePrice(id)}
      />
    </Screen>
  );
}
