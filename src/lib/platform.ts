import { Capacitor } from '@capacitor/core'

/**
 * Utilitários para detecção de plataforma e configuração de API
 * Usado para diferenciar comportamento entre PWA (navegador) e App Nativo (Capacitor)
 */

export function isNativeApp(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return Boolean(
    Capacitor.isNativePlatform() ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'ionic:'
  )
}

/**
 * Retorna a URL base da API.
 * No app nativo (Capacitor), usa a URL de produção completa.
 * No navegador (PWA), usa URLs relativas (mesmo domínio).
 */
export function getApiBaseUrl(): string {
  if (isNativeApp()) {
    // No app nativo, usar a URL completa da API de produção
    // Esta URL deve ser configurada via variável de ambiente no build
    return import.meta.env.VITE_API_BASE_URL || 'https://criptoveu.com'
  }

  // No navegador, usar URLs relativas (mesmo domínio)
  return ''
}

/**
 * Constrói a URL completa para um endpoint da API
 */
export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) {
    return endpoint
  }
  // Garantir que não haja barra dupla
  const cleanBase = baseUrl.replace(/\/$/, '')
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${cleanBase}${cleanEndpoint}`
}