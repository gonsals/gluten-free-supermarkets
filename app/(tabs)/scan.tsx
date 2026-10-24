import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, Text, View } from 'react-native';
import { errorCopy } from '@/src/domain/errors';
import { ProductCard } from '@/src/features/products/ProductCard';
import { useProductLookup } from '@/src/features/products/useProductLookup';
import { Action, Card, Copy, Field, Heading, Notice, Screen } from '@/src/shared/ui';
import { usePalette } from '@/src/shared/theme';

export default function ScanScreen() {
  const focused = useIsFocused();
  const router = useRouter();
  const c = usePalette();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<'manual' | 'camera'>('manual');
  const [barcode, setBarcode] = useState('');
  const [torch, setTorch] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const blocked = useRef<symbol | null>(null);
  const result = useProductLookup();
  const { reset } = result;
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) =>
      setForeground(state === 'active'),
    );
    return () => listener.remove();
  }, []);
  useFocusEffect(
    useCallback(
      () => () => {
        reset();
        blocked.current = null;
        setTorch(false);
        setMode('manual');
      },
      [reset],
    ),
  );
  async function submit(code: string) {
    if (blocked.current) return;
    const token = Symbol();
    blocked.current = token;
    setBarcode(code);
    try {
      await result.lookup(code);
    } finally {
      if (blocked.current === token) blocked.current = null;
    }
  }
  function startAgain() {
    reset();
    blocked.current = null;
    setBarcode('');
    setCameraError('');
  }
  async function startCamera() {
    setCameraError('');
    const current = permission?.granted ? permission : await requestPermission();
    if (current.granted) setMode('camera');
    else setCameraError('No se ha concedido acceso. Puedes introducir el código manualmente.');
  }
  const activeCamera =
    mode === 'camera' &&
    permission?.granted &&
    focused &&
    foreground &&
    !result.loading &&
    !result.product &&
    !result.error &&
    !cameraError;
  return (
    <Screen>
      <Heading eyebrow="Consulta de alimentos">Un código, más información.</Heading>
      <Copy muted>
        Introduce el código de barras o utiliza la cámara. Los códigos QR no se usan para
        identificar alimentos.
      </Copy>
      <Card>
        <Field
          label="Código de barras"
          value={barcode}
          onChangeText={setBarcode}
          keyboardType="number-pad"
          autoCorrect={false}
          placeholder="Ej. 3274080005003"
          maxLength={24}
          editable={!result.loading}
          onSubmitEditing={() => void submit(barcode)}
          returnKeyType="search"
        />
        <Action
          title="Buscar producto"
          onPress={() => void submit(barcode)}
          busy={result.loading}
          disabled={!barcode.trim()}
          icon="search"
        />
        {mode === 'manual' ? (
          <Action
            title="Usar cámara"
            secondary
            icon="camera-outline"
            onPress={() => void startCamera()}
          />
        ) : (
          <Action
            title="Introducir código manualmente"
            secondary
            onPress={() => {
              setMode('manual');
              setTorch(false);
            }}
            icon="keypad-outline"
          />
        )}
        {permission && !permission.granted && !permission.canAskAgain && Platform.OS !== 'web' ? (
          <Action
            title="Abrir ajustes de cámara"
            secondary
            onPress={() =>
              void Linking.openSettings().catch(() =>
                setCameraError('Abre los ajustes del dispositivo para permitir la cámara.'),
              )
            }
          />
        ) : null}
        {cameraError ? <Notice error>{cameraError}</Notice> : null}
      </Card>
      {activeCamera ? (
        <Card>
          <View style={{ height: 270, overflow: 'hidden', borderRadius: 14 }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: ['ean8', 'ean13', 'upc_a'] }}
              onMountError={() =>
                setCameraError(
                  'La cámara no está disponible. Puedes introducir el código manualmente.',
                )
              }
              onBarcodeScanned={({ data }) => {
                if (!blocked.current) void submit(data);
              }}
            />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 85,
                left: '8%',
                right: '8%',
                height: 100,
                borderColor: '#FFFFFF',
                borderWidth: 2,
                borderRadius: 12,
              }}
            />
          </View>
          <Copy muted>
            Acerca el código y evita los reflejos. El marco sirve como ayuda visual.
          </Copy>
          <Action
            title={torch ? 'Apagar linterna' : 'Encender linterna'}
            onPress={() => setTorch((value) => !value)}
            secondary
            icon="flashlight-outline"
          />
        </Card>
      ) : null}
      {result.loading ? (
        <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 8 }}>
          <ActivityIndicator color={c.accent} />
          <Text style={{ color: c.muted }}>Consultando información…</Text>
          <Action title="Cancelar consulta" onPress={startAgain} secondary />
        </View>
      ) : null}
      {result.error && !result.product ? (
        <Card>
          <Notice error>{errorCopy[result.error]}</Notice>
          {result.error !== 'invalid_barcode' && result.error !== 'not_found' ? (
            <Action title="Reintentar consulta" onPress={() => void result.retry()} secondary />
          ) : null}
          <Action title="Consultar otro producto" onPress={startAgain} />
        </Card>
      ) : null}
      {result.storageWarning ? (
        <Notice error>
          El producto se ha consultado, pero no se ha podido guardar en tu biblioteca.
        </Notice>
      ) : null}
      {result.product ? (
        <>
          <ProductCard
            product={result.product}
            cached={result.cached}
            refreshing={result.loading}
            refreshError={result.error ? errorCopy[result.error] : undefined}
            onRefresh={() => void result.retry()}
            onPrices={() =>
              router.push({
                pathname: '/prices/[barcode]',
                params: { barcode: result.product!.barcode },
              })
            }
          />
          <Action title="Consultar otro producto" onPress={startAgain} icon="scan-outline" />
        </>
      ) : null}
    </Screen>
  );
}
