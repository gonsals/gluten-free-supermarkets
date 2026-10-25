import { useState } from 'react';
import { Text } from 'react-native';
import { isPriceCurrent, money, unitPrice, type PriceObservation } from '@/src/domain/price';
import { Action, Card, Copy, Notice } from '@/src/shared/ui';
import { usePalette } from '@/src/shared/theme';
import { Confirm } from '@/src/shared/Confirm';

export function PriceList({
  prices,
  onDelete,
  shared = false,
}: {
  prices: PriceObservation[];
  onDelete?: (id: string) => Promise<void>;
  shared?: boolean;
}) {
  const c = usePalette();
  const [limit, setLimit] = useState(20);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const sorted = [...prices].sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  async function remove() {
    if (!deleting || !onDelete) return;
    try {
      await onDelete(deleting);
      setDeleting(null);
    } catch {
      setMessage('No se ha podido eliminar la observación.');
    }
  }
  return (
    <>
      {message ? <Notice error>{message}</Notice> : null}
      {sorted.length === 0 ? (
        <Card>
          <Copy muted>
            No hay observaciones {shared ? 'compartidas' : 'guardadas'} para esta selección.
          </Copy>
        </Card>
      ) : (
        sorted.slice(0, limit).map((price) => (
          <Card key={price.id}>
            <Text style={{ fontSize: 25, color: c.ink, fontWeight: '800' }}>
              {money(price.amountMinor)}
            </Text>
            <Copy>
              {price.store} · {price.location}
            </Copy>
            <Copy muted>Código: {price.barcode}</Copy>
            <Copy muted>
              Observado el {new Date(price.observedAt).toLocaleDateString('es-ES')}.{' '}
              {shared
                ? 'Observación compartida, revisada para su publicación.'
                : 'Anotación privada de este dispositivo.'}
            </Copy>
            {price.quantity && price.unit ? (
              <Copy muted>
                {price.quantity} {price.unit} · {money(unitPrice(price)!)}/{price.unit}
              </Copy>
            ) : null}
            {price.offerEndsAt ? (
              <Copy muted>
                Oferta hasta {new Date(price.offerEndsAt).toLocaleDateString('es-ES')}
              </Copy>
            ) : null}
            {!isPriceCurrent(price) ? (
              <Notice error>
                Observación antigua u oferta finalizada. El precio puede haber cambiado.
              </Notice>
            ) : null}
            {price.notes ? <Copy muted>{price.notes}</Copy> : null}
            {onDelete ? (
              <Action
                title="Eliminar observación"
                onPress={() => setDeleting(price.id)}
                secondary
                danger
              />
            ) : null}
          </Card>
        ))
      )}
      {sorted.length > limit ? (
        <Action title="Mostrar 20 más" onPress={() => setLimit((value) => value + 20)} secondary />
      ) : null}
      <Confirm
        title="Eliminar precio privado"
        visible={deleting !== null}
        message="Se eliminará esta anotación privada del dispositivo. No elimina una contribución que ya hayas compartido."
        onCancel={() => setDeleting(null)}
        onConfirm={() => void remove()}
      />
    </>
  );
}
