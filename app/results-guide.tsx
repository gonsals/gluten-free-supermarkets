import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { glutenCopy } from '@/src/domain/product';
import { assessmentAppearance, usePalette } from '@/src/shared/theme';
import { Action, Card, Copy, Heading, Screen } from '@/src/shared/ui';

export default function ResultsGuideScreen() {
  const router = useRouter();
  const c = usePalette();
  return (
    <Screen>
      <Heading eyebrow="Entender la información">Cómo leer una ficha</Heading>
      <Copy>
        El resumen describe los datos de Open Food Facts. La app no certifica el producto ni
        comprueba el envase que tienes delante.
      </Copy>
      {Object.entries(glutenCopy).map(([state, copy]) => {
        const tone = assessmentAppearance(state, c);
        return (
          <Card key={state} style={{ backgroundColor: tone.background, borderColor: tone.border }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Ionicons name={copy.icon} color={tone.foreground} size={24} accessible={false} />
              <Text
                accessibilityRole="header"
                style={{ flex: 1, color: tone.foreground, fontSize: 19, fontWeight: '700' }}
              >
                {copy.title}
              </Text>
            </View>
            <Copy>{copy.description}</Copy>
            {state === 'unknown' ? (
              <Copy>No significa que el producto contenga gluten.</Copy>
            ) : null}
          </Card>
        );
      })}
      <Card>
        <Heading eyebrow="Señal independiente">Las trazas también cuentan</Heading>
        <Copy>
          Las trazas se muestran aparte, incluso cuando la fuente incluye una declaración sin
          gluten. Que el campo esté vacío no confirma que no haya trazas.
        </Copy>
      </Card>
      <Card>
        <Heading eyebrow="Procedencia y fechas">Un dato guardado tiene fecha</Heading>
        <Copy>
          La fecha de consulta indica cuándo se descargó la ficha. La fecha de modificación indica
          cuándo cambió en la fuente. Ninguna de ellas es una fecha de certificación.
        </Copy>
        <Copy muted>
          Una ficha guardada puede consultarse sin conexión. Para traer datos nuevos, utiliza
          Actualizar información cuando tengas red. Si la actualización falla, la ficha conserva su
          fecha anterior.
        </Copy>
      </Card>
      <Card>
        <Copy>
          Revisa las evidencias y el etiquetado del envase. Si hay contradicciones o dudas sobre los
          datos, consulta al fabricante. Puedes abrir la fuente desde la ficha para consultar o
          comunicar una corrección.
        </Copy>
      </Card>
      <Action
        title="Consultar un producto"
        icon="scan-outline"
        onPress={() => router.navigate('/scan')}
      />
    </Screen>
  );
}
