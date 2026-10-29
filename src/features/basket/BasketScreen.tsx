import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { type BasketLine, validBasketQuantity } from '@/src/domain/basket';
import { AppError, errorCopy } from '@/src/domain/errors';
import { normalizeBarcode } from '@/src/domain/barcode';
import { useLibrary } from '@/src/features/library/useLibrary';
import { Action, Card, Copy, Field, Heading, Notice, Screen } from '@/src/shared/ui';
import { Confirm } from '@/src/shared/Confirm';

function BasketItem({
  line,
  busy,
  run,
  onRemove,
  hasProduct,
  hasPrice,
}: {
  line: BasketLine;
  busy: boolean;
  run: (action: () => Promise<void>) => Promise<boolean>;
  onRemove: () => void;
  hasProduct: boolean;
  hasPrice: boolean;
}) {
  const { repository } = useLibrary();
  const router = useRouter();
  const [quantity, setQuantity] = useState(String(line.quantity));
  const valid = /^\d{1,2}$/.test(quantity) && validBasketQuantity(Number(quantity));
  const title = line.name || `Producto ${line.barcode}`;
  return (
    <Card>
      <Copy>{title}</Copy>
      <Copy muted>
        {line.barcode} · {line.quantity} {line.quantity === 1 ? 'envase' : 'envases'}
      </Copy>
      {!hasProduct ? (
        <Copy muted>
          Sin ficha guardada. Puedes mantener el código en la cesta o consultarlo cuando tengas
          conexión.
        </Copy>
      ) : null}
      <Copy muted>
        {hasPrice
          ? 'Hay anotaciones privadas; revisa fecha, tienda y condiciones al comparar.'
          : 'Sin precio privado anotado. Puedes consultar aportaciones públicas al comparar este producto.'}
      </Copy>
      <Field
        label={`Envases de ${title}`}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="number-pad"
        maxLength={3}
        editable={!busy}
        error={!valid}
      />
      {!valid ? <Notice error>Introduce entre 1 y 99 envases enteros.</Notice> : null}
      <Action
        title="Guardar cantidad"
        accessibilityLabel={`Guardar cantidad de ${title}`}
        secondary
        disabled={busy || !valid || Number(quantity) === line.quantity}
        onPress={() =>
          void run(() =>
            repository.setBasketQuantity(line.barcode, Number(quantity), line.quantity),
          )
        }
      />
      <Action
        title="Comparar este producto"
        secondary
        icon="pricetags-outline"
        onPress={() =>
          router.push({ pathname: '/prices/[barcode]', params: { barcode: line.barcode } })
        }
      />
      {hasProduct ? (
        <Action
          title="Ver ficha e información sobre gluten"
          secondary
          onPress={() =>
            router.push({ pathname: '/product/[barcode]', params: { barcode: line.barcode } })
          }
        />
      ) : null}
      <Action
        title="Quitar de la cesta"
        accessibilityLabel={`Quitar ${title} de la cesta`}
        secondary
        danger
        disabled={busy}
        onPress={onRemove}
      />
    </Card>
  );
}

export function BasketScreen() {
  const { data, ready, error, repository } = useLibrary();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(20);
  const [confirm, setConfirm] = useState<{ line: BasketLine } | { basket: BasketLine[] } | null>(
    null,
  );
  const locked = useRef(false);
  const packages = data.basket.reduce((total, line) => total + line.quantity, 0);
  async function run(action: () => Promise<void>) {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    setMessage('');
    try {
      await action();
      setFailed(false);
      setMessage('Cesta guardada en este dispositivo.');
      return true;
    } catch (error) {
      setFailed(true);
      setMessage(
        error instanceof AppError
          ? errorCopy[error.code]
          : error instanceof Error
            ? error.message === 'invalid_barcode'
              ? errorCopy.invalid_barcode
              : error.message
            : errorCopy.storage_error,
      );
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function addCode() {
    const saved = await run(async () => {
      const barcode = normalizeBarcode(code);
      await repository.addToBasket(barcode, await repository.getProduct(barcode));
    });
    if (saved) setCode('');
  }
  async function remove() {
    if (!confirm) return;
    await run(() =>
      'line' in confirm
        ? repository.removeFromBasket(confirm.line.barcode, confirm.line.quantity)
        : repository.clearBasket(confirm.basket),
    );
    setConfirm(null);
  }
  return (
    <Screen>
      <Heading eyebrow="Prepara tu próxima compra">Mi cesta</Heading>
      <Copy muted>
        Guarda los productos y el número de envases que necesitas. La cesta es privada y funciona
        sin conexión.
      </Copy>
      {ready ? (
        <Copy>
          {data.basket.length} {data.basket.length === 1 ? 'producto' : 'productos'} · {packages}{' '}
          {packages === 1 ? 'envase' : 'envases'}
        </Copy>
      ) : null}
      <Action
        title="Comparar total por tienda"
        icon="pricetags-outline"
        disabled={!ready || !data.basket.length}
        onPress={() => router.push('/basket-comparison')}
      />
      <Action
        title="Formatos y alternativas"
        secondary
        onPress={() => router.push('/alternatives')}
      />
      {!ready && !error ? <ActivityIndicator /> : null}
      {error ? (
        <>
          <Notice error>{error}</Notice>
          <Action
            title="Reintentar abrir biblioteca"
            secondary
            onPress={() => void repository.refresh()}
          />
        </>
      ) : null}
      <Card>
        <Field
          label="Código para añadir a la cesta"
          placeholder="EAN o UPC del producto"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={24}
          editable={ready && !busy}
        />
        <Action
          title="Añadir código a la cesta"
          icon="add-outline"
          disabled={!ready || busy || !code.trim()}
          onPress={() => void addCode()}
        />
        <Action
          title="Elegir de mi biblioteca"
          secondary
          onPress={() => router.navigate('/library')}
        />
        <Action
          title="Escanear un producto"
          secondary
          icon="scan-outline"
          onPress={() => router.navigate('/scan')}
        />
      </Card>
      {message ? <Notice error={failed}>{message}</Notice> : null}
      {ready && !data.basket.length ? (
        <Notice>
          Tu cesta está vacía. Añade productos desde su ficha, tu biblioteca o introduce un código,
          aunque todavía no tenga precio.
        </Notice>
      ) : null}
      {ready
        ? data.basket
            .slice(0, limit)
            .map((line) => (
              <BasketItem
                key={`${line.barcode}:${line.quantity}`}
                line={line}
                busy={busy}
                run={run}
                onRemove={() => setConfirm({ line })}
                hasProduct={Object.hasOwn(data.cache, line.barcode)}
                hasPrice={data.prices.some((price) => price.barcode === line.barcode)}
              />
            ))
        : null}
      {data.basket.length > limit ? (
        <Action
          title="Mostrar 20 productos más"
          secondary
          onPress={() => setLimit((value) => value + 20)}
        />
      ) : null}
      <View style={{ gap: 12 }}>
        <Copy muted>
          Hasta 100 productos distintos y 99 envases por producto. Repetir un código suma un envase.
          Compara los totales por sucursal confirmada; los productos sin precio quedan como
          faltantes.
        </Copy>
        <Copy muted>
          La cesta se incluye al exportar y restaurar tus datos. Vaciarla conserva favoritos,
          historial y precios.
        </Copy>
        <Action
          title="Copias y privacidad"
          secondary
          onPress={() => router.navigate('/settings')}
        />
        {data.basket.length ? (
          <Action
            title="Vaciar cesta"
            secondary
            danger
            disabled={!ready || busy}
            onPress={() => setConfirm({ basket: data.basket })}
          />
        ) : null}
      </View>
      <Confirm
        visible={confirm !== null}
        title={confirm && 'line' in confirm ? 'Quitar producto de la cesta' : 'Vaciar cesta'}
        message={
          confirm && 'line' in confirm
            ? `Se quitará ${confirm.line.name || confirm.line.barcode} de la cesta. Tus favoritos y precios se conservarán.`
            : 'Se quitarán todos los productos de la cesta. Tus favoritos, historial y precios se conservarán.'
        }
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void remove()}
      />
    </Screen>
  );
}
