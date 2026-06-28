import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { after, before, test } from 'node:test'

import { createServer } from 'vite'

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto
}

let vite
let passwordSecurity

before(async () => {
  vite = await createServer({
    configFile: false,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  })
  passwordSecurity = await vite.ssrLoadModule('/src/lib/password-security.ts')
})

after(async () => {
  await vite?.close()
})

test('chave máxima contém 32 bytes aleatórios em hexadecimal', () => {
  const generated = Array.from({ length: 64 }, () =>
    passwordSecurity.generateSecureCredential('key'),
  )

  for (const credential of generated) {
    assert.equal(credential.mode, 'key')
    assert.equal(credential.entropyBits, 256)
    assert.match(credential.value, /^[A-F0-9]{64}$/)
    assert.equal(Buffer.from(credential.value, 'hex').byteLength, 32)
  }

  assert.equal(new Set(generated.map(({ value }) => value)).size, 64)
})

test('senha aleatória tem 24 caracteres e inclui todas as classes', () => {
  const generated = Array.from({ length: 64 }, () =>
    passwordSecurity.generateSecureCredential('password'),
  )

  for (const credential of generated) {
    assert.equal(credential.mode, 'password')
    assert.equal(credential.entropyBits, 128)
    assert.equal(credential.value.length, 24)
    assert.match(credential.value, /[a-z]/)
    assert.match(credential.value, /[A-Z]/)
    assert.match(credential.value, /\d/)
    assert.match(credential.value, /[^A-Za-z0-9]/)
  }

  assert.equal(new Set(generated.map(({ value }) => value)).size, 64)
})

test('frase-senha usa oito palavras distintas e sufixo numérico', () => {
  const generated = passwordSecurity.generateSecureCredential('passphrase')
  const parts = generated.value.split('-')
  const words = parts.slice(0, -1)
  const suffix = parts.at(-1)

  assert.equal(generated.mode, 'passphrase')
  assert.equal(generated.entropyBits, 62)
  assert.equal(words.length, 8)
  assert.equal(new Set(words).size, 8)
  assert.match(suffix, /^\d{2}$/)
})

test('medidor penaliza padrões humanos previsíveis', () => {
  const short = passwordSecurity.analyzePasswordStrength('Ab1!')
  const common = passwordSecurity.analyzePasswordStrength('Senha123456!')
  const project = passwordSecurity.analyzePasswordStrength('CriptoVeu-2026!')
  const repeated = passwordSecurity.analyzePasswordStrength('aaaaaaaaaaaaaaaa')
  const sequence = passwordSecurity.analyzePasswordStrength('abcd-9876543210')
  const fakeHexKey = passwordSecurity.analyzePasswordStrength('0'.repeat(64))

  assert.equal(short.isWeak, true)
  assert.ok(short.warnings.includes('tooShort'))
  assert.ok(short.warnings.includes('misleadingSymbols'))

  assert.equal(common.isWeak, true)
  assert.ok(common.warnings.includes('commonPattern'))
  assert.ok(common.warnings.includes('sequence'))

  assert.equal(project.isWeak, true)
  assert.ok(project.warnings.includes('projectName'))
  assert.ok(project.warnings.includes('year'))

  assert.ok(repeated.warnings.includes('repetition'))
  assert.ok(repeated.warnings.includes('lowVariety'))
  assert.ok(sequence.warnings.includes('sequence'))
  assert.equal(fakeHexKey.isWeak, true)
  assert.ok(fakeHexKey.warnings.includes('repetition'))
  assert.ok(fakeHexKey.warnings.includes('lowVariety'))
})

test('entropia conhecida da geração não é confundida com estimativa humana', () => {
  const key = passwordSecurity.generateSecureCredential('key')
  const generatedAnalysis = passwordSecurity.analyzePasswordStrength(
    key.value,
    key.entropyBits,
  )
  const manualAnalysis = passwordSecurity.analyzePasswordStrength(key.value)

  assert.equal(generatedAnalysis.level, 'veryStrong')
  assert.equal(generatedAnalysis.estimatedEntropyBits, 256)
  assert.equal(generatedAnalysis.warnings.length, 0)
  assert.ok(manualAnalysis.score <= generatedAnalysis.score)
  assert.ok(manualAnalysis.score >= 1)
})

test('gerador usa Web Crypto e não usa Math.random', async () => {
  const source = await readFile(
    new URL('../src/lib/password-security.ts', import.meta.url),
    'utf8',
  )

  assert.match(source, /crypto\.getRandomValues/)
  assert.doesNotMatch(source, /Math\.random/)
})
