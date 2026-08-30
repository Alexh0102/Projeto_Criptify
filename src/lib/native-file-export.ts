import { Directory, Filesystem } from '@capacitor/filesystem'

import { encodeBytesToBase64 } from './criptoveu'
import { isNativeApp } from './platform'

export const NATIVE_EXPORT_CHUNK_SIZE_BYTES = 1 * 1024 * 1024
const WATCHDOG_MS = 90_000
const isDevelopment = import.meta.env.DEV

type ExportProgress = { percent: number; bytesWritten: number; expectedSize: number; chunkIndex: number }
export type NativeExportContext = {
  action: string
  trigger: string
  userInitiated: boolean
  previewMode: boolean
}
type BrowserFileHandle = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>
    close: () => Promise<void>
  }>
}
type BrowserWindow = Window & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string
    types?: Array<{ description: string; accept: Record<string, string[]> }>
  }) => Promise<BrowserFileHandle>
}

export function sanitizeNativeFileName(fileName: string) {
  return Array.from(fileName, (character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return /[\\/:*?"<>|]/.test(character) || codePoint <= 0x1f ? '_' : character
  }).join('')
}

function createTemporaryExportPath(safeFileName: string) {
  const uniqueId = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `.${safeFileName}.${uniqueId}.criptoveu.part`
}

function triggerBrowserDownload(file: Blob, fileName: string) {
  const url = URL.createObjectURL(file)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function supportsNativeFileExport() { return isNativeApp() }

export async function saveBlobInBrowser(fileBlob: Blob, fileName: string): Promise<void> {
  if (supportsNativeFileExport()) {
    throw new Error('Exportação pelo navegador não está disponível no aplicativo nativo.')
  }

  const browserWindow = window as BrowserWindow
  if (typeof browserWindow.showSaveFilePicker === 'function') {
    if (isDevelopment) console.debug('[CriptoVéu][web-export]', { strategy: 'file-system-access', fileName, size: fileBlob.size })
    try {
      const fileHandle = await browserWindow.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'Pacote CriptoVéu', accept: { 'application/octet-stream': ['.criptoveu'] } }],
      })
      const writable = await fileHandle.createWritable()
      await writable.write(fileBlob)
      await writable.close()
      return
    } catch (error) {
      if (isDevelopment) console.error('[CriptoVéu][web-export]', { stage: 'file-system-access', fileName, size: fileBlob.size, name: error instanceof Error ? error.name : undefined, message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined, error })
      throw error
    }
  }

  if (isDevelopment) console.debug('[CriptoVéu][web-export]', { strategy: 'blob-download', fileName, size: fileBlob.size })
  triggerBrowserDownload(fileBlob, fileName)
}

async function getFreeStorageEstimate() {
  const estimate = await navigator.storage?.estimate?.()
  return typeof estimate?.quota === 'number'
    ? Math.max(0, estimate.quota - (estimate.usage ?? 0))
    : null
}

async function appendWithWatchdog(
  request: Parameters<typeof Filesystem.appendFile>[0],
  context: ExportProgress & { freeStorageEstimate: number | null },
) {
  let timer: number | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(
      `A gravação em Documents não avançou por 90 segundos (chunkIndex=${context.chunkIndex}, bytesWritten=${context.bytesWritten}, expectedSize=${context.expectedSize}, freeStorageEstimate=${context.freeStorageEstimate ?? 'unknown'}).`,
    )), WATCHDOG_MS)
  })
  try { return await Promise.race([Filesystem.appendFile(request), timeout]) }
  finally { if (timer !== undefined) window.clearTimeout(timer) }
}

export async function exportFileToNativeDownloads(
  file: Blob,
  fileName: string,
  onProgress?: (progress: number, detail?: ExportProgress) => void,
  context: NativeExportContext = {
    action: 'exportFileToNativeDownloads',
    trigger: 'unknown',
    userInitiated: false,
    previewMode: false,
  },
) {
  if (!supportsNativeFileExport()) { await saveBlobInBrowser(file, fileName); return }

  const safeFileName = sanitizeNativeFileName(fileName)
  const directory = Directory.Documents
  const temporaryPath = createTemporaryExportPath(safeFileName)
  let promoted = false
  let bytesWritten = 0
  const expectedSize = file.size
  const startedAt = performance.now()
  const exportLogContext = {
    ...context,
    fileName: safeFileName,
    directory: 'Documents',
    stack: new Error().stack,
  }

  try {
    await Filesystem.requestPermissions()
    const freeStorageEstimate = await getFreeStorageEstimate()
    if (isDevelopment) console.debug('[CriptoVéu][export]', { ...exportLogContext, stage: 'preflight', chunkIndex: 0, totalChunks: Math.ceil(expectedSize / NATIVE_EXPORT_CHUNK_SIZE_BYTES), bytesWritten, expectedSize, elapsedMs: Math.round(performance.now() - startedAt), freeStorageEstimate })
    if (freeStorageEstimate !== null && freeStorageEstimate < expectedSize * 2.5) {
      throw new Error(`Espaço insuficiente para exportar: exigidos ${Math.ceil(expectedSize * 2.5)} bytes, disponíveis ${freeStorageEstimate} bytes.`)
    }
    await Filesystem.writeFile({ path: temporaryPath, data: '', directory, recursive: true })

    for (let offset = 0, chunkIndex = 0; offset < expectedSize; offset += NATIVE_EXPORT_CHUNK_SIZE_BYTES, chunkIndex += 1) {
      const end = Math.min(expectedSize, offset + NATIVE_EXPORT_CHUNK_SIZE_BYTES)
      const chunk = new Uint8Array(await file.slice(offset, end).arrayBuffer())
      try {
        await appendWithWatchdog(
          { path: temporaryPath, data: encodeBytesToBase64(chunk), directory },
          { percent: 0, bytesWritten, expectedSize, chunkIndex, freeStorageEstimate },
        )
      } finally { chunk.fill(0) }
      bytesWritten = end
      const detail = { percent: expectedSize === 0 ? 100 : Math.round((bytesWritten / expectedSize) * 100), bytesWritten, expectedSize, chunkIndex }
      if (isDevelopment) console.debug('[CriptoVéu][export]', { ...exportLogContext, stage: 'appendFile', ...detail, totalChunks: Math.ceil(expectedSize / NATIVE_EXPORT_CHUNK_SIZE_BYTES), elapsedMs: Math.round(performance.now() - startedAt), freeStorageEstimate })
      onProgress?.(detail.percent, detail)
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
    }

    const storedFile = await Filesystem.stat({ path: temporaryPath, directory })
    if (isDevelopment) console.debug('[CriptoVéu][export]', { ...exportLogContext, stage: 'stat', chunkIndex: Math.ceil(expectedSize / NATIVE_EXPORT_CHUNK_SIZE_BYTES), totalChunks: Math.ceil(expectedSize / NATIVE_EXPORT_CHUNK_SIZE_BYTES), bytesWritten, expectedSize, statSize: storedFile.size, elapsedMs: Math.round(performance.now() - startedAt), freeStorageEstimate })
    if (storedFile.size !== expectedSize) throw new Error(`Gravação incompleta: tamanho esperado ${expectedSize} bytes, mas apenas ${storedFile.size} bytes foram gravados.`)
    await Filesystem.rename({ from: temporaryPath, to: safeFileName, directory })
    promoted = true
    onProgress?.(100, { percent: 100, bytesWritten, expectedSize, chunkIndex: Math.ceil(expectedSize / NATIVE_EXPORT_CHUNK_SIZE_BYTES) })
  } catch (error) {
    if (isDevelopment) console.error('[CriptoVéu][export]', { ...exportLogContext, stage: 'error', chunkIndex: Math.floor(bytesWritten / NATIVE_EXPORT_CHUNK_SIZE_BYTES), totalChunks: Math.ceil(expectedSize / NATIVE_EXPORT_CHUNK_SIZE_BYTES), bytesWritten, expectedSize, elapsedMs: Math.round(performance.now() - startedAt), freeStorageEstimate: await getFreeStorageEstimate().catch(() => null), message: error instanceof Error ? error.message : String(error) })
    if (!promoted) await Filesystem.deleteFile({ path: temporaryPath, directory }).catch(() => undefined)
    if (supportsNativeFileExport()) throw error
    triggerBrowserDownload(file, safeFileName)
  }
}
