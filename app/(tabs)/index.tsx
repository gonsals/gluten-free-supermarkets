import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useLibrary } from '@/src/features/library/useLibrary';
import { ProductRow } from '@/src/features/library/ProductRow';
import { Action, Card, Copy, Heading, Notice, Screen } from '@/src/shared/ui';
import { usePalette } from '@/src/shared/theme';
import { Brand } from '@/src/shared/Brand';

export default function HomeScreen() {
  const router = useRouter();
  const c = usePalette();
  const { data, error } = useLibrary();
  return (
    <Screen>
      <Brand />
      <Heading eyebrow="Compara antes de comprar" hero>
        Tu compra,{'\n'}mejor de precio.
      </Heading>
      <Copy muted>
        Compara precios del mismo producto por tienda y fecha. La información sobre gluten te ayuda
        a elegir también según tus necesidades.
      </Copy>
      <View style={{ gap: 12 }}>
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={{
            backgroundColor: c.soft,
            borderTopLeftRadius: 72,
            borderTopRightRadius: 72,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            height: 120,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="pricetags-outline" size={82} color={c.accent} />
        </View>
        <Action
          title="Comparar precios"
          icon="pricetags-outline"
          onPress={() => router.navigate('/prices')}
        />
        <Action
          title="Escanear un producto"
          secondary
          icon="scan-outline"
          onPress={() => router.navigate('/scan')}
        />
      </View>
      {error ? <Notice error>{error}</Notice> : null}
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
            .slice(0, 3)
            .map((entry) => <ProductRow key={entry.id} product={entry} date={entry.scannedAt} />)
        ) : (
          <Copy muted>
            Tu biblioteca empieza con el primer producto que consultes. Se guardará en este
            dispositivo.
          </Copy>
        )}
        <Action title="Abrir mi biblioteca" secondary onPress={() => router.navigate('/library')} />
      </Card>
      <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 20, gap: 8 }}>
        <Copy>Precios con contexto, sin falsas ofertas.</Copy>
        <Copy muted>
          Tus anotaciones son privadas. Las aportaciones públicas de Open Prices tienen cobertura
          limitada y no garantizan stock ni precio actual. En la ficha puedes revisar también
          gluten, trazas e ingredientes.
        </Copy>
      </View>
    </Screen>
  );
}
