export type DiagnosticStatus = 'ok' | 'warning' | 'fail'
export type BrowserDiagnosticsLocale = 'pt-BR' | 'en' | 'es'

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

type DiagnosticMessages = {
  unknownBrowser: string
  chromiumBrowser: string
  compatibleBrowser: string
  notReported: string
  summaries: Record<DiagnosticStatus, string>
  notes: [string, string, string]
  capabilities: Record<
    CapabilityId,
    {
      title: string
      ok: string
      fail: string
    }
  >
  profiles: {
    unavailable: string
    basicTitle: string
    basicOk: string
    basicWarning: string
    mediumTitle: string
    mediumOk: string
    mediumWarning: string
    highTitle: string
    highOk: string
    highWarning: string
    highFail: string
  }
}

const DIAGNOSTIC_MESSAGES: Record<BrowserDiagnosticsLocale, DiagnosticMessages> = {
  'pt-BR': {
    unknownBrowser: 'Navegador não identificado',
    chromiumBrowser: 'Google Chrome ou Chromium',
    compatibleBrowser: 'Navegador compatível',
    notReported: 'Não informado',
    summaries: {
      ok: 'Ambiente compatível com os recursos modernos do CriptoVéu.',
      warning:
        'Ambiente utilizável, com limitações ou perfis de memória que exigem cuidado.',
      fail: 'Ambiente incompatível para processamento seguro neste navegador.',
    },
    notes: [
      `${DIAGNOSTIC_VERSION}: diagnóstico local, sem envio de dados ao servidor.`,
      'A estimativa de memória é conservadora e depende do que o navegador declara.',
      'O teste não prova segurança absoluta; ele apenas verifica compatibilidade e riscos práticos do ambiente.',
    ],
    capabilities: {
      secureContext: {
        title: 'Contexto seguro',
        ok: 'HTTPS ou localhost ativo. As APIs criptográficas podem operar.',
        fail: 'Abra o site por HTTPS ou localhost para liberar as APIs críticas.',
      },
      webCrypto: {
        title: 'Web Crypto API',
        ok: 'crypto.subtle está disponível para AES-GCM e SHA-256.',
        fail: 'Este navegador não expõe crypto.subtle de forma compatível.',
      },
      aesGcm: {
        title: 'AES-256-GCM',
        ok: 'O navegador oferece a base necessária para chaves AES-GCM não extraíveis.',
        fail: 'Sem Web Crypto, o CriptoVéu não deve processar conteúdo sensível.',
      },
      webAssembly: {
        title: 'WebAssembly',
        ok: 'WebAssembly está disponível para executar Argon2id no navegador.',
        fail: 'Sem WebAssembly, a derivação Argon2id pode não funcionar.',
      },
      webWorker: {
        title: 'Web Worker',
        ok: 'Workers estão disponíveis para evitar congelamento da interface.',
        fail: 'Sem Worker, tarefas pesadas podem travar a tela.',
      },
      fileApi: {
        title: 'File API',
        ok: 'Leitura local de arquivos está disponível sem upload.',
        fail: 'Sem File API, as ferramentas de arquivo ficam indisponíveis.',
      },
      blobDownload: {
        title: 'Download local',
        ok: 'Blob e URL.createObjectURL permitem gerar downloads no dispositivo.',
        fail: 'Sem Blob URL, o navegador pode não conseguir salvar resultados locais.',
      },
      localStorage: {
        title: 'Preferências locais',
        ok: 'localStorage está acessível apenas para preferências e limites locais.',
        fail: 'Preferências e contadores locais podem ser perdidos neste navegador.',
      },
      serviceWorker: {
        title: 'Instalação/PWA',
        ok: 'Service Worker está disponível para recursos de app instalável.',
        fail: 'O site ainda pode funcionar, mas a instalação como app pode ser limitada.',
      },
    },
    profiles: {
      unavailable:
        'Indisponível neste ambiente porque faltam HTTPS, Web Crypto, WebAssembly ou Web Worker.',
      basicTitle: '64 MB - Básico',
      basicOk: 'Perfil adequado para celulares modestos e tarefas rápidas.',
      basicWarning:
        'Pode funcionar, mas este navegador declara pouca memória disponível.',
      mediumTitle: '256 MB - Recomendado',
      mediumOk: 'Bom equilíbrio para smartphones modernos e computadores.',
      mediumWarning:
        'Tente primeiro com arquivos pequenos; se houver lentidão, use o perfil básico.',
      highTitle: '512 MB - Alto',
      highOk: 'Perfil viável para computadores com boa memória.',
      highWarning: 'Use apenas em computadores e espere maior consumo de memória.',
      highFail:
        'Não recomendado para este ambiente; pode travar ou ser encerrado pelo navegador.',
    },
  },
  en: {
    unknownBrowser: 'Unidentified browser',
    chromiumBrowser: 'Google Chrome or Chromium',
    compatibleBrowser: 'Compatible browser',
    notReported: 'Not reported',
    summaries: {
      ok: 'Environment compatible with CriptoVéu modern features.',
      warning:
        'Usable environment, with limitations or memory profiles that require care.',
      fail: 'Incompatible environment for secure processing in this browser.',
    },
    notes: [
      `${DIAGNOSTIC_VERSION}: local diagnostic, with no data sent to the server.`,
      'The memory estimate is conservative and depends on what the browser reports.',
      'This test does not prove absolute security; it only checks compatibility and practical environment risks.',
    ],
    capabilities: {
      secureContext: {
        title: 'Secure context',
        ok: 'HTTPS or localhost is active. Cryptographic APIs can operate.',
        fail: 'Open the site over HTTPS or localhost to unlock critical APIs.',
      },
      webCrypto: {
        title: 'Web Crypto API',
        ok: 'crypto.subtle is available for AES-GCM and SHA-256.',
        fail: 'This browser does not expose crypto.subtle compatibly.',
      },
      aesGcm: {
        title: 'AES-256-GCM',
        ok: 'The browser provides the base needed for non-extractable AES-GCM keys.',
        fail: 'Without Web Crypto, CriptoVéu should not process sensitive content.',
      },
      webAssembly: {
        title: 'WebAssembly',
        ok: 'WebAssembly is available to run Argon2id in the browser.',
        fail: 'Without WebAssembly, Argon2id derivation may not work.',
      },
      webWorker: {
        title: 'Web Worker',
        ok: 'Workers are available to avoid freezing the interface.',
        fail: 'Without Workers, heavy tasks may freeze the screen.',
      },
      fileApi: {
        title: 'File API',
        ok: 'Local file reading is available without upload.',
        fail: 'Without the File API, file tools are unavailable.',
      },
      blobDownload: {
        title: 'Local download',
        ok: 'Blob and URL.createObjectURL can generate downloads on the device.',
        fail: 'Without Blob URLs, the browser may not save local results.',
      },
      localStorage: {
        title: 'Local preferences',
        ok: 'localStorage is available only for preferences and local limits.',
        fail: 'Local preferences and counters may be lost in this browser.',
      },
      serviceWorker: {
        title: 'Install/PWA',
        ok: 'Service Worker is available for installable app features.',
        fail: 'The site may still work, but installation as an app can be limited.',
      },
    },
    profiles: {
      unavailable:
        'Unavailable in this environment because HTTPS, Web Crypto, WebAssembly, or Web Worker is missing.',
      basicTitle: '64 MB - Basic',
      basicOk: 'Suitable profile for modest phones and quick tasks.',
      basicWarning: 'It may work, but this browser reports little available memory.',
      mediumTitle: '256 MB - Recommended',
      mediumOk: 'Good balance for modern smartphones and computers.',
      mediumWarning:
        'Try small files first; if there is slowness, use the basic profile.',
      highTitle: '512 MB - High',
      highOk: 'Viable profile for computers with good memory.',
      highWarning: 'Use only on computers and expect higher memory usage.',
      highFail:
        'Not recommended for this environment; it may freeze or be terminated by the browser.',
    },
  },
  es: {
    unknownBrowser: 'Navegador no identificado',
    chromiumBrowser: 'Google Chrome o Chromium',
    compatibleBrowser: 'Navegador compatible',
    notReported: 'No informado',
    summaries: {
      ok: 'Entorno compatible con los recursos modernos de CriptoVéu.',
      warning:
        'Entorno utilizable, con limitaciones o perfiles de memoria que requieren cuidado.',
      fail: 'Entorno incompatible para procesamiento seguro en este navegador.',
    },
    notes: [
      `${DIAGNOSTIC_VERSION}: diagnóstico local, sin envío de datos al servidor.`,
      'La estimación de memoria es conservadora y depende de lo que declara el navegador.',
      'La prueba no demuestra seguridad absoluta; solo verifica compatibilidad y riesgos prácticos del entorno.',
    ],
    capabilities: {
      secureContext: {
        title: 'Contexto seguro',
        ok: 'HTTPS o localhost está activo. Las APIs criptográficas pueden funcionar.',
        fail: 'Abre el sitio por HTTPS o localhost para habilitar las APIs críticas.',
      },
      webCrypto: {
        title: 'Web Crypto API',
        ok: 'crypto.subtle está disponible para AES-GCM y SHA-256.',
        fail: 'Este navegador no expone crypto.subtle de forma compatible.',
      },
      aesGcm: {
        title: 'AES-256-GCM',
        ok: 'El navegador ofrece la base necesaria para claves AES-GCM no extraíbles.',
        fail: 'Sin Web Crypto, CriptoVéu no debe procesar contenido sensible.',
      },
      webAssembly: {
        title: 'WebAssembly',
        ok: 'WebAssembly está disponible para ejecutar Argon2id en el navegador.',
        fail: 'Sin WebAssembly, la derivación Argon2id puede no funcionar.',
      },
      webWorker: {
        title: 'Web Worker',
        ok: 'Los Workers están disponibles para evitar que la interfaz se congele.',
        fail: 'Sin Worker, las tareas pesadas pueden congelar la pantalla.',
      },
      fileApi: {
        title: 'File API',
        ok: 'La lectura local de archivos está disponible sin carga.',
        fail: 'Sin File API, las herramientas de archivo quedan indisponibles.',
      },
      blobDownload: {
        title: 'Descarga local',
        ok: 'Blob y URL.createObjectURL permiten generar descargas en el dispositivo.',
        fail: 'Sin Blob URL, el navegador puede no guardar resultados locales.',
      },
      localStorage: {
        title: 'Preferencias locales',
        ok: 'localStorage está accesible solo para preferencias y límites locales.',
        fail: 'Las preferencias y contadores locales pueden perderse en este navegador.',
      },
      serviceWorker: {
        title: 'Instalación/PWA',
        ok: 'Service Worker está disponible para recursos de app instalable.',
        fail: 'El sitio aún puede funcionar, pero la instalación como app puede ser limitada.',
      },
    },
    profiles: {
      unavailable:
        'Indisponible en este entorno porque faltan HTTPS, Web Crypto, WebAssembly o Web Worker.',
      basicTitle: '64 MB - Básico',
      basicOk: 'Perfil adecuado para celulares modestos y tareas rápidas.',
      basicWarning:
        'Puede funcionar, pero este navegador declara poca memoria disponible.',
      mediumTitle: '256 MB - Recomendado',
      mediumOk: 'Buen equilibrio para smartphones modernos y computadoras.',
      mediumWarning:
        'Prueba primero con archivos pequeños; si hay lentitud, usa el perfil básico.',
      highTitle: '512 MB - Alto',
      highOk: 'Perfil viable para computadoras con buena memoria.',
      highWarning: 'Úsalo solo en computadoras y espera mayor consumo de memoria.',
      highFail:
        'No recomendado para este entorno; puede congelarse o ser finalizado por el navegador.',
    },
  },
}

export function resolveBrowserDiagnosticsLocale(
  language: string | undefined,
): BrowserDiagnosticsLocale {
  if (language?.toLowerCase().startsWith('es')) {
    return 'es'
  }

  if (language?.toLowerCase().startsWith('en')) {
    return 'en'
  }

  return 'pt-BR'
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
  messages: DiagnosticMessages,
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
      recommendation: messages.profiles.unavailable,
    }
  }

  if (id === 'basic') {
    const status: DiagnosticStatus = memoryGb !== undefined && memoryGb < 1 ? 'warning' : 'ok'

    return {
      id,
      memoryMb,
      status,
      title: messages.profiles.basicTitle,
      recommendation:
        status === 'ok'
          ? messages.profiles.basicOk
          : messages.profiles.basicWarning,
    }
  }

  if (id === 'medium') {
    const status: DiagnosticStatus =
      memoryGb === undefined ? 'warning' : memoryGb >= 4 || (!mobile && memoryGb >= 2) ? 'ok' : 'warning'

    return {
      id,
      memoryMb,
      status,
      title: messages.profiles.mediumTitle,
      recommendation:
        status === 'ok'
          ? messages.profiles.mediumOk
          : messages.profiles.mediumWarning,
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
    title: messages.profiles.highTitle,
    recommendation:
      status === 'ok'
        ? messages.profiles.highOk
        : status === 'warning'
          ? messages.profiles.highWarning
          : messages.profiles.highFail,
  }
}

function detectBrowserLabel(
  userAgent: string | undefined,
  messages: DiagnosticMessages,
) {
  if (!userAgent) {
    return messages.unknownBrowser
  }

  if (/Edg\//.test(userAgent)) {
    return 'Microsoft Edge'
  }

  if (/OPR\//.test(userAgent)) {
    return 'Opera'
  }

  if (/Chrome\//.test(userAgent) && !/Chromium\//.test(userAgent)) {
    return messages.chromiumBrowser
  }

  if (/Firefox\//.test(userAgent)) {
    return 'Mozilla Firefox'
  }

  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) {
    return 'Safari'
  }

  return messages.compatibleBrowser
}

export function createBrowserDiagnosticsReport(
  input: BrowserDiagnosticsInput,
  generatedAt = new Date().toISOString(),
  locale: BrowserDiagnosticsLocale = 'pt-BR',
): BrowserDiagnosticsReport {
  const messages = DIAGNOSTIC_MESSAGES[locale]
  const capabilities: BrowserCapability[] = [
    createCapability(
      'secureContext',
      input.isSecureContext,
      messages.capabilities.secureContext.title,
      messages.capabilities.secureContext.ok,
      messages.capabilities.secureContext.fail,
    ),
    createCapability(
      'webCrypto',
      input.hasCrypto && input.hasSubtleCrypto,
      messages.capabilities.webCrypto.title,
      messages.capabilities.webCrypto.ok,
      messages.capabilities.webCrypto.fail,
    ),
    createCapability(
      'aesGcm',
      input.hasCrypto && input.hasSubtleCrypto,
      messages.capabilities.aesGcm.title,
      messages.capabilities.aesGcm.ok,
      messages.capabilities.aesGcm.fail,
    ),
    createCapability(
      'webAssembly',
      input.hasWebAssembly,
      messages.capabilities.webAssembly.title,
      messages.capabilities.webAssembly.ok,
      messages.capabilities.webAssembly.fail,
    ),
    createCapability(
      'webWorker',
      input.hasWorker,
      messages.capabilities.webWorker.title,
      messages.capabilities.webWorker.ok,
      messages.capabilities.webWorker.fail,
    ),
    createCapability(
      'fileApi',
      input.hasFileApi,
      messages.capabilities.fileApi.title,
      messages.capabilities.fileApi.ok,
      messages.capabilities.fileApi.fail,
    ),
    createCapability(
      'blobDownload',
      input.hasBlob && input.hasObjectUrl,
      messages.capabilities.blobDownload.title,
      messages.capabilities.blobDownload.ok,
      messages.capabilities.blobDownload.fail,
    ),
    createCapability(
      'localStorage',
      input.localStorageAvailable,
      messages.capabilities.localStorage.title,
      messages.capabilities.localStorage.ok,
      messages.capabilities.localStorage.fail,
      false,
    ),
    createCapability(
      'serviceWorker',
      input.hasServiceWorker,
      messages.capabilities.serviceWorker.title,
      messages.capabilities.serviceWorker.ok,
      messages.capabilities.serviceWorker.fail,
      false,
    ),
  ]

  const argon2Profiles: Argon2ProfileAssessment[] = [
    assessArgon2Profile('basic', 64, input, messages),
    assessArgon2Profile('medium', 256, input, messages),
    assessArgon2Profile('high', 512, input, messages),
  ]

  const criticalFailure = capabilities.some((item) => item.critical && item.status === 'fail')
  const anyWarning =
    capabilities.some((item) => item.status === 'warning') ||
    argon2Profiles.some((item) => item.status === 'warning')
  const highProfileFails = argon2Profiles.some((item) => item.id === 'high' && item.status === 'fail')
  const overallStatus: DiagnosticStatus = criticalFailure ? 'fail' : anyWarning || highProfileFails ? 'warning' : 'ok'

  const memoryGb = normalizeDeviceMemory(input.deviceMemoryGb)

  return {
    generatedAt,
    overallStatus,
    summary: messages.summaries[overallStatus],
    capabilities,
    argon2Profiles,
    environment: {
      secureContext: input.isSecureContext,
      deviceMemoryGb: memoryGb ?? null,
      hardwareConcurrency: input.hardwareConcurrency ?? null,
      maxTouchPoints: input.maxTouchPoints ?? null,
      browserLabel: detectBrowserLabel(input.userAgent, messages),
      platform: input.platform ?? messages.notReported,
      language: input.language ?? messages.notReported,
    },
    notes: messages.notes,
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
