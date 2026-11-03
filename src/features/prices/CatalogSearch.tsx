import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { useLibrary } from '@/src/features/library/useLibrary';
import { namedPrices, type NamedProduct } from '@/src/domain/catalogSearch';
import { privateQuotes, quoteMoney } from '@/src/domain/comparison';
import { Action, Card, Copy, Field, Heading, Notice } from '@/src/shared/ui';
import { Disclosure } from '@/src/shared/Disclosure';
import { useCatalogSearch } from './useCatalogSearch';

export function CatalogSearch() {
  const router = useRouter();
  const { data } = useLibrary();
  const remote = useCatalogSearch();
  const [text, setText] = useState(''),
    [store, setStore] = useState('');
  const [onlyOffers, setOnlyOffers] = useState(false),
    [includeOlder, setIncludeOlder] = useState(false);
  const [limit, setLimit] = useState(20),
    [linkError, setLinkError] = useState('');
  const local = useMemo(() => {
    const products = new Map<string, NamedProduct>();
    for (const p of [
      [...data.history].reverse(),
      Object.values(data.favorites).filter((p) => !p.deleted),
    ].flat())
      products.set(p.barcode, { barcode: p.barcode, name: p.name, brands: p.brands, quantity: '' });
    for (const p of data.basket)
      if (p.name && !products.has(p.barcode))
        products.set(p.barcode, { barcode: p.barcode, name: p.name, brands: '', quantity: '' });
    return { products: [...products.values()], quotes: privateQuotes(data.prices) };
  }, [data.history, data.favorites, data.basket, data.prices]);
  const hits = remote.submitted
    ? namedPrices(
        [...local.products, ...(remote.result?.products ?? [])],
        [...local.quotes, ...(remote.result?.quotes ?? [])],
        { ...remote.submitted, onlyOffers, includeOlder },
      )
    : [];
  const dirty =
    remote.submitted &&
    (text.trim().replace(/\s+/g, ' ') !== remote.submitted.text ||
      store.trim().replace(/\s+/g, ' ') !== remote.submitted.store);
  async function open(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      setLinkError('No se ha podido abrir el enlace.');
    }
  }
  const search = () => {
    setLimit(20);
    void remote.search(text, store);
  };
  return (
    <>
      <Card>
        <Field
          label="Buscar productos"
          placeholder="Huevos, leche, arroz…"
          value={text}
          onChangeText={setText}
          maxLength={80}
          returnKeyType="search"
          onSubmitEditing={search}
        />
        <Field
          label="Tienda o localidad (opcional)"
          placeholder="Ej. Mercadona o Madrid"
          value={store}
          onChangeText={setStore}
          maxLength={100}
          returnKeyType="search"
          onSubmitEditing={search}
        />
        <Action title="Buscar precios" icon="search" onPress={search} busy={remote.loading} />
        <Copy muted>
          La consulta pública envía el nombre a Open Prices. El filtro de tienda se aplica aquí; tus
          anotaciones no se envían.
        </Copy>
        {remote.loading ? (
          <Action title="Cancelar búsqueda de precios" secondary onPress={remote.cancel} />
        ) : null}
      </Card>
      {remote.submitted ? (
        <>
          <Heading>Precios para «{remote.submitted.text}»</Heading>
          <Copy muted>
            España (datos públicos) · {remote.submitted.store || 'Todas las tiendas'} ·{' '}
            {includeOlder ? 'Incluye precios anteriores' : 'Últimos 7 días'} ·{' '}
            {onlyOffers ? 'Solo ofertas observadas' : 'Precios y ofertas'}
          </Copy>
          {dirty ? (
            <Copy muted>Pulsa «Buscar precios» para aplicar los cambios del buscador.</Copy>
          ) : null}
          <Copy muted>
            De menor a mayor por envase entre los datos cargados. Revisa el formato: los productos
            pueden ser distintos.
          </Copy>
        </>
      ) : (
        <Copy muted>
          Busca por nombre para ver precios anotados por tienda y descuentos observados. La
          cobertura pública puede ser limitada.
        </Copy>
      )}
      {remote.error ? <Notice error>{remote.error}</Notice> : null}
      {remote.cancelled ? <Notice>Búsqueda cancelada. Puedes volver a buscar.</Notice> : null}
      <Disclosure title="Filtrar precios y ofertas">
        <Action
          title="Solo ofertas"
          selected={onlyOffers}
          secondary={!onlyOffers}
          onPress={() => {
            setOnlyOffers((value) => !value);
            setLimit(20);
          }}
        />
        <Action
          title="Incluir precios anteriores"
          selected={includeOlder}
          secondary={!includeOlder}
          onPress={() => {
            setIncludeOlder((value) => !value);
            setLimit(20);
          }}
        />
      </Disclosure>
      {includeOlder && remote.submitted ? (
        <Notice>
          Incluyes precios antiguos. No los tomes como precios u ofertas vigentes; revisa la fecha y
          la fuente.
        </Notice>
      ) : null}
      {hits.slice(0, limit).map(({ product, quote }) => (
        <Card key={`${product.barcode}:${quote.id}`}>
          <Copy>{product.name}</Copy>
          {product.brands ? <Copy muted>{product.brands}</Copy> : null}
          <Copy muted>
            Formato: {product.quantity || 'no indicado; compruébalo en la ficha o el envase'}.
          </Copy>
          <Copy>
            {quoteMoney(quote.amountMilli)} por envase · {quote.store}
          </Copy>
          <Copy muted>
            {quote.location} · observado el {quote.observedAt.slice(0, 10)}
          </Copy>
          <Copy muted>
            {quote.source === 'private'
              ? 'Tu anotación privada'
              : 'Open Prices · aportación pública'}
          </Copy>
          {quote.isOffer ? (
            <Notice>Oferta observada. Confirma su vigencia y condiciones en la tienda.</Notice>
          ) : null}
          {quote.conditional ? (
            <Copy>{quote.conditions || 'Precio con condiciones; consulta el detalle.'}</Copy>
          ) : null}
          {quote.offerEndsAt ? (
            <Copy muted>Fin de oferta anotado: {quote.offerEndsAt.slice(0, 10)}.</Copy>
          ) : null}
          <Action
            title={`Comparar ${product.name}`}
            secondary
            onPress={() =>
              router.push({
                pathname: '/prices/[barcode]',
                params: {
                  barcode: product.barcode,
                  name: product.name,
                  offers: quote.conditional ? '1' : undefined,
                  older: includeOlder ? '1' : undefined,
                },
              })
            }
          />
          {quote.sourceUrl ? (
            <Action
              title={`Ver precio en la fuente de ${quote.store}`}
              secondary
              icon="open-outline"
              onPress={() => void open(quote.sourceUrl!)}
            />
          ) : null}
        </Card>
      ))}
      {hits.length > limit ? (
        <Action
          title="Mostrar más precios encontrados"
          secondary
          onPress={() => setLimit((value) => value + 20)}
        />
      ) : null}
      {remote.submitted && !remote.loading && !remote.error && !remote.cancelled && !hits.length ? (
        <Notice>
          {onlyOffers
            ? 'No hay ofertas que cumplan estos filtros entre los datos cargados.'
            : 'No hay precios recientes que cumplan esta búsqueda en la muestra disponible. No significa que el producto no se venda.'}
        </Notice>
      ) : null}
      {remote.submitted &&
      !includeOlder &&
      !remote.loading &&
      !hits.length &&
      Boolean(remote.result?.quotes.length) ? (
        <Action
          title="Ver precios anteriores de esta búsqueda"
          secondary
          onPress={() => setIncludeOlder(true)}
        />
      ) : null}
      {remote.result ? (
        <Copy muted>
          {remote.result.products.length} productos cargados de {remote.result.total} coincidencias
          públicas.{' '}
          {remote.result.pricesLimited
            ? 'Se ha alcanzado el límite de precios de esta página; pueden faltar tiendas.'
            : ''}{' '}
          {remote.result.skipped ? `${remote.result.skipped} registros no utilizados.` : ''}
        </Copy>
      ) : null}
      {remote.result?.more && remote.submitted ? (
        <Action
          title="Buscar más productos coincidentes"
          secondary
          busy={remote.loading}
          onPress={() =>
            void remote.search(
              remote.submitted!.text,
              remote.submitted!.store,
              remote.result!.page + 1,
            )
          }
        />
      ) : null}
      {remote.result?.page === 3 && remote.result.products.length < remote.result.total ? (
        <Notice>
          La búsqueda ha alcanzado su límite. Puede haber más productos en la fuente; prueba con un
          nombre más concreto.
        </Notice>
      ) : null}
      {remote.submitted && remote.error ? (
        <Action
          title="Reintentar búsqueda pública"
          secondary
          disabled={remote.loading}
          onPress={() => void remote.search(remote.submitted!.text, remote.submitted!.store)}
        />
      ) : null}
      <Disclosure title="Ver ofertas oficiales de supermercados">
        <Copy muted>
          Abre la web del supermercado para consultar promociones vigentes. Puede pedirte una tienda
          o un código postal; sus precios no se incorporan automáticamente al ranking.
        </Copy>
        <Action
          title="Ofertas oficiales de Lidl"
          secondary
          icon="open-outline"
          onPress={() => void open('https://www.lidl.es/c/store/ofertas-semanales/a10089449')}
        />
        <Action
          title="Ofertas oficiales de Carrefour"
          secondary
          icon="open-outline"
          onPress={() => void open('https://www.carrefour.es/supermercado/c/cat20009/c')}
        />
      </Disclosure>
      {linkError ? <Notice error>{linkError}</Notice> : null}
      <Copy muted>
        Catálogo y precios: Open Prices/ODbL · ubicaciones: © OpenStreetMap contributors/ODbL. Son
        aportaciones públicas; no un catálogo completo ni precios garantizados de cada supermercado.
      </Copy>
    </>
  );
}
