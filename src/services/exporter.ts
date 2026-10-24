import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function canShare(): Promise<boolean> {
  try {
    return await Sharing.isAvailableAsync();
  } catch {
    return false;
  }
}

/** Writes a UTF-8 text file to the cache and opens the system share sheet. */
export async function shareTextFile(
  fileName: string,
  content: string,
  mimeType: string,
  dialogTitle: string,
): Promise<void> {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
}

export async function sharePdf(html: string, dialogTitle: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle });
}
