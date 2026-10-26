import { useRef, useState } from 'react';
import { View } from 'react-native';
import type { Product } from '@/src/domain/product';
import { errorCopy, AppError } from '@/src/domain/errors';
import { useLibrary } from '@/src/features/library/useLibrary';
import { Action, Notice } from '@/src/shared/ui';

export function AddToBasket({
  barcode,
  product,
  label,
}: {
  barcode: string;
  product?: Product;
  label?: string;
}) {
  const { repository, ready } = useLibrary();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  async function add() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage('');
    try {
      const saved = product ?? (await repository.getProduct(barcode));
      await repository.addToBasket(barcode, saved);
      setFailed(false);
      setMessage('Un envase añadido a tu cesta. Puedes cambiar la cantidad en Mi cesta.');
    } catch (error) {
      setFailed(true);
      setMessage(
        error instanceof AppError
          ? errorCopy[error.code]
          : error instanceof Error
            ? error.message
            : errorCopy.storage_error,
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 10 }}>
      <Action
        title="Añadir a la cesta"
        accessibilityLabel={label ? `Añadir ${label} a la cesta` : 'Añadir a la cesta'}
        icon="basket-outline"
        secondary
        disabled={!ready}
        busy={busy}
        onPress={() => void add()}
      />
      {message ? <Notice error={failed}>{message}</Notice> : null}
    </View>
  );
}
