import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { AccountPanel } from '@/src/features/account/AccountPanel';
import { LibraryDataPanel } from '@/src/features/library/LibraryDataPanel';
import { Action, Card, Copy, Heading, Notice, Screen } from '@/src/shared/ui';
import { config } from '@/src/shared/config';

export default function SettingsScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  async function open(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      setMessage('No se ha podido abrir el enlace. Comprueba tu conexión.');
    }
  }
  return (
    <Screen>
      <Heading eyebrow="Tu app, tus datos">Ajustes e información</Heading>
      <AccountPanel />
      <LibraryDataPanel />
      {message ? <Notice error>{message}</Notice> : null}
      <Card>
        <Copy>Cómo interpretar los resultados</Copy>
        <Copy muted>
          «Figura como sin gluten» describe una etiqueta de la fuente. «Información insuficiente» no
          significa que el producto contenga gluten. Mostramos las trazas y contradicciones
          disponibles; comprueba el envase y consulta al fabricante si tienes dudas.
        </Copy>
        <Copy muted>
          Las fechas de consulta y modificación no son certificaciones. Los precios observados no
          garantizan disponibilidad ni un precio actual.
        </Copy>
        <Action
          title="Abrir guía de resultados"
          secondary
          icon="information-circle-outline"
          onPress={() => router.push('/results-guide')}
        />
      </Card>
      <Card>
        <Copy>Datos y atribución</Copy>
        <Copy muted>
          Datos: Open Food Facts (ODbL y Database Contents License). Imágenes: Creative Commons
          Attribution ShareAlike, con posibles derechos adicionales de sus elementos gráficos. La
          licencia del código es independiente.
        </Copy>
        <Action
          title="Información sobre Open Food Facts"
          secondary
          onPress={() => void open('https://world.openfoodfacts.org/')}
        />
        <Action
          title="Licencias y condiciones de los datos"
          secondary
          onPress={() =>
            void open(
              'https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/',
            )
          }
        />
        <Action
          title="Ayuda y corrección de datos en Open Food Facts"
          secondary
          onPress={() => void open('https://world.openfoodfacts.org/discover')}
        />
      </Card>
      <Card>
        <Copy>Información técnica y privacidad</Copy>
        <Copy muted>
          SinGluten {config.version} · {config.appEnv}. Origen: Open Food Facts{' '}
          {config.offEnvironment === 'staging' ? '(pruebas)' : '(producción)'}.
        </Copy>
        <Copy muted>
          {config.telemetryUrl
            ? 'Esta instalación tiene un destino de telemetría técnica configurado. Solo se envían códigos de fallo, versión, entorno y tiempos; no el historial, códigos de producto ni correo.'
            : 'No hay telemetría técnica remota configurada.'}
        </Copy>
        <Copy muted>
          Consultar un producto implica comunicarse con Open Food Facts, que recibe la solicitud y
          los datos técnicos de conexión. Abrir sus enlaces está sujeto a sus condiciones. Si
          activas una cuenta, Firebase gestiona la autenticación y los favoritos enviados
          expresamente.
        </Copy>
        <Copy muted>
          Los permisos de cámara solo se utilizan al activar el escáner. Puedes seguir usando la
          entrada manual sin concederlos.
        </Copy>
      </Card>
    </Screen>
  );
}
