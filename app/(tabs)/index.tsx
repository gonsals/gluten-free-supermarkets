import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useLibrary } from '@/src/features/library/useLibrary';
import { ProductRow } from '@/src/features/library/ProductRow';
import { Action, Card, Copy, Heading, Notice, Screen } from '@/src/shared/ui';
import { usePalette } from '@/src/shared/theme';

export default function HomeScreen() {
  const router = useRouter();
  const c = usePalette();
  const { data, error } = useLibrary();
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name="leaf" size={30} color={c.accent} />
        <Text style={{ color: c.accent, fontWeight: '800', fontSize: 20 }}>SinGluten</Text>
      </View>
      <Heading eyebrow="Compra con información">Conoce lo que llevas a tu cesta.</Heading>
      <Copy muted>
        Escanea un alimento o introduce su código para consultar sus etiquetas, ingredientes y
        posibles trazas.
      </Copy>
      <Action
        title="Consultar un producto"
        icon="scan-outline"
        onPress={() => router.navigate('/scan')}
      />
      <Action
        title="Introducir código manualmente"
        secondary
        icon="keypad-outline"
        onPress={() => router.navigate({ pathname: '/scan', params: { manual: '1' } })}
      />
      {error ? <Notice error>{error}</Notice> : null}
      <Card>
        <Copy>Información clara, también cuando faltan datos.</Copy>
        <Copy muted>
          Mostramos lo que recoge Open Food Facts y te indicamos si hay información insuficiente o
          contradictoria. Comprueba siempre el etiquetado del envase.
        </Copy>
      </Card>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: c.accent, fontWeight: '800', fontSize: 28 }}>
            {Object.values(data.favorites).filter((x) => !x.deleted).length}
          </Text>
          <Copy muted>Favoritos</Copy>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: c.accent, fontWeight: '800', fontSize: 28 }}>
            {data.history.length}
          </Text>
          <Copy muted>Consultas</Copy>
        </Card>
      </View>
      <Card>
        <Copy>Consultas recientes</Copy>
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
    </Screen>
  );
}
