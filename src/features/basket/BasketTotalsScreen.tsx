import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { useLibrary } from '@/src/features/library/useLibrary';
import { privateQuotes, quoteMoney } from '@/src/domain/comparison';
import { compareBasket, missingCopy, type ComparedBasket } from '@/src/domain/basketComparison';
import { Action, Card, Copy, Field, Heading, Notice, Screen } from '@/src/shared/ui';
import { useBasketPrices } from './useBasketPrices';
import { BranchManager } from './BranchManager';

function BasketEstimate({ estimate }: { estimate: ComparedBasket }) {
  const router = useRouter();
  const [details, setDetails] = useState(false);
  const [limit, setLimit] = useState(20);
  const [message, setMessage] = useState('');
  async function source(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      setMessage('No se ha podido abrir la fuente.');
    }
  }
  return (
    <Card>
      <Heading>{estimate.branch.name}</Heading>
      <Copy muted>{estimate.branch.address} · Sucursal identificada por ti</Copy>
      <Copy>
        {estimate.complete
          ? `Total estimado: ${quoteMoney(estimate.subtotalMilli!)}`
          : estimate.subtotalMilli === null
            ? 'Cesta incompleta · sin importe calculable'
            : `Cesta incompleta · subtotal: ${quoteMoney(estimate.subtotalMilli)}`}
      </Copy>
      <Copy>
        Cobertura: {estimate.coveredLines}/{estimate.lines.length} productos ·{' '}
        {estimate.coveredPackages}/{estimate.totalPackages} envases.
      </Copy>
      {!estimate.complete ? (
        <Notice>
          Productos sin precio elegible: {estimate.lines.length - estimate.coveredLines}. Este
          subtotal no participa en el ranking de compras completas.
        </Notice>
      ) : null}
      <Action
        title={`Ver desglose de ${estimate.branch.name}`}
        secondary
        selected={details}
        onPress={() => setDetails((value) => !value)}
      />
      {details
        ? estimate.lines.slice(0, limit).map((item) => (
            <Card key={item.line.barcode}>
              <Copy>
                {item.line.name || item.line.barcode} · {item.line.quantity}{' '}
                {item.line.quantity === 1 ? 'envase' : 'envases'}
              </Copy>
              {item.quote ? (
                <>
                  <Copy>
                    {item.line.quantity} × {quoteMoney(item.quote.amountMilli)} ={' '}
                    {quoteMoney(item.amountMilli!)}
                  </Copy>
                  <Copy muted>
                    {item.quote.source === 'private' ? 'Anotación privada' : 'Open Prices'} ·{' '}
                    {item.quote.store} · {item.quote.location} · observado{' '}
                    {item.quote.observedAt.slice(0, 10)}
                  </Copy>
                  {item.quote.conditional ? (
                    <Notice>
                      Precio con condiciones:{' '}
                      {item.quote.conditions || 'Consulta la fuente antes de comprar.'}
                    </Notice>
                  ) : null}
                  {item.quote.offerEndsAt ? (
                    <Copy muted>Oferta hasta {item.quote.offerEndsAt.slice(0, 10)}</Copy>
                  ) : null}
                  {item.quote.sourceUrl ? (
                    <Action
                      title="Ver fuente del precio"
                      secondary
                      onPress={() => void source(item.quote!.sourceUrl!)}
                    />
                  ) : null}
                </>
              ) : (
                <Notice error>{missingCopy[item.reason!]}. No se asigna precio cero.</Notice>
              )}
              {item.conflict ? (
                <Notice>
                  Las referencias vinculadas difieren. Se usa la observación más reciente, aunque
                  sea más cara. No se recupera una anterior si la nueva queda excluida.
                </Notice>
              ) : null}
              {item.conflict || !item.quote
                ? item.references.map((quote) => (
                    <Copy key={quote.id} muted>
                      {quote.source === 'private' ? 'Privado' : 'Open Prices'} ·{' '}
                      {quoteMoney(quote.amountMilli)} · {quote.observedAt.slice(0, 10)}
                      {quote.conditional ? ' · con condiciones' : ''}
                    </Copy>
                  ))
                : null}
              <Action
                title="Comparar o anotar este producto"
                secondary
                onPress={() =>
                  router.push({
                    pathname: '/prices/[barcode]',
                    params: { barcode: item.line.barcode },
                  })
                }
              />
            </Card>
          ))
        : null}
      {details && estimate.lines.length > limit ? (
        <Action
          title="Mostrar 20 líneas más"
          secondary
          onPress={() => setLimit((value) => value + 20)}
        />
      ) : null}
      {message ? <Notice error>{message}</Notice> : null}
    </Card>
  );
}

export function BasketTotalsScreen() {
  const { data } = useLibrary();
  // Product-set changes invalidate transient requests/results; quantity changes keep them.
  return (
    <BasketTotals
      key={data.basket
        .map((line) => line.barcode)
        .sort()
        .join(',')}
    />
  );
}
function BasketTotals() {
  const { data, ready, error, repository } = useLibrary();
  const router = useRouter();
  const [recentOnly, setRecent] = useState(true),
    [includeOffers, setOffers] = useState(false),
    [publicSpainOnly, setSpain] = useState(true);
  const [location, setLocation] = useState(''),
    [manage, setManage] = useState(false),
    [limit, setLimit] = useState(10);
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      const timer = setInterval(() => setNow(Date.now()), 60000);
      return () => clearInterval(timer);
    }, []),
  );
  const codes = data.basket.map((line) => line.barcode).sort();
  const remote = useBasketPrices(codes);
  const codeKey = codes.join(',');
  const local = useMemo(() => {
    const wanted = new Set(codeKey.split(',').map((code) => code.padStart(14, '0')));
    return privateQuotes(data.prices).filter((quote) =>
      wanted.has(quote.barcode.padStart(14, '0')),
    );
  }, [data.prices, codeKey]);
  const quotes = [...local, ...remote.quotes];
  const estimates = ready
    ? compareBasket(
        data.basket,
        data.branches,
        quotes,
        { recentOnly, includeOffers, publicSpainOnly, location, now },
        Object.keys(remote.errors),
      )
    : [];
  const complete = estimates.filter((item) => item.complete);
  const assigned = new Set(
    data.branches.flatMap((branch) => branch.references.map((ref) => ref.key)),
  );
  const unassigned = new Set(
    quotes.filter((quote) => !assigned.has(quote.branchKey)).map((quote) => quote.branchKey),
  ).size;
  return (
    <Screen>
      <Heading eyebrow="Mismos productos y envases">Total de tu cesta</Heading>
      <Copy muted>
        Estimaciones por sucursal confirmada, con cantidades y precios observados. Solo comparamos
        totales con todos los productos cubiertos; no garantizan stock ni precio de caja.
      </Copy>
      <Action title="Editar mi cesta" secondary onPress={() => router.back()} />
      {error ? (
        <>
          <Notice error>{error}</Notice>
          <Action
            title="Reintentar abrir biblioteca"
            secondary
            onPress={() => void repository.refresh()}
          />
        </>
      ) : null}
      {!data.basket.length ? (
        <Notice>Tu cesta está vacía. Añade productos antes de comparar totales.</Notice>
      ) : null}
      {complete.length ? (
        <Card>
          <Copy>
            Menor total de las cestas completas de esta muestra:{' '}
            {quoteMoney(complete[0].subtotalMilli!)} · {complete[0].branch.name}
          </Copy>
          <Copy muted>
            {complete.length > 1
              ? `Diferencia estimada frente a la siguiente cesta completa: ${quoteMoney(complete[1].subtotalMilli! - complete[0].subtotalMilli!)}. No es ahorro de una compra realizada.`
              : 'Solo hay una cesta completa. No hay otra opción completa para estimar una diferencia.'}
          </Copy>
        </Card>
      ) : data.basket.length ? (
        <Notice>
          No hay ninguna cesta completa con los datos y filtros actuales. Los subtotales incompletos
          se muestran aparte de cualquier ranking completo.
        </Notice>
      ) : null}
      <Field
        label="Filtrar sucursales de la cesta"
        value={location}
        onChangeText={(value) => {
          setLocation(value);
          setLimit(10);
        }}
        placeholder="Nombre o dirección confirmados"
      />
      <Action
        title="Solo precios de los últimos 7 días"
        selected={recentOnly}
        secondary={!recentOnly}
        onPress={() => setRecent((value) => !value)}
      />
      <Action
        title="Incluir ofertas y anotaciones con notas"
        selected={includeOffers}
        secondary={!includeOffers}
        onPress={() => setOffers((value) => !value)}
      />
      <Action
        title="Precios públicos solo de España"
        selected={publicSpainOnly}
        secondary={!publicSpainOnly}
        onPress={() => setSpain((value) => !value)}
      />
      {!recentOnly || includeOffers ? (
        <Notice>
          Has ampliado los filtros a precios antiguos o con condiciones. Las ofertas vencidas se
          excluyen siempre. Revisa cada observación.
        </Notice>
      ) : null}
      <Card>
        <Copy>Fuentes públicas bajo demanda</Copy>
        <Copy muted>
          Consultar envía a Open Prices códigos de hasta 10 productos por acción y datos de
          conexión, sin notas ni precios privados. Una página de hasta 50 registros por producto;
          sin paginación automática ni descarga de toda la cesta. Los resultados solo permanecen en
          memoria y pueden ser incompletos.
        </Copy>
        <Copy muted>
          {Object.keys(remote.pages).length}/{codes.length} productos consultados correctamente ·{' '}
          {Object.keys(remote.errors).length} consultas con error. Un resultado vacío no demuestra
          que no se venda.
        </Copy>
        {Object.entries(remote.errors).map(([code, reason]) => (
          <Notice key={code} error>
            {code}:{' '}
            {reason === 'rate_limited'
              ? 'La fuente ha limitado las peticiones; espera antes de reintentar.'
              : 'No se ha completado la consulta pública. Las anotaciones privadas siguen disponibles.'}
          </Notice>
        ))}
        <Action
          title="Consultar hasta 10 productos pendientes"
          busy={remote.loading}
          disabled={!ready || !codes.length || Object.keys(remote.pages).length === codes.length}
          onPress={() => void remote.load()}
        />
        {remote.loading ? (
          <Action title="Cancelar consulta pública de la cesta" secondary onPress={remote.cancel} />
        ) : null}
        <Copy muted>
          Precios: Open Prices/ODbL. Ubicaciones: © OpenStreetMap contributors/ODbL. No son tarifas
          oficiales. Atribución y privacidad completas en Ajustes.
        </Copy>
        <Action
          title="Ver fuentes y privacidad"
          secondary
          onPress={() => router.navigate('/settings')}
        />
      </Card>
      {unassigned ? (
        <Notice>
          Referencias sin sucursal confirmada: {unassigned}. Quedan fuera de los totales.
          Identifícalas para usarlas, sin mezclar establecimientos por su nombre.
        </Notice>
      ) : null}
      <Action
        title="Gestionar sucursales y referencias"
        secondary
        selected={manage}
        onPress={() => setManage((value) => !value)}
      />
      {manage ? <BranchManager quotes={quotes} /> : null}
      {ready && data.basket.length
        ? estimates
            .slice(0, limit)
            .map((estimate) => <BasketEstimate key={estimate.branch.id} estimate={estimate} />)
        : null}
      {estimates.length > limit ? (
        <Action
          title="Mostrar 10 sucursales más"
          secondary
          onPress={() => setLimit((value) => value + 10)}
        />
      ) : null}
      <Copy muted>
        Se suman precios de envase × cantidades enteras, conservando milésimas de euro. No incluye
        desplazamiento, envío, disponibilidad ni ventajas de fidelidad no indicadas. El menor total
        corresponde solo a esta muestra y estos filtros.
      </Copy>
    </Screen>
  );
}
