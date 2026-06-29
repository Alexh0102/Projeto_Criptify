export type DiagnosticStatus = 'ok' | 'warning' | 'fail'

export type CapabilityId =
  | 'secureContext'
  | 'webCrypto'
  | 'aesGcm'
  | 'webAssembly'
  | 'webWorker'
  | 'fileApi'
  | 'blobDownload'
  | 'localStorage'
  | 'serviceWorker'

export type BrowserCapability = {
  id: CapabilityId
  status: DiagnosticStatus
  critical: boolean
  title: string
  description: string
}

export type Argon2ProfileId = 'basic' | 'medium' | 'high'

export type Argon2ProfileAssessment = {
  id: Argon2ProfileId
  memoryMb: 64 | 256 | 512
  status: DiagnosticStatus
  title: string
  recommendation: string
}

export type BrowserDiagnosticsInput = {
  isSecureContext: boolean
  hasCrypto: boolean
  hasSubtleCrypto: boolean
  hasWebAssembly: boolean
  hasWorker: boolean
  hasFileApi: boolean
  hasBlob: boolean
  hasObjectUrl: boolean
  localStorageAvailable: boolean
  hasServiceWorker: boolean
  deviceMemoryGb?: number
  hardwareConcurrency?: number
  userAgent?: string
  maxTouchPoints?: number
  language?: string
  platform?: string
}

export type BrowserDiagnosticsReport = {
  generatedAt: string
  overallStatus: DiagnosticStatus
  summary: string
  capabilities: BrowserCapability[]
  argon2Profiles: Argon2ProfileAssessment[]
  environment: {
    secureContext: boolean
    deviceMemoryGb: number | null
    hardwareConcurrency: number | null
    maxTouchPoints: number | null
    browserLabel: string
    platform: string
    language: string
  }
  notes: string[]
}

const DIAGNOSTIC_VERSION = 'BROWSER_DIAGNOSTICS1'

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number
}

function isLikelyMobile(input: BrowserDiagnosticsInput) {
  const userAgent = input.userAgent?.toLowerCase() ?? ''

  return (
    (input.maxTouchPoints ?? 0) > 1 ||
    /android|iphone|ipad|ipod|mobile/.test(userAgent)
  )
}

function normalizeDeviceMemory(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined
  }

  return value
}

function createCapability(
  id: CapabilityId,
  condition: boolean,
  title: string,
  okDescription: string,
  failDescription: string,
  critical = true,
): BrowserCapability {
  return {
    id,
    status: condition ? 'ok' : critical ? 'fail' : 'warning',
    critical,
    title,
    description: condition ? okDescription : failDescription,
  }
}

function assessArgon2Profile(
  id: Argon2ProfileId,
  memoryMb: 64 | 256 | 512,
  input: BrowserDiagnosticsInput,
): Argon2ProfileAssessment {
  const memoryGb = normalizeDeviceMemory(input.deviceMemoryGb)
  const cores = input.hardwareConcurrency ?? 0
  const mobile = isLikelyMobile(input)
  const missingRuntime =
    !input.isSecureContext || !input.hasCrypto || !input.hasSubtleCrypto || !input.hasWebAssembly || !input.hasWorker

  if (missingRuntime) {
    return {
      id,
      memoryMb,
      status: 'fail',
      title: `${memoryMb} MB`,
      recommendation:
        'Indisponível neste ambiente porque faltam HTTPS, Web Crypto, WebAssembly ou Web Worker.',
    }
  }

  if (id === 'basic') {
    const status: DiagnosticStatus = memoryGb !== undefined && memoryGb < 1 ? 'warning' : 'ok'

    return {
      id,
      memoryMb,
      status,
      title: '64 MB - Básico',
      recommendation:
        status === 'ok'
          ? 'Perfil adequado para celulares modestos e tarefas rápidas.'
          : 'Pode funcionar, mas este navegador declara pouca memória disponível.',
    }
  }

  if (id === 'medium') {
    const status: DiagnosticStatus =
      memoryGb === undefined ? 'warning' : memoryGb >= 4 || (!mobile && memoryGb >= 2) ? 'ok' : 'warning'

    return {
      id,
      memoryMb,
      status,
      title: '256 MB - Recomendado',
      recommendation:
        status === 'ok'
          ? 'Bom equilíbrio para smartphones modernos e computadores.'
          : 'Tente primeiro com arquivos pequenos; se houver lentidão, use o perfil básico.',
    }
  }

  const status: DiagnosticStatus =
    memoryGb !== undefined && memoryGb >= 8 && cores >= 4 && !mobile
      ? 'ok'
      : memoryGb !== undefined && memoryGb >= 4 && !mobile
        ? 'warning'
        : 'fail'

  return {
    id,
    memoryMb,
    status,
    title: '512 MB - Alto',
    recommendation:
      status === 'ok'
        ? 'Perfil viável para computadores com boa memória.'
        : status === 'warning'
          ? 'Use apenas em computadores e espere maior consumo de memória.'
          : 'Não recomendado para este ambiente; pode travar ou ser encerrado pelo navegador.',
  }
}

function detectBrowserLabel(userAgent: string | undefined) {
  if (!userAgent) {
    return 'Navegador não identificado'
  }

  if (/Edg\//.test(userAgent)) {
    return 'Microsoft Edge'
  }

  if (/OPR\//.test(userAgent)) {
    return 'Opera'
  }

  if (/Chrome\//.test(userAgent) && !/Chromium\//.test(userAgent)) {
    return 'Google Chrome ou Chromium'
  }

  if (/Firefox\//.test(userAgent)) {
    return 'Mozilla Firefox'
  }

  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) {
    return 'Safari'
  }

  return 'Navegador compatível'
}

export function createBrowserDiagnosticsReport(
  input: BrowserDiagnosticsInput,
  generatedAt = new Date().toISOString(),
): BrowserDiagnosticsReport {
  const capabilities: BrowserCapability[] = [
    createCapability(
      'secureContext',
      input.isSecureContext,
      'Contexto seguro',
      'HTTPS ou localhost ativo. As APIs criptográficas podem operar.',
      'Abra o site por HTTPS ou localhost para liberar as APIs críticas.',
    ),
    createCapability(
      'webCrypto',
      input.hasCrypto && input.hasSubtleCrypto,
      'Web Crypto API',
      'crypto.subtle está disponível para AES-GCM e SHA-256.',
      'Este navegador não expõe crypto.subtle de forma compatível.',
    ),
    createCapability(
      'aesGcm',
      input.hasCrypto && input.hasSubtleCrypto,
      'AES-256-GCM',
      'O navegador oferece a base necessária para chaves AES-GCM não extraíveis.',
      'Sem Web Crypto, o CriptoVéu não deve processar conteúdo sensível.',
    ),
    createCapability(
      'webAssembly',
      input.hasWebAssembly,
      'WebAssembly',
      'WebAssembly está disponível para executar Argon2id no navegador.',
      'Sem WebAssembly, a derivação Argon2id pode não funcionar.',
    ),
    createCapability(
      'webWorker',
      input.hasWorker,
      'Web Worker',
      'Workers estão disponíveis para evitar congelamento da interface.',
      'Sem Worker, tarefas pesadas podem travar a tela.',
    ),
    createCapability(
      'fileApi',
      input.hasFileApi,
      'File API',
      'Leitura local de arquivos está disponível sem upload.',
      'Sem File API, as ferramentas de arquivo ficam indisponíveis.',
    ),
    createCapability(
      'blobDownload',
      input.hasBlob && input.hasObjectUrl,
      'Download local',
      'Blob e URL.createObjectURL permitem gerar downloads no dispositivo.',
      'Sem Blob URL, o navegador pode não conseguir salvar resultados locais.',
    ),
    createCapability(
      'localStorage',
      input.localStorageAvailable,
      'Preferências locais',
      'localStorage está acessível apenas para preferências e limites locais.',
      'Preferências e contadores locais podem ser perdidos neste navegador.',
      false,
    ),
    createCapability(
      'serviceWorker',
      input.hasServiceWorker,
      'Instalação/PWA',
      'Service Worker está disponível para recursos de app instalável.',
      'O site ainda pode funcionar, mas a instalação como app pode ser limitada.',
      false,
    ),
  ]

  const argon2Profiles: Argon2ProfileAssessment[] = [
    assessArgon2Profile('basic', 64, input),
    assessArgon2Profile('medium', 256, input),
    assessArgon2Profile('high', 512, input),
  ]

  const criticalFailure = capabilities.some((item) => item.critical && item.status === 'fail')
  const anyWarning =
    capabilities.some((item) => item.status === 'warning') ||
    argon2Profiles.some((item) => item.status === 'warning')
  const highProfileFails = argon2Profiles.some((item) => item.id === 'high' && item.status === 'fail')
  const overallStatus: DiagnosticStatus = criticalFailure ? 'fail' : anyWarning || highProfileFails ? 'warning' : 'ok'

  const summary =
    overallStatus === 'ok'
      ? 'Ambiente compatível com os recursos modernos do CriptoVéu.'
      : overallStatus === 'warning'
        ? 'Ambiente utilizável, com limitações ou perfis de memória que exigem cuidado.'
        : 'Ambiente incompatível para processamento seguro neste navegador.'

  const memoryGb = normalizeDeviceMemory(input.deviceMemoryGb)

  return {
    generatedAt,
    overallStatus,
    summary,
    capabilities,
    argon2Profiles,
    environment: {
      secureContext: input.isSecureContext,
      deviceMemoryGb: memoryGb ?? null,
      hardwareConcurrency: input.hardwareConcurrency ?? null,
      maxTouchPoints: input.maxTouchPoints ?? null,
      browserLabel: detectBrowserLabel(input.userAgent),
      platform: input.platform ?? 'Não informado',
      language: input.language ?? 'Não informado',
    },
    notes: [
      `${DIAGNOSTIC_VERSION}: diagnóstico local, sem envio de dados ao servidor.`,
      'A estimativa de memória é conservadora e depende do que o navegador declara.',
      'O teste não prova segurança absoluta; ele apenas verifica compatibilidade e riscos práticos do ambiente.',
    ],
  }
}

function canUseLocalStorage() {
  try {
    const key = 'criptoveu-browser-diagnostics'
    window.localStorage.setItem(key, '1')
    window.localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export function collectBrowserDiagnosticsInput(): BrowserDiagnosticsInput {
  const navigatorWithMemory = navigator as NavigatorWithDeviceMemory

  return {
    isSecureContext: window.isSecureContext,
    hasCrypto: typeof window.crypto !== 'undefined',
    hasSubtleCrypto: typeof window.crypto?.subtle !== 'undefined',
    hasWebAssembly: typeof WebAssembly !== 'undefined',
    hasWorker: typeof Worker !== 'undefined',
    hasFileApi: typeof File !== 'undefined' && typeof FileReader !== 'undefined',
    hasBlob: typeof Blob !== 'undefined',
    hasObjectUrl: typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function',
    localStorageAvailable: canUseLocalStorage(),
    hasServiceWorker: 'serviceWorker' in navigator,
    deviceMemoryGb: navigatorWithMemory.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    language: navigator.language,
    platform: navigator.platform,
  }
}
