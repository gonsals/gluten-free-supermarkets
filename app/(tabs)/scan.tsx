import { CameraView } from 'expo-camera';
import { useIsFocused, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Text, View } from 'react-native';
import { errorCopy } from '@/src/domain/errors';
import { ProductCard } from '@/src/features/products/ProductCard';
import { useProductLookup } from '@/src/features/products/useProductLookup';
import { useScannerCamera } from '@/src/features/scanner/useScannerCamera';
import { Action, Card, Copy, Field, Heading, Notice, Screen } from '@/src/shared/ui';
import { usePalette } from '@/src/shared/theme';

export default function ScanScreen() {
  const focused = useIsFocused();
  const router = useRouter();
  const c = usePalette();
  const camera = useScannerCamera(focused);
  const { permission, mode } = camera;
  const [barcode, setBarcode] = useState('');
  const blocked = useRef<symbol | null>(null);
  const result = useProductLookup();
  const { reset } = result;
  useFocusEffect(
    useCallback(
      () => () => {
        reset();
        blocked.current = null;
      },
      [reset],
    ),
  );
  async function submit(code: string) {
    if (blocked.current) return;
    const token = Symbol();
    blocked.current = token;
    camera.turnOffTorch();
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
    camera.clearError();
  }
  const activeCamera =
    camera.enabled && !result.loading && !result.product && !result.error && !camera.error;
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
            onPress={() => void camera.startCamera()}
            busy={camera.requesting}
          />
        ) : (
          <Action
            title="Introducir código manualmente"
            secondary
            onPress={camera.enterManual}
            icon="keypad-outline"
          />
        )}
        {permission && !permission.granted && !permission.canAskAgain && Platform.OS !== 'web' ? (
          <Action
            title="Abrir ajustes de cámara"
            secondary
            onPress={() => void Linking.openSettings().catch(() => camera.settingsError())}
          />
        ) : null}
        {camera.error ? <Notice error>{camera.error}</Notice> : null}
      </Card>
      {activeCamera ? (
        <Card>
          <View style={{ height: 270, overflow: 'hidden', borderRadius: 14 }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              enableTorch={camera.torch}
              barcodeScannerSettings={{ barcodeTypes: ['ean8', 'ean13', 'upc_a'] }}
              onMountError={camera.mountError}
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
            title={camera.torch ? 'Apagar linterna' : 'Encender linterna'}
            onPress={camera.toggleTorch}
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
