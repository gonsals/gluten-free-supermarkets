import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  BACKUP_SIZE_MESSAGE,
  parseLibraryBackup,
  type LibraryBackup,
} from '@/src/data/local/backup';
import type { LibraryData } from '@/src/data/local/library';
import { Confirm } from '@/src/shared/Confirm';
import { config } from '@/src/shared/config';
import { exportData } from '@/src/shared/exportData';
import { importData } from '@/src/shared/importData';
import { Action, Card, Copy, Notice } from '@/src/shared/ui';
import { useLibrary } from './useLibrary';

interface PendingBackup {
  contents: string;
  backup: LibraryBackup;
  expectedData: LibraryData;
}
export function LibraryDataPanel() {
  const { repository, ready, error, data } = useLibrary();
  const [confirmDelete, setConfirmDelete] = useState<LibraryData | null>(null);
  const [pending, setPending] = useState<PendingBackup | null>(null);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const generation = useRef(0);
  useFocusEffect(
    useCallback(
      () => () => {
        generation.current++;
        setPending(null);
        setConfirmDelete(null);
      },
      [],
    ),
  );

  async function run(action: 'export' | 'delete' | 'pick' | 'restore') {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage('');
    setFailed(false);
    const token = generation.current;
    try {
      if (action === 'export') {
        await exportData(await repository.exportData());
        if (token === generation.current)
          setMessage(
            'Exportación preparada. El archivo contiene tu biblioteca privada; guárdalo en un lugar seguro.',
          );
      } else if (action === 'pick') {
        const expectedData = repository.getSnapshot().data;
        const contents = await importData();
        if (token !== generation.current || contents === null) return;
        setPending({ contents, backup: parseLibraryBackup(contents), expectedData });
      } else if (action === 'restore' && pending) {
        await repository.restoreBackup(pending.contents, pending.expectedData);
        if (token === generation.current) {
          setPending(null);
          setMessage(
            'Copia restaurada en este dispositivo. Las fechas originales se conservan; no se han consultado ni subido datos a la nube.',
          );
        }
      } else if (action === 'delete') {
        await repository.clearAll(confirmDelete ?? undefined);
        if (token === generation.current) {
          setConfirmDelete(null);
          setMessage(
            'Datos locales eliminados. Esto no elimina una cuenta ni los favoritos ya sincronizados.',
          );
        }
      }
    } catch (error) {
      if (token === generation.current) {
        setFailed(true);
        if (action === 'pick') {
          setMessage(
            error instanceof Error && error.message === BACKUP_SIZE_MESSAGE
              ? error.message
              : 'No se ha podido leer una copia válida y compatible de SinGluten. Tus datos no han cambiado.',
          );
        } else {
          setMessage(
            error instanceof Error && error.message !== 'storage_error'
              ? error.message
              : 'No se ha podido completar la operación. Tus datos no han cambiado.',
          );
        }
        if (action === 'restore') setPending(null);
      }
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const count = (value: LibraryData) => {
    const favorites = Object.values(value.favorites).filter((item) => !item.deleted).length;
    const packages = value.basket.reduce((total, line) => total + line.quantity, 0);
    return `${value.history.length} ${value.history.length === 1 ? 'consulta' : 'consultas'}, ${favorites} ${favorites === 1 ? 'favorito' : 'favoritos'} y ${value.prices.length} ${value.prices.length === 1 ? 'precio privado' : 'precios privados'}; cesta: ${value.basket.length} ${value.basket.length === 1 ? 'producto' : 'productos'} y ${packages} ${packages === 1 ? 'envase' : 'envases'}; ${value.branches.length} sucursales identificadas`;
  };
  return (
    <>
      <Card>
        <Copy>Biblioteca y privacidad</Copy>
        <Copy muted>
          La cesta, consultas y anotaciones privadas se guardan en este dispositivo. La nube está{' '}
          {config.cloudEnabled ? 'activada para funciones opcionales' : 'desactivada'}. El historial
          no se sube al sincronizar favoritos.
        </Copy>
        <Copy muted>
          Conservamos hasta 1.000 consultas, 250 favoritos activos, 1.000 precios privados y una
          cesta de hasta 100 productos con 99 envases por producto. Desinstalar la app o borrar los
          datos del navegador puede eliminarlos.
        </Copy>
        <Copy muted>
          Exporta una copia para conservarlos o trasladarlos. Restaurar una copia sustituye toda la
          biblioteca local. Aceptamos archivos JSON de SinGluten de hasta 20 MB; revisa el resumen
          antes de confirmar. Las copias v3 incluyen cesta y sucursales identificadas. Las v2
          recuperan la cesta sin sucursales; las v1, sin cesta ni sucursales. Una app antigua no
          abre copias v3. Las copias no están cifradas.
        </Copy>
        <Action
          title="Exportar mis datos"
          secondary
          icon="download-outline"
          onPress={() => void run('export')}
          disabled={!ready || busy}
        />
        <Action
          title="Restaurar una copia"
          secondary
          icon="folder-open-outline"
          onPress={() => void run('pick')}
          disabled={!ready || busy}
        />
        <Action
          title="Borrar todos los datos locales"
          secondary
          danger
          onPress={() => setConfirmDelete(data)}
          disabled={!ready || busy}
        />
        {busy ? <Notice>Operación en curso…</Notice> : null}
        {error ? <Notice error>{error}</Notice> : null}
        {!ready && error ? (
          <Action
            title="Reintentar abrir biblioteca"
            secondary
            onPress={() => void repository.refresh()}
          />
        ) : null}
        {message ? <Notice error={failed}>{message}</Notice> : null}
      </Card>
      <Confirm
        title="Borrar biblioteca local"
        visible={confirmDelete !== null}
        message="Se borrarán cesta, sucursales y vínculos, historial, favoritos, fichas y precios privados de este dispositivo. Exporta primero los datos que quieras conservar. Los favoritos remotos no se eliminan."
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => void run('delete')}
        busy={busy}
      />
      <Confirm
        title="Restaurar biblioteca local"
        visible={pending !== null}
        message={
          pending
            ? `Copia del ${new Date(pending.backup.exportedAt).toLocaleString('es-ES')}: ${count(pending.backup.data)} y ${pending.backup.products.length} ${pending.backup.products.length === 1 ? 'ficha guardada' : 'fichas guardadas'}.\n\nSustituirá los datos actuales: ${count(data)}. No se combinarán bibliotecas ni se vinculará ninguna cuenta. Exporta antes los datos actuales que quieras conservar.\n\nLa información procede del archivo y puede ser antigua o haber sido modificada. No certifica que un producto sea apto. Comprueba el envase y la fuente.`
            : ''
        }
        confirmLabel="Sustituir y restaurar"
        onCancel={() => setPending(null)}
        onConfirm={() => void run('restore')}
        busy={busy}
      />
    </>
  );
}
