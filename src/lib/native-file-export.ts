import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'

import { STREAMING_CHUNK_SIZE_BYTES, encodeBytesToBase64 } from './criptoveu'
import { isNativeApp } from './platform'

function sanitizeFileName(fileName: string) {
  return Array.from(fileName, (character) => {
    const codePoint = character.codePointAt(0) ?? 0

    return /[\\/:*?"<>|]/.test(character) || codePoint <= 0x1f
      ? '_'
      : character
  }).join('')
}

export function supportsNativeFileExport() {
  return isNativeApp()
}

export async function exportFileToNativeDownloads(
  file: Blob,
  fileName: string,
  onProgress?: (progress: number) => void,
) {
  if (!supportsNativeFileExport()) {
    throw new Error('A exportacao nativa nao esta disponivel nesta plataforma.')
  }

  const safeFileName = sanitizeFileName(fileName)
  const isAndroid = Capacitor.getPlatform() === 'android'
  const directory = isAndroid ? Directory.ExternalStorage : Directory.Documents
  const path = isAndroid ? `Download/${safeFileName}` : safeFileName

  try {
    await Filesystem.requestPermissions()

    for (let offset = 0; offset < file.size || (file.size === 0 && offset === 0); offset += STREAMING_CHUNK_SIZE_BYTES) {
      const chunk = new Uint8Array(
        await file
          .slice(offset, Math.min(file.size, offset + STREAMING_CHUNK_SIZE_BYTES))
          .arrayBuffer(),
      )
      const data = encodeBytesToBase64(chunk)
      const options = {
        path,
        data,
        directory,
        recursive: true,
      }

      if (offset === 0) {
        await Filesystem.writeFile(options)
      } else {
        await Filesystem.appendFile(options)
      }

      chunk.fill(0)
      onProgress?.(
        file.size === 0
          ? 100
          : Math.round((Math.min(file.size, offset + STREAMING_CHUNK_SIZE_BYTES) / file.size) * 100),
      )
    }
  } catch (error) {
    await Filesystem.deleteFile({ path, directory }).catch(() => undefined)
    throw new Error(
      error instanceof Error
        ? `Nao foi possivel gravar o arquivo em Download: ${error.message}`
        : 'Nao foi possivel gravar o arquivo em Download.',
    )
  }
}