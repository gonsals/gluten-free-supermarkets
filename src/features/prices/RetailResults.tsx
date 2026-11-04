import { useState } from 'react';
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

function PriceDetails({ price: p, now }: { price: RetailPrice; now: number }) {
  return (
    <View style={{ gap: 6 }}>
      <Copy>{p.name}</Copy>
      <Copy muted>
        Formato publicado: {p.quantity || 'no indicado; confirma el contenido del envase'}.
      </Copy>
      {p.unitPrice ? (
        <Copy muted>
          {quoteMoney(p.unitPrice.amountMilli)} / {p.unitPrice.unit}
        </Copy>
      ) : null}
      {p.isOffer ? (
        <Copy>
          Oferta publicada
          {p.endsAt
            ? ` · hasta ${new Date(p.endsAt).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })}`
            : ''}
          .
        </Copy>
      ) : null}
      {p.conditions ? <Copy>{p.conditions}</Copy> : null}
      <Copy muted>Web oficial · consultado el {p.checkedAt.slice(0, 10)}</Copy>
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
    <Card style={{ gap: 10, padding: 16 }}>
      <Text style={{ color: c.accent, fontSize: 24, fontWeight: '700' }}>
        Desde {quoteMoney(first.amountMilli)} · {name}
      </Text>
      <PriceDetails price={first} now={now} />
      <Disclosure
        title={
          prices.length > 1 ? `Ver los ${prices.length} precios de ${name}` : `Detalles de ${name}`
        }
      >
        <Copy muted>{first.scope}</Copy>
        {prices.slice(1, limit).map((p) => (
          <View
            key={p.id}
            style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 12, gap: 6 }}
          >
            <Copy>
              {quoteMoney(p.amountMilli)} · {name}
            </Copy>
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
  const hits = retailPrices(catalog, { text, store, onlyOffers, includeOlder, now });
  const groups = groupRetailPrices(hits);
  const missing = Object.entries(retailerNames).filter(
    ([key, name]) =>
      !groups.some((group) => group.retailer === key) &&
      (!store || retailStore(name).includes(retailStore(store))),
  );
  return (
    <>
      <Heading>Supermercados</Heading>
      <Copy muted>
        El precio más bajo disponible de cada cadena. Los envases pueden ser distintos. Precios
        online de referencia para Barcelona; pueden variar según tu tienda.
      </Copy>
      {loading ? <Copy muted>Actualizando precios…</Copy> : null}
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
      <Disclosure title="Sobre estos precios">
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
