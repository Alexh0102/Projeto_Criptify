/// <reference lib="webworker" />

import { argon2id } from 'hash-wasm'

type Argon2Request = {
  id: number
  password: string
  salt: ArrayBuffer
  memorySizeKiB: number
  iterations: number
}

type Argon2Response =
  | {
      id: number
      keyBytes: ArrayBuffer
    }
  | {
      id: number
      error: string
    }

const workerScope = self as unknown as DedicatedWorkerGlobalScope

workerScope.onmessage = async (event: MessageEvent<Argon2Request>) => {
  const { id, password, salt, memorySizeKiB, iterations } = event.data

  try {
    const derivedBytes = await argon2id({
      password,
      salt: new Uint8Array(salt),
      iterations,
      parallelism: 1,
      memorySize: memorySizeKiB,
      hashLength: 32,
      outputType: 'binary',
    })
    const keyBytes = derivedBytes.slice().buffer
    const response: Argon2Response = { id, keyBytes }

    workerScope.postMessage(response, [keyBytes])
  } catch (error) {
    const response: Argon2Response = {
      id,
      error:
        error instanceof Error
          ? error.message
          : 'Falha ao executar Argon2id neste dispositivo.',
    }

    workerScope.postMessage(response)
  }
}

export {}
