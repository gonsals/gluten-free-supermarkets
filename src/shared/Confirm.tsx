import { Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, Card, Copy, Heading } from './ui';

export function Confirm({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  busy = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      accessibilityLabel={title}
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <SafeAreaView
        accessibilityViewIsModal
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <Card style={{ width: '100%', maxWidth: 460 }}>
            <Heading>{title}</Heading>
            <Copy>{message}</Copy>
            <Action title="Cancelar" secondary onPress={onCancel} disabled={busy} />
            <Action title="Confirmar eliminación" onPress={onConfirm} busy={busy} />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
