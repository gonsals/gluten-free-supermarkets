import { useState } from 'react';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { money } from '@/src/domain/price';
import { config } from '@/src/shared/config';
import { Action, Card, Copy, Heading, Notice, Screen } from '@/src/shared/ui';

interface Submission {
  id: string;
  store: string;
  location: string;
  barcode: string;
  amountMinor: number;
  observedAt: string;
  notes: string;
}
export default function ModerationScreen() {
  const [items, setItems] = useState<Submission[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot>();
  const [more, setMore] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function load() {
    setBusy(true);
    setMessage('');
    try {
      const { getCloud } = await import('@/src/data/firebase/client');
      const { auth, db } = getCloud();
      if (!auth.currentUser || (await auth.currentUser.getIdTokenResult()).claims.admin !== true)
        throw new Error('Esta función requiere una cuenta autorizada para moderar.');
      const sdk = await import('firebase/firestore');
      const result = await sdk.getDocs(
        sdk.query(
          sdk.collection(db, 'priceObservations'),
          sdk.where('status', '==', 'pending'),
          sdk.orderBy('receivedAt', 'asc'),
          ...(cursor ? [sdk.startAfter(cursor)] : []),
          sdk.limit(20),
        ),
      );
      setItems((current) => [
        ...current,
        ...result.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Submission),
      ]);
      setCursor(result.docs.at(-1));
      setMore(result.size === 20);
      if (result.empty) setMessage('No hay más contribuciones pendientes.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se ha podido cargar la cola.');
    } finally {
      setBusy(false);
    }
  }
  async function moderate(id: string, status: 'published' | 'rejected') {
    setBusy(true);
    setMessage('');
    try {
      const { getCloud } = await import('@/src/data/firebase/client');
      const { httpsCallable } = await import('firebase/functions');
      await httpsCallable(getCloud().functions, 'moderatePrice')({ id, status });
      setItems((current) => current.filter((item) => item.id !== id));
      setMessage(
        status === 'published'
          ? 'Observación publicada sin datos de autoría.'
          : 'Contribución rechazada.',
      );
    } catch {
      setMessage(
        'No se ha podido completar la revisión. Comprueba tus permisos y vuelve a intentarlo.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Heading>Revisión de precios</Heading>
      <Copy muted>
        Comprueba tienda, localidad, fecha, formato y condiciones antes de aprobar. La publicación
        elimina los identificadores de la persona que aportó el precio.
      </Copy>
      {config.cloudEnabled ? (
        <>
          {more ? (
            <Action
              title={
                items.length ? 'Cargar más contribuciones' : 'Cargar contribuciones pendientes'
              }
              onPress={() => void load()}
              busy={busy}
            />
          ) : null}
          {items.map((item) => (
            <Card key={item.id}>
              <Copy>
                {item.store} · {item.location}
              </Copy>
              <Copy>
                {money(item.amountMinor)} · {item.barcode}
              </Copy>
              <Copy muted>
                {item.observedAt} · {item.notes || 'Sin condiciones adicionales'}
              </Copy>
              <Action
                title="Aprobar publicación"
                onPress={() => void moderate(item.id, 'published')}
                disabled={busy}
              />
              <Action
                title="Rechazar contribución"
                secondary
                danger
                onPress={() => void moderate(item.id, 'rejected')}
                disabled={busy}
              />
            </Card>
          ))}
          {message ? <Notice>{message}</Notice> : null}
        </>
      ) : (
        <Notice>La nube está desactivada en esta instalación.</Notice>
      )}
    </Screen>
  );
}
