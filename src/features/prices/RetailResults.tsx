import { useState, type PropsWithChildren } from 'react';
import { Text, View } from 'react-native';
import {
  groupRetailPrices,
  retailPrices,
  retailerNames,
  RETAIL_MAX_AGE,
  retailStore,
  type RetailCatalog,
  type RetailPrice,
} from '@/src/domain/retailCatalog';
import { quoteMoney } from '@/src/domain/comparison';
import { Action, Card, Copy, Heading, Notice } from '@/src/shared/ui';
import { Disclosure } from '@/src/shared/Disclosure';
import { usePalette } from '@/src/shared/theme';

// These are general source notices, not requirements to receive a particular price.
// Unknown conditions and all promotion requirements remain visible in the summary.
const generalNotices = new Set([
  'Confirma precio y disponibilidad para tu dirección.',
  'Confirma precio, cobertura y promociones para tu dirección.',
  'Precio simple publicado; confirma tienda, cobertura y existencias.',
]);

function Meta({ children, muted = true }: PropsWithChildren<{ muted?: boolean }>) {
  const c = usePalette();
  return (
    <Text style={{ color: muted ? c.muted : c.ink, fontSize: 14, lineHeight: 20 }}>{children}</Text>
  );
}

function PriceDetails({
  price: p,
  now,
  summary = false,
}: {
  price: RetailPrice;
  now: number;
  summary?: boolean;
}) {
  const Body = summary ? Meta : Copy;
  return (
    <View style={{ gap: 4 }}>
      <Copy>{p.name}</Copy>
      <Body muted>{p.quantity ? `Formato publicado: ${p.quantity}.` : 'Formato sin indicar.'}</Body>
      {p.unitPrice ? (
        <Body muted>
          Equivalente: {quoteMoney(p.unitPrice.amountMilli)} / {p.unitPrice.unit}
        </Body>
      ) : null}
      {p.isOffer ? (
        <Body muted={false}>
          Oferta publicada
          {p.endsAt
            ? ` · hasta ${new Date(p.endsAt).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })}`
            : ''}
          .
        </Body>
      ) : null}
      {p.conditions && (!summary || !generalNotices.has(p.conditions)) ? (
        <Body muted={false}>{p.conditions}</Body>
      ) : null}
      <Body muted>
        {summary ? 'Consultado' : 'Web oficial · consultado el'} {p.checkedAt.slice(0, 10)}
      </Body>
      {now - Date.parse(p.checkedAt) > RETAIL_MAX_AGE ? (
        <Notice>Precio anterior; el importe actual puede haber cambiado.</Notice>
      ) : null}
    </View>
  );
}

function StorePrices({ prices, now }: { prices: RetailPrice[]; now: number }) {
  const [limit, setLimit] = useState(10);
  const c = usePalette();
  const first = prices[0];
  const name = retailerNames[first.retailer];
  return (
    <Card style={{ gap: 8, padding: 14 }}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text style={{ color: c.ink, fontSize: 18, fontWeight: '700', flexShrink: 1 }}>{name}</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            accessibilityLabel={`Desde ${quoteMoney(first.amountMilli)} · ${name}`}
            style={{ color: c.accent, fontSize: 24, fontWeight: '700' }}
          >
            <Text style={{ fontSize: 14, fontWeight: '400' }}>Desde </Text>
            {quoteMoney(first.amountMilli)}
          </Text>
          <Meta>Por envase</Meta>
        </View>
      </View>
      <PriceDetails price={first} now={now} summary />
      <Disclosure
        compact
        title={
          prices.length > 1 ? `Ver los ${prices.length} precios de ${name}` : `Detalles de ${name}`
        }
      >
        <Copy muted>{first.scope}</Copy>
        <Copy muted>Web oficial · consultado el {first.checkedAt.slice(0, 10)}</Copy>
        {generalNotices.has(first.conditions) ? <Copy muted>{first.conditions}</Copy> : null}
        {prices.slice(1, limit).map((p) => (
          <View
            key={p.id}
            style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 12, gap: 6 }}
          >
            <Copy>
              {quoteMoney(p.amountMilli)} · {name}
            </Copy>
            <Meta>Por envase</Meta>
            <PriceDetails price={p} now={now} />
            {p.scope !== first.scope ? <Copy muted>{p.scope}</Copy> : null}
          </View>
        ))}
        {prices.length > limit ? (
          <Action
            title={`Ver más precios de ${name}`}
            secondary
            onPress={() => setLimit((n) => n + 10)}
          />
        ) : null}
      </Disclosure>
    </Card>
  );
}

export function RetailResults({
  catalog,
  text,
  store,
  onlyOffers,
  includeOlder,
  offline,
  now,
  loading,
}: {
  catalog: RetailCatalog;
  text: string;
  store: string;
  onlyOffers: boolean;
  includeOlder: boolean;
  offline: boolean;
  now: number;
  loading: boolean;
}) {
  const c = usePalette();
  const hits = retailPrices(catalog, { text, store, onlyOffers, includeOlder, now });
  const groups = groupRetailPrices(hits);
  const missing = Object.entries(retailerNames).filter(
    ([key, name]) =>
      !groups.some((group) => group.retailer === key) &&
      (!store || retailStore(name).includes(retailStore(store))),
  );
  return (
    <>
      <Heading compact>Supermercados</Heading>
      <Meta>Compara el envase: los tamaños pueden variar. Referencia online · Barcelona.</Meta>
      <Text
        accessibilityLiveRegion="polite"
        style={{ color: c.muted, fontSize: 14, lineHeight: 20 }}
      >
        {loading
          ? 'Actualizando precios…'
          : `${groups.length} ${groups.length === 1 ? 'supermercado con precios' : 'supermercados con precios'}`}
      </Text>
      {groups.map(({ retailer, prices }) => (
        <StorePrices
          key={`${text}:${store}:${onlyOffers}:${includeOlder}:${retailer}`}
          prices={prices}
          now={now}
        />
      ))}
      {!hits.length && !loading ? (
        <Notice>
          No hay precios disponibles para esta búsqueda. Prueba otro nombre o cambia los filtros.
        </Notice>
      ) : null}
      {missing.length && !loading ? (
        <Copy muted>
          Sin precio disponible: {missing.map(([, name]) => name).join(', ')}. No significa que no
          vendan el producto.
        </Copy>
      ) : null}
      <Disclosure title="Sobre estos precios" compact>
        {offline ? (
          <Copy muted>
            No se ha podido actualizar el catálogo. Se conserva la última copia disponible con sus
            fechas.
          </Copy>
        ) : null}
        {catalog.sources.some((s) => s.status === 'failed') ? (
          <Copy muted>
            No se pudo renovar:{' '}
            {catalog.sources
              .filter((s) => s.status === 'failed')
              .map((s) => retailerNames[s.retailer])
              .join(', ')}
            . Los datos conservan su fecha original.
          </Copy>
        ) : null}
        <Copy muted>
          Consultamos una muestra de productos y ofertas de seis cadenas, no todo su catálogo.
          Bonpreu / Esclat, Condis, Consum, Carrefour y Alcampo todavía no tienen precios
          integrados. Los datos y detalles se consultan aquí, sin salir de la app.
        </Copy>
      </Disclosure>
    </>
  );
}
