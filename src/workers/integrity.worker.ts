/// <reference lib="webworker" />

import { createSHA256, sha256 } from 'hash-wasm'

type IntegrityRequest = {
  id: number
  blob: Blob
  chunkSize: number
}

type IntegrityResponse =
  | {
      id: number
      progress: number
    }
  | {
      id: number
      fileHashSha256: string
      chunkHashesSha256: string[]
    }
  | {
      id: number
      error: string
    }

const workerScope = self as unknown as DedicatedWorkerGlobalScope

workerScope.onmessage = async (event: MessageEvent<IntegrityRequest>) => {
  const { id, blob, chunkSize } = event.data

  try {
    if (
      !Number.isSafeInteger(chunkSize) ||
      chunkSize < 64 * 1024 ||
      chunkSize > 16 * 1024 * 1024
    ) {
      throw new Error('Tamanho de bloco inválido para verificação SHA-256.')
    }

    const fullHasher = await createSHA256()
    const chunkHashesSha256: string[] = []
    const chunkCount = Math.max(1, Math.ceil(blob.size / chunkSize))

    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
      const start = chunkIndex * chunkSize
      const end = Math.min(blob.size, start + chunkSize)
      const chunk = new Uint8Array(await blob.slice(start, end).arrayBuffer())

      fullHasher.update(chunk)
      chunkHashesSha256.push(await sha256(chunk))

      const response: IntegrityResponse = {
        id,
        progress: Math.round(((chunkIndex + 1) / chunkCount) * 100),
      }
      workerScope.postMessage(response)
    }

    const response: IntegrityResponse = {
      id,
      fileHashSha256: fullHasher.digest('hex'),
      chunkHashesSha256,
    }
    workerScope.postMessage(response)
  } catch (error) {
    const response: IntegrityResponse = {
      id,
      error:
        error instanceof Error
          ? error.message
          : 'Falha ao calcular a integridade SHA-256.',
    }
    workerScope.postMessage(response)
  }
}

export {}
