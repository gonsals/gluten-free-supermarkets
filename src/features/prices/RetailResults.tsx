import { useState } from 'react';
import { Linking } from 'react-native';
import {
  retailPrices,
  retailerNames,
  RETAIL_MAX_AGE,
  retailStore,
  type RetailCatalog,
} from '@/src/domain/retailCatalog';
import { quoteMoney } from '@/src/domain/comparison';
import { Action, Card, Copy, Heading, Notice } from '@/src/shared/ui';

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
  const [limit, setLimit] = useState(20);
  const [error, setError] = useState('');
  const hits = retailPrices(catalog, { text, store, onlyOffers, includeOlder, now });
  const related = catalog.entries.filter(
    (p) =>
      !store || retailStore(`${retailerNames[p.retailer]} ${p.scope}`).includes(retailStore(store)),
  );
  const stale =
    related.length > 0 && related.every((p) => now - Date.parse(p.checkedAt) > RETAIL_MAX_AGE);
  return (
    <>
      <Heading>Supermercados</Heading>
      <Copy muted>
        Muestra de precios web, ordenados por importe publicado. Compara el formato y confirma tu
        tienda.
      </Copy>
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
      {stale ? (
        <Notice>
          El catálogo de estas tiendas lleva más de 3 días sin actualizarse. Puedes consultar los
          datos anteriores desde los filtros.
        </Notice>
      ) : null}
      {hits.slice(0, limit).map((p) => (
        <Card key={p.id}>
          <Copy>{p.name}</Copy>
          <Copy>
            {quoteMoney(p.amountMilli)} · {retailerNames[p.retailer]}
          </Copy>
          <Copy muted>
            Formato publicado:{' '}
            {p.quantity || 'no indicado; confirma si es por unidad, peso o envase'}.
          </Copy>
          {p.unitPrice ? (
            <Copy muted>
              {quoteMoney(p.unitPrice.amountMilli)} / {p.unitPrice.unit}
            </Copy>
          ) : null}
          <Copy muted>{p.scope}</Copy>
          <Copy muted>Web oficial · consultado el {p.checkedAt.slice(0, 10)}</Copy>
          {now - Date.parse(p.checkedAt) > RETAIL_MAX_AGE ? (
            <Notice>Precio anterior; confirma el importe actual en la fuente.</Notice>
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
          <Action
            title={`Ver ${p.name} en ${retailerNames[p.retailer]}`}
            secondary
            icon="open-outline"
            onPress={() => {
              void Linking.openURL(p.sourceUrl).catch(() =>
                setError('No se ha podido abrir la tienda.'),
              );
            }}
          />
        </Card>
      ))}
      {hits.length > limit ? (
        <Action
          title="Ver más precios de supermercados"
          secondary
          onPress={() => setLimit((n) => n + 20)}
        />
      ) : null}
      {!hits.length && loading ? <Copy muted>Consultando precios de supermercados…</Copy> : null}
      {!hits.length && !loading ? (
        <Copy muted>
          No hay precios publicados que cumplan estos filtros en el catálogo cargado. Mercadona
          incluye categorías básicas; Aldi y Lidl, las ofertas de su página semanal. Una tienda sin
          resultados puede vender el producto.
        </Copy>
      ) : null}
      {error ? <Notice error>{error}</Notice> : null}
    </>
  );
}
