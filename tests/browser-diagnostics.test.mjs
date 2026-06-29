import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

import { createServer } from 'vite'

let vite
let diagnostics

before(async () => {
  vite = await createServer({
    configFile: false,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  })
  diagnostics = await vite.ssrLoadModule('/src/lib/browser-diagnostics.ts')
})

after(async () => {
  await vite?.close()
})

function baseInput(overrides = {}) {
  return {
    isSecureContext: true,
    hasCrypto: true,
    hasSubtleCrypto: true,
    hasWebAssembly: true,
    hasWorker: true,
    hasFileApi: true,
    hasBlob: true,
    hasObjectUrl: true,
    localStorageAvailable: true,
    hasServiceWorker: true,
    deviceMemoryGb: 8,
    hardwareConcurrency: 8,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
    maxTouchPoints: 0,
    language: 'pt-BR',
    platform: 'Win32',
    ...overrides,
  }
}

test('desktop moderno recebe diagnostico pronto', () => {
  const report = diagnostics.createBrowserDiagnosticsReport(
    baseInput(),
    '2026-06-29T00:00:00.000Z',
  )

  assert.equal(report.overallStatus, 'ok')
  assert.equal(report.environment.browserLabel, 'Google Chrome ou Chromium')
  assert.equal(report.capabilities.every((item) => item.status === 'ok'), true)
  assert.equal(report.argon2Profiles.find((item) => item.id === 'high').status, 'ok')
  assert.match(report.notes.join('\n'), /sem envio de dados ao servidor/)
})

test('contexto inseguro e Web Crypto ausente bloqueiam uso seguro', () => {
  const report = diagnostics.createBrowserDiagnosticsReport(
    baseInput({
      isSecureContext: false,
      hasCrypto: false,
      hasSubtleCrypto: false,
    }),
  )

  assert.equal(report.overallStatus, 'fail')
  assert.equal(
    report.capabilities.find((item) => item.id === 'secureContext').status,
    'fail',
  )
  assert.equal(
    report.capabilities.find((item) => item.id === 'webCrypto').status,
    'fail',
  )
  assert.equal(report.argon2Profiles.every((item) => item.status === 'fail'), true)
})

test('celular com pouca memoria evita perfil Argon2id alto', () => {
  const report = diagnostics.createBrowserDiagnosticsReport(
    baseInput({
      deviceMemoryGb: 2,
      hardwareConcurrency: 4,
      userAgent:
        'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36',
      maxTouchPoints: 5,
      platform: 'Linux armv8l',
    }),
  )

  assert.equal(report.overallStatus, 'warning')
  assert.equal(report.argon2Profiles.find((item) => item.id === 'basic').status, 'ok')
  assert.equal(
    report.argon2Profiles.find((item) => item.id === 'medium').status,
    'warning',
  )
  assert.equal(report.argon2Profiles.find((item) => item.id === 'high').status, 'fail')
})

test('preferencias locais indisponiveis geram alerta nao critico', () => {
  const report = diagnostics.createBrowserDiagnosticsReport(
    baseInput({ localStorageAvailable: false, hasServiceWorker: false }),
  )

  assert.equal(report.overallStatus, 'warning')
  assert.equal(
    report.capabilities.find((item) => item.id === 'localStorage').critical,
    false,
  )
  assert.equal(
    report.capabilities.find((item) => item.id === 'serviceWorker').status,
    'warning',
  )
})

