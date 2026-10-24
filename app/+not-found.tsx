import { useRouter } from 'expo-router';
import { Action, Copy, Heading, Screen } from '@/src/shared/ui';
export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen>
      <Heading>No encontramos esta página</Heading>
      <Copy>Vuelve al inicio para consultar un producto o abrir tu biblioteca.</Copy>
      <Action title="Volver al inicio" onPress={() => router.replace('/')} />
    </Screen>
  );
}
