import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useLibrary } from '@/src/features/library/useLibrary';
import { ProductRow } from '@/src/features/library/ProductRow';
import { Action, Card, Copy, Heading, Notice, Screen } from '@/src/shared/ui';
import { usePalette } from '@/src/shared/theme';
import { Brand } from '@/src/shared/Brand';
import { CatalogSearch } from '@/src/features/prices/CatalogSearch';
import { Disclosure } from '@/src/shared/Disclosure';

export default function HomeScreen() {
  const router = useRouter();
  const c = usePalette();
  const { data, error } = useLibrary();
  return (
    <Screen>
      <Brand />
      <Heading>¿Qué quieres comprar?</Heading>
      {error ? <Notice error>{error}</Notice> : null}
      <CatalogSearch />
      <Disclosure title="Tu compra y biblioteca" compact>
        <View style={{ gap: 12 }}>
          <Action
            title="Comparar precios"
            icon="pricetags-outline"
            secondary
            onPress={() => router.navigate('/prices')}
          />
          <Action
            title={`Mi cesta (${data.basket.length})`}
            icon="basket-outline"
            secondary
            onPress={() => router.push('/basket')}
          />
          <Action
            title="Escanear un producto"
            secondary
            icon="scan-outline"
            onPress={() => router.navigate('/scan')}
          />
        </View>
        <Card>
          <View style={{ gap: 6 }}>
            <Text
              accessibilityRole="header"
              style={{ color: c.ink, fontSize: 18, fontWeight: '600' }}
            >
              Tu biblioteca
            </Text>
            <Text style={{ color: c.muted, fontSize: 14, lineHeight: 22 }}>
              {Object.values(data.favorites).filter((x) => !x.deleted).length} favoritos ·{' '}
              {data.history.length} consultas · en este dispositivo
            </Text>
          </View>
          {data.history.length ? (
            data.history
              .slice(0, 2)
              .map((entry) => <ProductRow key={entry.id} product={entry} date={entry.scannedAt} />)
          ) : (
            <Copy muted>Aquí encontrarás los productos que consultes.</Copy>
          )}
          <Action
            title="Abrir mi biblioteca"
            secondary
            onPress={() => router.navigate('/library')}
          />
        </Card>
        <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 20, gap: 8 }}>
          <Copy muted>
            Sin cuenta. Tus datos se guardan en este dispositivo. Los precios disponibles pueden
            cambiar; en cada ficha también puedes revisar la información sobre gluten.
          </Copy>
        </View>
      </Disclosure>
    </Screen>
  );
}
