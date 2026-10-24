import { useState } from 'react';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { isPriceObservation, type PriceObservation } from '@/src/domain/price';
import { config } from '@/src/shared/config';
import { Action, Card, Copy, Notice } from '@/src/shared/ui';
import { PriceList } from './PriceList';

export function SharedPrices({
  barcode,
  localPrices,
}: {
  barcode: string;
  localPrices: PriceObservation[];
}) {
  const [prices, setPrices] = useState<PriceObservation[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot>();
  const [more, setMore] = useState(true);
  if (!config.cloudEnabled) return null;
  async function load() {
    setBusy(true);
    setMessage('');
    try {
      const { getCloud } = await import('@/src/data/firebase/client');
      const dbModule = await import('firebase/firestore');
      const { db } = getCloud();
      const result = await dbModule.getDocs(
        dbModule.query(
          dbModule.collection(db, 'publishedPrices'),
          dbModule.where('barcode', '==', barcode),
          dbModule.orderBy('observedAt', 'desc'),
          ...(cursor ? [dbModule.startAfter(cursor)] : []),
          dbModule.limit(20),
        ),
      );
      const next = result.docs.map((doc) => {
        const price: unknown = { ...doc.data(), id: doc.id };
        if (!isPriceObservation(price)) throw new Error('Precio remoto no válido.');
        return price;
      });
      setPrices((current) => [...current, ...next]);
      setCursor(result.docs.at(-1));
      setMore(result.size === 20);
    } catch {
      setMessage(
        'No se han podido consultar los precios compartidos. El servicio puede no estar activado o necesitar un índice.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    setBusy(true);
    setMessage('');
    try {
      const { getCloud } = await import('@/src/data/firebase/client');
      const { httpsCallable } = await import('firebase/functions');
      const { auth, functions } = getCloud();
      if (!auth.currentUser) throw new Error('Inicia sesión en Ajustes antes de compartir.');
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
      if (!auth.currentUser.emailVerified)
        throw new Error('Verifica tu correo antes de compartir una observación.');
      const selected = localPrices[0];
      if (!selected) throw new Error('Guarda primero una observación de precio.');
      await httpsCallable(functions, 'submitPrice')({ observation: selected });
      setMessage('Observación enviada para revisión. No se publicará hasta ser aprobada.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se ha podido compartir.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Card>
        <Copy>Observaciones compartidas</Copy>
        <Copy muted>
          Consultar precios compartidos utiliza el servicio remoto. Compartir envía tu última
          anotación de este producto (tienda, localidad, precio, fecha y notas) para revisión; no
          envía tu historial.
        </Copy>
        {more ? (
          <Action
            title={
              prices.length ? 'Cargar más precios compartidos' : 'Consultar precios compartidos'
            }
            secondary
            onPress={() => void load()}
            busy={busy}
          />
        ) : null}
        <Action
          title="Enviar mi última anotación para revisión"
          secondary
          onPress={() => void share()}
          disabled={busy || !localPrices.length}
        />
        {message ? <Notice>{message}</Notice> : null}
      </Card>
      {prices.length ? <PriceList prices={prices} shared /> : null}
    </>
  );
}
