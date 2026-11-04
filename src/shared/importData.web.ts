import { checkBackupSize } from '@/src/data/local/backup';

export function importData(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.hidden = true;
    const clean = () => input.remove();
    input.addEventListener(
      'cancel',
      () => {
        clean();
        resolve(null);
      },
      { once: true },
    );
    input.addEventListener(
      'change',
      () => {
        const file = input.files?.[0];
        clean();
        if (!file) {
          resolve(null);
          return;
        }
        try {
          checkBackupSize(file.size);
          void file.arrayBuffer().then((bytes) => {
            try {
              checkBackupSize(bytes.byteLength);
              resolve(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
            } catch (error) {
              reject(error);
            }
          }, reject);
        } catch (error) {
          reject(error);
        }
      },
      { once: true },
    );
    document.body.appendChild(input);
    input.click();
  });
}
