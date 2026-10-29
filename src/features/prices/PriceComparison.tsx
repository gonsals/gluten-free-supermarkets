import { useState } from 'react';
import { Linking } from 'react-native';
import { compareQuotes, privateQuotes, quoteMoney } from '@/src/domain/comparison';
import type { PriceObservation } from '@/src/domain/price';
import { Action, Card, Copy, Field, Heading, Notice } from '@/src/shared/ui';
import { usePublicPrices } from './usePublicPrices';
import { UnitPrice } from './UnitPrice';

export function PriceComparison({
  barcode,
  prices,
}: {
  barcode: string;
  prices: PriceObservation[];
}) {
  const remote = usePublicPrices(barcode);
  const [location, setLocation] = useState('');
  const [recentOnly, setRecentOnly] = useState(true);
  const [offers, setOffers] = useState(false);
  const [spainOnly, setSpainOnly] = useState(true);
  const [message, setMessage] = useState('');
  const [limit, setLimit] = useState(20);
  const quotes = [...privateQuotes(prices), ...(remote.result?.quotes ?? [])];
  const comparison = compareQuotes(quotes, {
    barcode,
    location,
    recentOnly,
    includeOffers: offers,
    publicSpainOnly: spainOnly,
  });
  const cheapest = comparison[0];
  const difference =
    cheapest && comparison.length > 1 ? comparison.at(-1)!.amountMilli - cheapest.amountMilli : 0;
  async function open(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      setMessage('No se ha podido abrir la fuente.');
    }
  }
  return (
    <>
      <Heading eyebrow="Mismo código, mismo envase">Dónde sale mejor</Heading>
      <Copy muted>
        Comparamos observaciones por sucursal. Los precios pueden cambiar y no garantizan
        existencias. Una marca de supermercado no demuestra que tenga el menor precio.
      </Copy>
      {remote.error ? <Notice error>{remote.error}</Notice> : null}
      {remote.loading && cheapest ? (
        <Notice>
          Consultando precios públicos; la comparación muestra los datos disponibles hasta ahora.
        </Notice>
      ) : null}
      {cheapest ? (
        <Card>
          <Copy>
            Menor precio entre los datos comparables: {quoteMoney(cheapest.amountMilli)} por envase.
          </Copy>
          <Copy>
            {cheapest.store} · {cheapest.location}
          </Copy>
          <Copy muted>
            {comparison.length}{' '}
            {comparison.length === 1 ? 'referencia comparable' : 'referencias comparables'}.{' '}
            {difference > 0
              ? `Diferencia frente al mayor precio de esta muestra: ${quoteMoney(difference)} por envase.`
              : 'Hace falta otra sucursal con datos para estimar una diferencia.'}
          </Copy>
        </Card>
      ) : (
        <Notice>
          {remote.loading
            ? 'Buscando precios públicos; tus anotaciones siguen disponibles.'
            : remote.error
              ? 'No se ha podido completar la consulta pública y no hay anotaciones privadas que cumplan estos filtros.'
              : 'No hay precios que cumplan estos filtros. No significa que el producto no se venda. Puedes ampliar los filtros o anotar un precio que hayas visto.'}
        </Notice>
      )}
      <Field
        label="Filtrar tienda o localidad"
        value={location}
        onChangeText={(value) => {
          setLocation(value);
          setLimit(20);
        }}
        placeholder="Ej. Mercadona o Madrid"
      />
      <Action
        title="Solo precios de los últimos 7 días"
        selected={recentOnly}
        secondary={!recentOnly}
        onPress={() => {
          setRecentOnly((value) => !value);
          setLimit(20);
        }}
      />
      <Action
        title="Incluir ofertas y anotaciones con notas"
        selected={offers}
        secondary={!offers}
        onPress={() => {
          setOffers((value) => !value);
          setLimit(20);
        }}
      />
      <Action
        title="Precios públicos solo de España"
        selected={spainOnly}
        secondary={!spainOnly}
        onPress={() => {
          setSpainOnly((value) => !value);
          setLimit(20);
        }}
      />
      {!recentOnly || offers ? (
        <Notice>
          Has ampliado la comparación a datos antiguos, ofertas o anotaciones con notas. No es una
          recomendación de precio vigente. Las ofertas privadas vencidas se excluyen siempre.
        </Notice>
      ) : null}
      {comparison.slice(0, limit).map((quote) => (
        <Card key={quote.id}>
          <Copy>{quoteMoney(quote.amountMilli)} por envase</Copy>
          <UnitPrice quote={quote} />
          <Copy>
            {quote.store} · {quote.location}
          </Copy>
          <Copy muted>
            Observado el {quote.observedAt.slice(0, 10)} ·{' '}
            {quote.source === 'private'
              ? 'Tu anotación privada'
              : 'Open Prices, aportación pública'}
            .
          </Copy>
          {quote.conditional ? (
            <Notice>
              Oferta o precio con condiciones. Compruébalas en la fuente o en tu anotación antes de
              comparar.
            </Notice>
          ) : null}
          {quote.conditions ? <Copy muted>{quote.conditions}</Copy> : null}
          {quote.offerEndsAt ? (
            <Copy muted>Oferta hasta {quote.offerEndsAt.slice(0, 10)}.</Copy>
          ) : null}
          {quote.sourceUrl ? (
            <Action
              title={`Ver fuente de ${quote.store}`}
              secondary
              icon="open-outline"
              onPress={() => void open(quote.sourceUrl!)}
            />
          ) : null}
        </Card>
      ))}
      {comparison.length > limit ? (
        <Action
          title="Mostrar 20 referencias más"
          secondary
          onPress={() => setLimit((value) => value + 20)}
        />
      ) : null}
      <Card>
        <Copy>Precios públicos de Open Prices</Copy>
        <Copy muted>
          Datos colaborativos de Open Food Facts · ODbL. No es un catálogo completo ni una tarifa
          oficial del supermercado. España filtra solo las aportaciones públicas; revisa siempre la
          localidad de tus anotaciones.
        </Copy>
        <Copy muted>
          Consultar envía a Open Prices el código de este producto y los datos técnicos de conexión.
          Tus precios, notas y biblioteca no se envían.
        </Copy>
        <Copy muted>Ubicaciones: © OpenStreetMap contributors, bajo ODbL.</Copy>
        <Action
          title="Atribución de OpenStreetMap"
          secondary
          onPress={() => void open('https://www.openstreetmap.org/copyright')}
        />
        {remote.loading ? <Notice>Consultando precios públicos…</Notice> : null}
        {remote.result ? (
          <Copy muted>
            {remote.result.quotes.length} aportaciones compatibles cargadas de {remote.result.total}{' '}
            resultados del proveedor.{' '}
            {remote.result.skipped
              ? `${remote.result.skipped} registros descartados por formato, duplicados o datos insuficientes.`
              : ''}{' '}
            El ranking usa solo la muestra cargada y tus filtros.
          </Copy>
        ) : null}
        {remote.result && remote.result.page === 3 && remote.result.total > 150 ? (
          <Notice>
            Alcanzado el límite de 150 aportaciones. La comparación puede no incluir todas las
            tiendas.
          </Notice>
        ) : null}
        {remote.error ? (
          <Action
            title="Reintentar precios públicos"
            secondary
            onPress={remote.retry}
            disabled={remote.loading}
          />
        ) : null}
        {remote.result?.more ? (
          <Action
            title="Cargar más precios públicos"
            secondary
            onPress={remote.loadMore}
            busy={remote.loading}
          />
        ) : null}
        <Action
          title="Acerca de Open Prices y sus datos"
          secondary
          onPress={() => void open('https://prices.openfoodfacts.org/about')}
        />
        {message ? <Notice error>{message}</Notice> : null}
      </Card>
    </>
  );
}
