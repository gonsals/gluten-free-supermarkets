import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { AccountPanel } from '@/src/features/account/AccountPanel';
import { useLibrary } from '@/src/features/library/useLibrary';
import { Action, Card, Copy, Heading, Notice, Screen } from '@/src/shared/ui';
import { Confirm } from '@/src/shared/Confirm';
import { config } from '@/src/shared/config';
import { exportData } from '@/src/shared/exportData';

export default function SettingsScreen() {
  const router = useRouter();
  const { repository, ready, error } = useLibrary();
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function run(action: 'export' | 'delete') {
    setBusy(true);
    setMessage('');
    try {
      if (action === 'export') {
        await exportData(await repository.exportData());
        setMessage(
          'Exportación preparada. El archivo contiene tu biblioteca privada; compártelo solo si lo deseas.',
        );
      } else {
        await repository.clearAll();
        setConfirm(false);
        setMessage(
          'Datos locales eliminados. Esto no elimina una cuenta ni los favoritos ya sincronizados.',
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error && error.message !== 'storage_error'
          ? error.message
          : 'No se ha podido completar la operación.',
      );
    } finally {
      setBusy(false);
    }
  }
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
      <Card>
        <Copy>Biblioteca y privacidad</Copy>
        <Copy muted>
          Las consultas y anotaciones privadas se guardan en este dispositivo. La nube está{' '}
          {config.cloudEnabled ? 'activada para funciones opcionales' : 'desactivada'}. El historial
          no se sube al sincronizar favoritos.
        </Copy>
        <Copy muted>
          Conservamos hasta 1.000 consultas, 250 favoritos activos y 1.000 precios privados. Puedes
          exportarlos o borrarlos. Desinstalar la app o borrar los datos del navegador puede
          eliminarlos.
        </Copy>
        <Action
          title="Exportar mis datos"
          secondary
          onPress={() => void run('export')}
          disabled={!ready}
          busy={busy}
          icon="download-outline"
        />
        <Action
          title="Borrar todos los datos locales"
          secondary
          danger
          onPress={() => setConfirm(true)}
          disabled={!ready || busy}
        />
        {error ? <Notice error>{error}</Notice> : null}
        {message ? <Notice>{message}</Notice> : null}
      </Card>
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
      <Confirm
        visible={confirm}
        message="Se borrarán historial, favoritos, fichas y precios privados de este dispositivo. Exporta primero los datos que quieras conservar. Los favoritos remotos no se eliminan."
        onCancel={() => setConfirm(false)}
        onConfirm={() => void run('delete')}
        busy={busy}
      />
    </Screen>
  );
}
