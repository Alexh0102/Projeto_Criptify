import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { after, before, test } from 'node:test'

import { argon2id } from 'hash-wasm'
import { createServer } from 'vite'

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto
}

if (!globalThis.atob) {
  globalThis.atob = (value) => Buffer.from(value, 'base64').toString('binary')
}

if (!globalThis.btoa) {
  globalThis.btoa = (value) => Buffer.from(value, 'binary').toString('base64')
}

class Argon2TestWorker {
  onmessage = null
  onerror = null

  postMessage(request) {
    Promise.resolve()
      .then(async () => {
        const derivedBytes = await argon2id({
          password: request.password,
          salt: new Uint8Array(request.salt),
          iterations: request.iterations,
          parallelism: 1,
          memorySize: request.memorySizeKiB,
          hashLength: 32,
          outputType: 'binary',
        })
        const keyBytes = derivedBytes.slice().buffer
        this.onmessage?.({ data: { id: request.id, keyBytes } })
      })
      .catch((error) => this.onerror?.(error))
  }

  terminate() {}
}

globalThis.Worker = Argon2TestWorker

let vite
let portableVault
let veuNotesCrypto

before(async () => {
  vite = await createServer({
    configFile: false,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  })

  ;[portableVault, veuNotesCrypto] = await Promise.all([
    vite.ssrLoadModule('/src/lib/portable-vault.ts'),
    vite.ssrLoadModule('/src/lib/veunotes-crypto.ts'),
  ])
})

after(async () => {
  await vite?.close()
})

test('cofre portátil cria, edita, etiqueta e pesquisa várias notas', () => {
  const initial = portableVault.createPortableVault('', 1_000)
  const first = portableVault.createPortableVaultNote('Banco', 1_100)
  const second = portableVault.createPortableVaultNote('Servidor', 1_200)
  let vault = portableVault.addPortableVaultNote(initial, first)
  vault = portableVault.addPortableVaultNote(vault, second)
  vault = portableVault.updatePortableVaultNote(
    vault,
    first.id,
    {
      content: 'Código de recuperação canário',
      tags: [' pessoal ', 'recuperação', 'pessoal'],
    },
    1_300,
  )

  const decoded = portableVault.decodePortableVaultPlaintext(
    portableVault.serializePortableVault(vault),
  )

  assert.equal(decoded.migratedFromLegacyNote, false)
  assert.equal(decoded.vault.notes.length, 2)
  assert.deepEqual(
    decoded.vault.notes.find((note) => note.id === first.id).tags,
    ['pessoal', 'recuperação'],
  )
  assert.deepEqual(
    portableVault
      .searchPortableVaultNotes(decoded.vault.notes, 'CANÁRIO')
      .map((note) => note.id),
    [first.id],
  )
  assert.deepEqual(
    portableVault
      .searchPortableVaultNotes(decoded.vault.notes, 'recuperação')
      .map((note) => note.id),
    [first.id],
  )
})

test('nota única legada é migrada sem interpretar JSON comum como formato', () => {
  const legacyText = '{"notes":["isso continua sendo texto da nota"]}'
  const decoded = portableVault.decodePortableVaultPlaintext(legacyText)

  assert.equal(decoded.migratedFromLegacyNote, true)
  assert.equal(decoded.vault.notes.length, 1)
  assert.equal(decoded.vault.notes[0].content, legacyText)
  assert.equal(decoded.vault.notes[0].title, 'Nota migrada')
})

test('documento portátil rejeita campos extras e identificadores duplicados', () => {
  const vault = portableVault.createPortableVault()
  const note = portableVault.createPortableVaultNote()
  const withNote = portableVault.addPortableVaultNote(vault, note)

  assert.throws(
    () =>
      portableVault.assertPortableVaultDocument({
        ...withNote,
        password: 'campo-proibido',
      }),
    /estrutura inválida/,
  )
  assert.throws(
    () =>
      portableVault.assertPortableVaultDocument({
        ...withNote,
        notes: [note, { ...note }],
      }),
    /duplicados/,
  )
  assert.throws(
    () =>
      portableVault.assertPortableVaultDocument({
        ...withNote,
        notes: [{ ...note, content: 'x'.repeat(1_000_001) }],
      }),
    /campos inválidos/,
  )
})

test('arquivo NOTE2 não expõe senha, títulos, etiquetas ou conteúdo do cofre', async () => {
  const password = 'senha-portatil-canario-2026'
  const vault = portableVault.createPortableVault()
  const note = portableVault.createPortableVaultNote(
    'titulo-portatil-canario',
  )
  const populated = portableVault.updatePortableVaultNote(
    portableVault.addPortableVaultNote(vault, note),
    note.id,
    {
      content: 'conteudo-portatil-canario',
      tags: ['etiqueta-portatil-canario'],
    },
  )
  const plaintext = portableVault.serializePortableVault(populated)
  const { blob } = await veuNotesCrypto.createVeuNotesVault(
    plaintext,
    password,
  )
  const exported = JSON.stringify(blob)

  for (const secret of [
    password,
    'titulo-portatil-canario',
    'conteudo-portatil-canario',
    'etiqueta-portatil-canario',
  ]) {
    assert.equal(exported.includes(secret), false)
  }

  const unlocked = await veuNotesCrypto.unlockVeuNotesBlob(blob, password)
  const recovered = portableVault.decodePortableVaultPlaintext(
    unlocked.plaintext,
  )

  assert.equal(recovered.vault.notes[0].title, 'titulo-portatil-canario')
  assert.equal(recovered.vault.notes[0].content, 'conteudo-portatil-canario')
  await assert.rejects(() =>
    veuNotesCrypto.unlockVeuNotesBlob(blob, 'senha-incorreta-para-o-cofre'),
  )
})

test('NOTE3 recupera um ciphertext danificado com paridade', async () => {
  const plaintext = 'backup recuperável com paridade'
  const { blob } = await veuNotesCrypto.createVeuNotesVault(
    plaintext,
    'senha-portatil-paridade-2026',
    'recoverable',
  )
  const ciphertext = Buffer.from(blob.ciphertext, 'base64')
  ciphertext[12] ^= 0x01
  const damaged = {
    ...blob,
    ciphertext: ciphertext.toString('base64'),
  }

  assert.equal(blob.version, 3)
  assert.equal(blob.type, 'NOTE3')
  assert.equal(
    (await veuNotesCrypto.unlockVeuNotesBlob(
      damaged,
      'senha-portatil-paridade-2026',
    )).plaintext,
    plaintext,
  )
})
