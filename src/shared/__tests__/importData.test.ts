import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { MAX_BACKUP_BYTES } from '@/src/data/local/backup';
import { importData } from '../importData';

jest.mock('expo-file-system', () => ({
  File: { pickFileAsync: jest.fn() },
  FileMode: { ReadOnly: 'r' },
}));
const pick = File.pickFileAsync as jest.Mock;
const initialOS = Platform.OS;
beforeEach(() => {
  Platform.OS = 'android';
  pick.mockReset();
});
afterEach(() => {
  Platform.OS = initialOS;
});
function selected(size: number | null, bytes = new TextEncoder().encode('{"texto":"á"}')) {
  const handle = { readBytes: jest.fn().mockResolvedValue(bytes), close: jest.fn() };
  const file = { size, open: jest.fn().mockReturnValue(handle), exists: true, delete: jest.fn() };
  pick.mockResolvedValue({ canceled: false, result: file });
  return { file, handle };
}
test('cancelar no abre ningún archivo', async () => {
  pick.mockResolvedValue({ canceled: true, result: null });
  expect(await importData()).toBeNull();
});
test('rechaza un tamaño excesivo antes de leer y nunca borra el original Android', async () => {
  const { file } = selected(MAX_BACKUP_BYTES + 1);
  await expect(importData()).rejects.toThrow('20 MB');
  expect(file.open).not.toHaveBeenCalled();
  expect(file.delete).not.toHaveBeenCalled();
});
test('acota la lectura aunque el proveedor no informe del tamaño y cierra el descriptor', async () => {
  const { file, handle } = selected(null);
  expect(await importData()).toBe('{"texto":"á"}');
  expect(handle.readBytes).toHaveBeenCalledWith(MAX_BACKUP_BYTES + 1);
  expect(handle.close).toHaveBeenCalledTimes(1);
  expect(file.delete).not.toHaveBeenCalled();
});
test('rechaza contenido mayor que lo anunciado y cierra el descriptor', async () => {
  const { handle } = selected(1, new Uint8Array(MAX_BACKUP_BYTES + 1));
  await expect(importData()).rejects.toThrow('20 MB');
  expect(handle.close).toHaveBeenCalledTimes(1);
});
test('un error de lectura o UTF-8 inválido no deja el descriptor abierto', async () => {
  const first = selected(1);
  first.handle.readBytes.mockRejectedValue(new Error('read failed'));
  await expect(importData()).rejects.toThrow('read failed');
  expect(first.handle.close).toHaveBeenCalledTimes(1);
  const second = selected(2, new Uint8Array([0xc3, 0x28]));
  await expect(importData()).rejects.toThrow();
  expect(second.handle.close).toHaveBeenCalledTimes(1);
});
test('iOS elimina su copia temporal incluso si se rechaza por tamaño', async () => {
  Platform.OS = 'ios';
  const { file } = selected(MAX_BACKUP_BYTES + 1);
  await expect(importData()).rejects.toThrow('20 MB');
  expect(file.delete).toHaveBeenCalledTimes(1);
});
