import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  Stack,
  type ErrorBoundaryProps,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Action, Card, Copy, Heading, Screen } from '@/src/shared/ui';
import { usePalette } from '@/src/shared/theme';
import { reportTechnicalEvent } from '@/src/shared/telemetry';
import { OfflineSupport } from '@/src/shared/OfflineSupport';

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  useEffect(() => {
    reportTechnicalEvent('render_error');
  }, []);
  return (
    <SafeAreaProvider>
      <Screen>
        <Heading>Algo no ha salido bien</Heading>
        <Card>
          <Copy>
            Puedes volver a intentarlo. Tu biblioteca guardada permanece en este dispositivo.
          </Copy>
          <Action title="Volver a intentar" onPress={retry} />
        </Card>
      </Screen>
    </SafeAreaProvider>
  );
}
export default function RootLayout() {
  const scheme = useColorScheme();
  const c = usePalette();
  return (
    <SafeAreaProvider>
      <OfflineSupport />
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: c.bg },
            headerTintColor: c.ink,
            contentStyle: { backgroundColor: c.bg },
            headerBackTitle: 'Volver',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="product/[barcode]" options={{ title: 'Detalle del producto' }} />
          <Stack.Screen name="prices/[barcode]" options={{ title: 'Precios observados' }} />
          <Stack.Screen name="moderation" options={{ title: 'Revisión de contribuciones' }} />
          <Stack.Screen name="+not-found" options={{ title: 'Página no encontrada' }} />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
