export async function getOpfsRoot(): Promise<FileSystemDirectoryHandle> {
  if (!navigator.storage || typeof navigator.storage.getDirectory !== 'function') {
    throw new Error('OPFS não é suportado neste dispositivo/WebView.')
  }

  return await navigator.storage.getDirectory()
}
