import { Modal, View } from 'react-native';
import { Action, Card, Copy } from './ui';

export function Confirm({
  visible,
  message,
  onCancel,
  onConfirm,
  busy = false,
}: {
  visible: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        accessibilityViewIsModal
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <Card style={{ width: '100%', maxWidth: 460 }}>
          <Copy>{message}</Copy>
          <Action title="Cancelar" secondary onPress={onCancel} disabled={busy} />
          <Action title="Confirmar eliminación" onPress={onConfirm} busy={busy} />
        </Card>
      </View>
    </Modal>
  );
}
