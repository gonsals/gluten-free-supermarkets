import { File, FileMode } from 'expo-file-system';
import { Platform } from 'react-native';
import { checkBackupSize, MAX_BACKUP_BYTES } from '@/src/data/local/backup';

export async function importData(): Promise<string | null> {
  const selection = await File.pickFileAsync({ mimeTypes: ['*/*'] });
  if (selection.canceled) return null;
  const file = selection.result;
  try {
    if (file.size !== null) checkBackupSize(file.size);
    const handle = file.open(FileMode.ReadOnly);
    try {
      // Do not trust a provider's advertised size. Read at most the limit plus one byte.
      const bytes = await handle.readBytes(MAX_BACKUP_BYTES + 1);
      checkBackupSize(bytes.byteLength);
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } finally {
      handle.close();
    }
  } finally {
    // The iOS picker returns a private temporary copy (asCopy: true); Android returns
    // the user's original content URI, which must never be deleted here.
    if (Platform.OS === 'ios' && file.exists) await file.delete();
  }
}
