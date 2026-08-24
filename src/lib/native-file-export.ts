import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'

import { encodeBytesToBase64 } from './criptoveu'
import { isNativeApp } from './platform'

export const NATIVE_EXPORT_CHUNK_SIZE_BYTES = 4 * 1024 * 1024
const SMALL_NATIVE_EXPORT_LIMIT_BYTES = 10 * 1024 * 1024

function sanitizeFileName(fileName: string) {
  return Array.from(fileName, (character) => {
    const codePoint = character.codePointAt(0) ?? 0

    return /[\\/:*?"<>|]/.test(character) || codePoint <= 0x1f
      ? '_'
      : character
  }).join('')
}

function triggerBrowserDownload(file: Blob, fileName: string) {
  const url = URL.createObjectURL(file)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
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
    triggerBrowserDownload(file, fileName)
    return
  }

  const safeFileName = sanitizeFileName(fileName)
  const directory = Directory.Documents
  const path = safeFileName

  try {
    await Filesystem.requestPermissions()

    if (file.size < SMALL_NATIVE_EXPORT_LIMIT_BYTES) {
      const data = encodeBytesToBase64(
        new Uint8Array(await file.arrayBuffer()),
      )
      await Filesystem.writeFile({
        path,
        data,
        directory,
        recursive: true,
      })
      onProgress?.(100)
    } else {
      await Filesystem.writeFile({
        path,
        data: '',
        directory,
        recursive: true,
      })

      for (
        let offset = 0;
        offset < file.size;
        offset += NATIVE_EXPORT_CHUNK_SIZE_BYTES
      ) {
        const chunk = new Uint8Array(
          await file
            .slice(offset, Math.min(file.size, offset + NATIVE_EXPORT_CHUNK_SIZE_BYTES))
            .arrayBuffer(),
        )

        try {
          await Filesystem.appendFile({
            path,
            data: encodeBytesToBase64(chunk),
            directory,
          })
        } finally {
          chunk.fill(0)
        }

        onProgress?.(
          Math.round(
            (Math.min(file.size, offset + NATIVE_EXPORT_CHUNK_SIZE_BYTES) /
              file.size) *
              100,
          ),
        )
      }
    }

    const storedFile = await Filesystem.stat({ path, directory })
    if (storedFile.size !== file.size) {
      throw new Error(
        `Gravacao incompleta: tamanho esperado ${file.size} bytes, mas apenas ${storedFile.size} bytes foram gravados. Verifique o espaco disponivel no dispositivo.`,
      )
    }
  } catch (error) {
    if (Capacitor.isNativePlatform()) {
      throw error
    }

    triggerBrowserDownload(file, safeFileName)
  }
}