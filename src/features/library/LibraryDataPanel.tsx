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
  const [confirmDelete, setConfirmDelete] = useState(false);
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
        setConfirmDelete(false);
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
        await repository.clearAll();
        if (token === generation.current) {
          setConfirmDelete(false);
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
    return `${value.history.length} ${value.history.length === 1 ? 'consulta' : 'consultas'}, ${favorites} ${favorites === 1 ? 'favorito' : 'favoritos'} y ${value.prices.length} ${value.prices.length === 1 ? 'precio privado' : 'precios privados'}`;
  };
  return (
    <>
      <Card>
        <Copy>Biblioteca y privacidad</Copy>
        <Copy muted>
          Las consultas y anotaciones privadas se guardan en este dispositivo. La nube está{' '}
          {config.cloudEnabled ? 'activada para funciones opcionales' : 'desactivada'}. El historial
          no se sube al sincronizar favoritos.
        </Copy>
        <Copy muted>
          Conservamos hasta 1.000 consultas, 250 favoritos activos y 1.000 precios privados.
          Desinstalar la app o borrar los datos del navegador puede eliminarlos.
        </Copy>
        <Copy muted>
          Exporta una copia para conservarlos o trasladarlos. Restaurar una copia sustituye toda la
          biblioteca local. Aceptamos archivos JSON de SinGluten de hasta 20 MB; revisa el resumen
          antes de confirmar. Las copias no están cifradas.
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
          onPress={() => setConfirmDelete(true)}
          disabled={!ready || busy}
        />
        {busy ? <Notice>Operación en curso…</Notice> : null}
        {error ? <Notice error>{error}</Notice> : null}
        {message ? <Notice error={failed}>{message}</Notice> : null}
      </Card>
      <Confirm
        title="Borrar biblioteca local"
        visible={confirmDelete}
        message="Se borrarán historial, favoritos, fichas y precios privados de este dispositivo. Exporta primero los datos que quieras conservar. Los favoritos remotos no se eliminan."
        onCancel={() => setConfirmDelete(false)}
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
