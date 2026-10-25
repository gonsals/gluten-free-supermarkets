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
      <Heading eyebrow="Tu compra, a tu ritmo" hero>
        Conoce lo que{'\n'}te llevas.
      </Heading>
      <Copy muted>
        Consulta la información sobre gluten. Guarda lo que quieras volver a encontrar.
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
          <Ionicons name="barcode-outline" size={82} color={c.accent} />
        </View>
        <Action
          title="Escanear producto"
          icon="scan-outline"
          onPress={() => router.navigate('/scan')}
        />
        <Action
          title="Introducir código manualmente"
          secondary
          icon="keypad-outline"
          onPress={() => router.navigate({ pathname: '/scan', params: { manual: '1' } })}
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
        <Copy>Información clara, también cuando faltan datos.</Copy>
        <Copy muted>
          Mostramos lo que recoge Open Food Facts, incluidas trazas y contradicciones. Comprueba
          siempre el etiquetado del envase.
        </Copy>
      </View>
    </Screen>
  );
}
