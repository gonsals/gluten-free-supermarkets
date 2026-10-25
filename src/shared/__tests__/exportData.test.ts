import { shareAsync } from 'expo-sharing';
import { exportData } from '../exportData';

const mockFile = {
  uri: 'file:///private/cache/copy.json',
  exists: true,
  write: jest.fn(),
  delete: jest.fn(),
};
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => mockFile),
  Paths: { cache: 'file:///private/cache' },
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn(),
}));

test('espera a que termine la escritura antes de compartir y limpia el temporal si falla el envío', async () => {
  let completeWrite!: () => void;
  const written = new Promise<void>((resolve) => {
    completeWrite = resolve;
  });
  mockFile.write.mockReturnValue(written);
  jest.mocked(shareAsync).mockRejectedValue(new Error('share failed'));
  const pending = exportData('{"version":1}');
  // Reach the write's await without completing the file yet.
  await Promise.resolve();
  expect(mockFile.write).toHaveBeenCalledWith('{"version":1}');
  expect(shareAsync).not.toHaveBeenCalled();
  completeWrite();
  await expect(pending).rejects.toThrow('share failed');
  expect(shareAsync).toHaveBeenCalledWith(
    mockFile.uri,
    expect.objectContaining({ mimeType: 'application/json' }),
  );
  expect(mockFile.delete).toHaveBeenCalledTimes(1);
});
