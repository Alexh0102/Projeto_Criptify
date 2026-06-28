import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { after, before, test } from 'node:test'

import { argon2id, createSHA256, sha256 } from 'hash-wasm'
import { createServer } from 'vite'

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto
}

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (callback) => {
    callback(performance.now())
    return 0
  }
}

class CryptoTestWorker {
  onmessage = null
  onerror = null

  postMessage(request) {
    Promise.resolve()
      .then(async () => {
        if ('blob' in request) {
          const fullHasher = await createSHA256()
          const chunkHashesSha256 = []
          const chunkCount = Math.max(
            1,
            Math.ceil(request.blob.size / request.chunkSize),
          )

          for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
            const start = chunkIndex * request.chunkSize
            const end = Math.min(
              request.blob.size,
              start + request.chunkSize,
            )
            const chunk = new Uint8Array(
              await request.blob.slice(start, end).arrayBuffer(),
            )
            fullHasher.update(chunk)
            chunkHashesSha256.push(await sha256(chunk))
            this.onmessage?.({
              data: {
                id: request.id,
                progress: Math.round(
                  ((chunkIndex + 1) / chunkCount) * 100,
                ),
              },
            })
          }

          this.onmessage?.({
            data: {
              id: request.id,
              fileHashSha256: fullHasher.digest('hex'),
              chunkHashesSha256,
            },
          })
          return
        }

        const derivedBytes = await argon2id({
          password: request.password,
          salt: new Uint8Array(request.salt),
          iterations: request.iterations,
          parallelism: 1,
          memorySize: request.memorySizeKiB,
          hashLength: 32,
          outputType: 'binary',
        })
        this.onmessage?.({
          data: {
            id: request.id,
            keyBytes: derivedBytes.slice().buffer,
          },
        })
      })
      .catch((error) => this.onerror?.(error))
  }

  terminate() {}
}

globalThis.Worker = CryptoTestWorker

const PASSWORD = 'senha-dupla-de-teste-2026'
const SOURCE_CONTENT = 'conteúdo protegido por dois fatores locais'
const KEY_FILE_CONTENT = 'arquivo-chave-canario-que-nao-pode-vazar'

let vite
let criptoveu
let keyFileProtection
let sourceFile
let keyFile
let encryptedFixture

before(async () => {
  vite = await createServer({
    configFile: false,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  })
  ;[criptoveu, keyFileProtection] = await Promise.all([
    vite.ssrLoadModule('/src/lib/criptoveu.ts'),
    vite.ssrLoadModule('/src/lib/key-file-protection.ts'),
  ])
  sourceFile = new File([SOURCE_CONTENT], 'documento-secreto.txt', {
    type: 'text/plain',
  })
  keyFile = new File([KEY_FILE_CONTENT], 'chave-local.key', {
    type: 'application/octet-stream',
  })
  encryptedFixture = await criptoveu.encryptFile(
    sourceFile,
    PASSWORD,
    undefined,
    {
      argon2MemoryMb: 8,
      argon2Iterations: 1,
      keyFile,
    },
  )
})

after(async () => {
  await vite?.close()
})

function packageFile() {
  return new File(
    [encryptedFixture.blob],
    'documento-secreto.txt.criptoveu',
    { type: 'application/octet-stream' },
  )
}

test('CRIPTOVEU5 exige senha e arquivo-chave para recuperar', async () => {
  assert.equal(
    await encryptedFixture.blob.slice(0, 10).text(),
    'CRIPTOVEU5',
  )
  const inspection = await criptoveu.inspectCriptoveuPackage(
    encryptedFixture.blob,
  )
  assert.equal(inspection.status, 'plausible')
  assert.equal(inspection.format, 'CRIPTOVEU5')
  assert.equal(inspection.keyFileRequired, true)

  const recovered = await criptoveu.decryptFile(
    packageFile(),
    PASSWORD,
    undefined,
    { keyFile },
  )
  assert.equal(recovered.downloadName, sourceFile.name)
  assert.equal(await recovered.blob.text(), SOURCE_CONTENT)
  assert.equal(recovered.securityReport.format, 'CRIPTOVEU5')
  assert.deepEqual(recovered.securityReport.keyFileProtection, {
    required: true,
    digest: 'SHA-256',
    embedded: false,
  })
})

test('pacote V5 rejeita ausência ou alteração de qualquer fator', async () => {
  await assert.rejects(
    () => criptoveu.decryptFile(packageFile(), PASSWORD),
    { code: 'KEY_FILE_REQUIRED' },
  )
  await assert.rejects(
    () =>
      criptoveu.decryptFile(packageFile(), 'senha-incorreta', undefined, {
        keyFile,
      }),
    { code: 'INVALID_PASSWORD_OR_FILE' },
  )
  await assert.rejects(
    () =>
      criptoveu.decryptFile(packageFile(), PASSWORD, undefined, {
        keyFile: new File(
          [`${KEY_FILE_CONTENT}!`],
          'chave-local.key',
        ),
      }),
    { code: 'INVALID_PASSWORD_OR_FILE' },
  )
})

test('nome do arquivo-chave não participa da derivação', async () => {
  const renamedKeyFile = new File(
    [KEY_FILE_CONTENT],
    'chave-renomeada.bin',
    { type: 'application/octet-stream' },
  )
  const recovered = await criptoveu.decryptFile(
    packageFile(),
    PASSWORD,
    undefined,
    { keyFile: renamedKeyFile },
  )

  assert.equal(await recovered.blob.text(), SOURCE_CONTENT)
})

test('arquivo-chave, hash e nome não são incorporados ao pacote ou relatório', async () => {
  const packageBytes = new Uint8Array(
    await encryptedFixture.blob.arrayBuffer(),
  )
  const packageText = new TextDecoder().decode(packageBytes)
  const keyHash = await sha256(new TextEncoder().encode(KEY_FILE_CONTENT))
  const reportText = JSON.stringify(encryptedFixture.securityReport)

  assert.doesNotMatch(packageText, new RegExp(KEY_FILE_CONTENT))
  assert.doesNotMatch(packageText, /chave-local\.key/)
  assert.doesNotMatch(packageText, new RegExp(keyHash, 'i'))
  assert.doesNotMatch(reportText, new RegExp(KEY_FILE_CONTENT))
  assert.doesNotMatch(reportText, /chave-local\.key/)
  assert.doesNotMatch(reportText, new RegExp(keyHash, 'i'))
})

test('material combinado é determinístico e separado por senha e conteúdo', async () => {
  const first = await keyFileProtection.derivePasswordKeyFileMaterial(
    PASSWORD,
    keyFile,
  )
  const sameBytesDifferentName =
    await keyFileProtection.derivePasswordKeyFileMaterial(
      PASSWORD,
      new File([KEY_FILE_CONTENT], 'outro-nome.key'),
    )
  const otherPassword =
    await keyFileProtection.derivePasswordKeyFileMaterial(
      `${PASSWORD}!`,
      keyFile,
    )
  const otherFile = await keyFileProtection.derivePasswordKeyFileMaterial(
    PASSWORD,
    new File([`${KEY_FILE_CONTENT}!`], 'chave-local.key'),
  )

  assert.match(first, /^[a-f0-9]{64}$/)
  assert.equal(first, sameBytesDifferentName)
  assert.notEqual(first, otherPassword)
  assert.notEqual(first, otherFile)
})

test('arquivo vazio, grande demais ou circular é rejeitado', async () => {
  await assert.rejects(
    () =>
      keyFileProtection.derivePasswordKeyFileMaterial(
        PASSWORD,
        new File([], 'vazio.key'),
      ),
    { code: 'KEY_FILE_EMPTY' },
  )

  assert.throws(
    () =>
      keyFileProtection.assertValidKeyFile({
        size: keyFileProtection.MAX_KEY_FILE_SIZE_BYTES + 1,
      }),
    { code: 'KEY_FILE_TOO_LARGE' },
  )

  await assert.rejects(
    () =>
      criptoveu.encryptFile(sourceFile, PASSWORD, undefined, {
        argon2MemoryMb: 8,
        argon2Iterations: 1,
        keyFile: sourceFile,
      }),
    { code: 'INVALID_KEY_FILE' },
  )
})

test('alterar assinatura V5 para V4 não contorna o arquivo-chave', async () => {
  const changed = new Uint8Array(await encryptedFixture.blob.arrayBuffer())
  changed[9] = '4'.charCodeAt(0)

  await assert.rejects(() =>
    criptoveu.decryptFile(
      new File([changed], 'assinatura-alterada.criptoveu'),
      PASSWORD,
    ),
  )
})
