import { useState } from 'react';
import { View } from 'react-native';
import { operationId } from '@/src/data/local/library';
import { normalizeBarcode } from '@/src/domain/barcode';
import { calendarDate, calendarInstant } from '@/src/domain/calendar';
import { parseAmount, type PriceObservation } from '@/src/domain/price';
import { Action, Card, Copy, Field, Notice } from '@/src/shared/ui';
import { useLibrary } from '@/src/features/library/useLibrary';

export function PriceForm({ barcode }: { barcode?: string }) {
  const { repository, ready } = useLibrary();
  const [code, setCode] = useState(barcode ?? '');
  const [amount, setAmount] = useState('');
  const [store, setStore] = useState('');
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'kg' | 'l' | 'unit'>('unit');
  const [date, setDate] = useState(() => calendarDate());
  const [offer, setOffer] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setMessage('');
    try {
      const observation: PriceObservation = {
        id: operationId(),
        barcode: normalizeBarcode(code),
        amountMinor: parseAmount(amount),
        currency: 'EUR',
        store: store.trim(),
        location: location.trim(),
        observedAt: calendarInstant(date),
        createdAt: new Date().toISOString(),
        quantity: quantity ? Number(quantity.replace(',', '.')) : null,
        unit: quantity ? unit : null,
        offerEndsAt: offer ? calendarInstant(offer, true) : null,
        notes: notes.trim(),
      };
      await repository.addPrice(observation);
      setAmount('');
      setNotes('');
      setMessage('Precio guardado en este dispositivo.');
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === 'invalid_barcode'
          ? 'El código de barras no es válido.'
          : error instanceof Error && error.message !== 'storage_error'
            ? error.message
            : 'No se ha podido guardar el precio.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <Copy>Anotar un precio</Copy>
      <Copy muted>
        Registra lo que has visto en una tienda concreta. Guardarlo aquí no lo publica ni confirma
        disponibilidad.
      </Copy>
      {!barcode ? (
        <Field
          label="Código de barras del producto"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={24}
        />
      ) : null}
      <Field
        label="Precio en euros"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="2,49"
        maxLength={9}
      />
      <Field
        label="Supermercado o tienda"
        value={store}
        onChangeText={setStore}
        maxLength={100}
        placeholder="Nombre de la tienda"
      />
      <Field
        label="Sucursal o localidad"
        value={location}
        onChangeText={setLocation}
        maxLength={150}
        placeholder="Localidad y dirección de la sucursal"
      />
      <Field
        label="Fecha de observación (AAAA-MM-DD)"
        value={date}
        onChangeText={setDate}
        maxLength={10}
      />
      <Field
        label="Cantidad del envase (opcional)"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
        placeholder="Ej. 0,5"
        maxLength={10}
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['unit', 'kg', 'l'] as const).map((value) => (
          <View key={value} style={{ flex: 1 }}>
            <Action
              title={value === 'unit' ? 'unidad' : value}
              secondary={unit !== value}
              onPress={() => setUnit(value)}
            />
          </View>
        ))}
      </View>
      <Field
        label="Fin de oferta (opcional, AAAA-MM-DD)"
        value={offer}
        onChangeText={setOffer}
        maxLength={10}
      />
      <Field
        label="Condiciones o notas (opcional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={500}
      />
      {message ? <Notice>{message}</Notice> : null}
      <Action
        title="Guardar precio privado"
        onPress={() => void save()}
        disabled={!ready}
        busy={busy}
        icon="save-outline"
      />
    </Card>
  );
}
