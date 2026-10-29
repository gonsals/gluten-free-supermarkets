import { useState } from 'react';
import { View } from 'react-native';
import { operationId } from '@/src/data/local/library';
import { normalizeBarcode } from '@/src/domain/barcode';
import { calendarDate, calendarInstant } from '@/src/domain/calendar';
import { parseAmount, type PriceObservation } from '@/src/domain/price';
import { Action, Card, Copy, Field, Notice } from '@/src/shared/ui';
import { useLibrary } from '@/src/features/library/useLibrary';
import { useCachedProduct } from '@/src/features/products/useCachedProduct';
import { storeSuggestions } from '@/src/domain/stores';
import type { Product } from '@/src/domain/product';
import { parseMeasure, SCALE, type InputUnit } from '@/src/domain/measure';

export function PriceForm({ barcode, product }: { barcode?: string; product?: Product | null }) {
  const { repository, ready } = useLibrary();
  const [code, setCode] = useState(barcode ?? '');
  const [amount, setAmount] = useState('');
  const [store, setStore] = useState('');
  const [storeEdited, setStoreEdited] = useState(false);
  const cached = useCachedProduct(product ? undefined : code);
  const suggestion = storeSuggestions(product ?? cached);
  const selectedStore = storeEdited
    ? store
    : suggestion.stores.length === 1
      ? suggestion.stores[0]
      : '';
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<InputUnit>('unit');
  const [components, setComponents] = useState('1');
  const [date, setDate] = useState(() => calendarDate());
  const [offer, setOffer] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setMessage('');
    try {
      const pack = quantity.trim() ? parseMeasure(quantity, unit, components) : null;
      if (!pack && components !== '1')
        throw new Error('Indica la cantidad de cada componente del pack.');
      const observation: PriceObservation = {
        id: operationId(),
        barcode: normalizeBarcode(code),
        amountMinor: parseAmount(amount),
        currency: 'EUR',
        store: selectedStore.trim(),
        location: location.trim(),
        observedAt: calendarInstant(date),
        createdAt: new Date().toISOString(),
        quantity: pack ? pack.quantity / SCALE : null,
        unit: pack?.unit ?? null,
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
        value={selectedStore}
        onChangeText={(value) => {
          setStoreEdited(true);
          setStore(value);
        }}
        maxLength={100}
        placeholder="Nombre de la tienda"
      />
      {suggestion.stores.length ? (
        <>
          <Copy muted>
            {suggestion.reason === 'source'
              ? 'Tiendas indicadas en la ficha. Confirma dónde has visto el precio y la sucursal.'
              : 'Tienda sugerida por la marca del producto. Puedes corregirla.'}
          </Copy>
          {suggestion.stores.length > 1
            ? suggestion.stores.map((name) => (
                <Action
                  key={name}
                  title={`Usar ${name}`}
                  secondary
                  onPress={() => {
                    setStoreEdited(true);
                    setStore(name);
                  }}
                />
              ))
            : null}
        </>
      ) : null}
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
      <Field
        label="Componentes del pack"
        value={components}
        onChangeText={setComponents}
        keyboardType="number-pad"
        maxLength={2}
      />
      <Copy muted>
        Indica el contenido de cada componente y cuántos incluye el precio. Ejemplo: 6 × 330 ml. No
        se deduce del nombre.
      </Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['unit', 'kg', 'g', 'l', 'ml'] as const).map((value) => (
          <View key={value} style={{ minWidth: 80 }}>
            <Action
              title={value === 'unit' ? 'unidad' : value}
              accessibilityLabel={
                value === 'unit'
                  ? 'Unidad'
                  : value === 'kg'
                    ? 'Kilogramos'
                    : value === 'g'
                      ? 'Gramos'
                      : value === 'ml'
                        ? 'Mililitros'
                        : 'Litros'
              }
              selected={unit === value}
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
