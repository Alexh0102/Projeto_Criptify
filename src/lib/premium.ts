export type LimitedFeature = 'protected-link' | 'qr-code' | 'hidden-message'

export type EmailValidationResult =
  | { valid: true; normalizedEmail: string }
  | { valid: false; message: string }

export type FreeUsageStatus = {
  limit: number
  used: number
  remaining: number
  resetAt: number | null
}

type StoredUsage = Partial<Record<LimitedFeature, number[]>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const FREE_USAGE_STORAGE_KEY = 'criptoveu-free-usage-v1'
const WINDOW_MS = 24 * 60 * 60 * 1000

export const FREE_DAILY_GENERATION_LIMIT = 10
export const FREE_FILE_SIZE_BYTES = 10 * 1024 * 1024 * 1024
export const FREE_USAGE_CHANGE_EVENT = 'criptoveu-free-usage-change'

export const LIMITED_FEATURE_LABELS: Record<LimitedFeature, string> = {
  'protected-link': 'links protegidos',
  'qr-code': 'QRs protegidos',
  'hidden-message': 'imagens secretas',
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeUsage(rawValue: string | null): StoredUsage {
  if (!rawValue) {
    return {}
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredUsage

    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    return parsed
  } catch {
    return {}
  }
}

function readUsage(): StoredUsage {
  if (!canUseStorage()) {
    return {}
  }

  return normalizeUsage(window.localStorage.getItem(FREE_USAGE_STORAGE_KEY))
}

function writeUsage(usage: StoredUsage) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(FREE_USAGE_STORAGE_KEY, JSON.stringify(usage))
  window.dispatchEvent(new Event(FREE_USAGE_CHANGE_EVENT))
}

function getFreshTimestamps(timestamps: number[], now = Date.now()) {
  return timestamps.filter((timestamp) => now - timestamp < WINDOW_MS)
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function normalizeLicenseKey(licenseKey: string) {
  return licenseKey.replace(/\s+/g, '').toUpperCase()
}

export function validateLicenseEmail(email: string): EmailValidationResult {
  const normalizedEmail = normalizeEmail(email)

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return {
      valid: false,
      message: 'Informe um e-mail válido para receber sua chave de ativação.',
    }
  }

  return { valid: true, normalizedEmail }
}

export function getFreeUsageStatus(feature: LimitedFeature, now = Date.now()): FreeUsageStatus {
  const usage = readUsage()
  const freshTimestamps = getFreshTimestamps(usage[feature] ?? [], now)

  if (freshTimestamps.length !== (usage[feature] ?? []).length) {
    writeUsage({ ...usage, [feature]: freshTimestamps })
  }

  const used = freshTimestamps.length
  const oldestTimestamp = freshTimestamps.length > 0 ? Math.min(...freshTimestamps) : null

  return {
    limit: FREE_DAILY_GENERATION_LIMIT,
    used,
    remaining: Math.max(0, FREE_DAILY_GENERATION_LIMIT - used),
    resetAt: oldestTimestamp ? oldestTimestamp + WINDOW_MS : null,
  }
}

export function hasFreeUsageAvailable(feature: LimitedFeature) {
  return getFreeUsageStatus(feature).remaining > 0
}

export function consumeFreeUsage(feature: LimitedFeature, now = Date.now()) {
  const usage = readUsage()
  const freshTimestamps = getFreshTimestamps(usage[feature] ?? [], now)
  const nextUsage = {
    ...usage,
    [feature]: [...freshTimestamps, now],
  }

  writeUsage(nextUsage)
  return getFreeUsageStatus(feature, now)
}

export function clearFreeUsageCounters() {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.removeItem(FREE_USAGE_STORAGE_KEY)
  window.dispatchEvent(new Event(FREE_USAGE_CHANGE_EVENT))
}
