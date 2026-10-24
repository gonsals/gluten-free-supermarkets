import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';

export async function exportData(contents: string): Promise<void> {
  if (!(await isAvailableAsync()))
    throw new Error('No se puede compartir un archivo desde este dispositivo.');
  const file = new File(Paths.cache, 'sin-gluten-datos.json');
  try {
    file.write(contents);
    await shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Exportar mis datos de SinGluten',
    });
  } finally {
    if (file.exists) file.delete();
  }
}
