import {
  DEFAULT_FILE_SECURITY_PROFILE_ID,
  FILE_SECURITY_PROFILES,
  type FileSecurityProfileId,
} from '../criptoveu'
import { Preferences } from '@capacitor/preferences'

import { isNativeApp } from '../platform'

export type UserAvatarId = 'shield-cyan' | 'lock' | 'terminal' | 'sparkles'

export type LocalStats = {
  totalFilesEncrypted: number
  totalFilesDecrypted: number
  totalBytesProcessed: number
  firstUsedTimestamp: number
}

export type CryptoPreferences = {
  defaultArgon2MemoryMb: number
  saveChunkSize: number
}

export type UserPreferences = {
  profile: {
    nickname: string
    email: string
    avatarId: UserAvatarId
  }
  stats: LocalStats
  crypto: CryptoPreferences
  ui: {
    language: 'pt-BR' | 'en' | 'es'
    theme: 'dark' | 'light'
  }
}

export type UserPreferencesPatch = {
  profile?: Partial<UserPreferences['profile']>
  stats?: Partial<UserPreferences['stats']>
  crypto?: Partial<UserPreferences['crypto']>
  ui?: Partial<UserPreferences['ui']>
}

const PREFERENCES_STORAGE_KEY = 'criptoveu_user_preferences_v1'
const LEGACY_PROFILE_STORAGE_KEY = 'criptoveu-user-profile-v1'
const LEGACY_SECURITY_PROFILE_STORAGE_KEY = 'criptoveu-file-security-profile-v3'
const DEFAULT_MEMORY_MB = 256

const DEFAULT_PREFERENCES: UserPreferences = {
  profile: {
    nickname: '',
    email: '',
    avatarId: 'shield-cyan',
  },
  stats: {
    totalFilesEncrypted: 0,
    totalFilesDecrypted: 0,
    totalBytesProcessed: 0,
    firstUsedTimestamp: Date.now(),
  },
  crypto: {
    defaultArgon2MemoryMb: DEFAULT_MEMORY_MB,
    saveChunkSize: 4,
  },
  ui: {
    language: 'pt-BR',
    theme: 'dark',
  },
}

function isValidMemory(value: unknown): value is number {
  return typeof value === 'number' && FILE_SECURITY_PROFILES.some((profile) => profile.memoryMb === value)
}

function isValidAvatar(value: unknown): value is UserAvatarId {
  return value === 'shield-cyan' || value === 'lock' || value === 'terminal' || value === 'sparkles'
}

function normalizePreferences(value: Partial<UserPreferences> | null | undefined): UserPreferences {
  const profile = value?.profile
  const stats = value?.stats
  const crypto = value?.crypto
  const ui = value?.ui

  return {
    profile: {
      nickname: typeof profile?.nickname === 'string' ? profile.nickname.trim().slice(0, 80) : DEFAULT_PREFERENCES.profile.nickname,
      email: typeof profile?.email === 'string' ? profile.email.trim().slice(0, 254) : DEFAULT_PREFERENCES.profile.email,
      avatarId: isValidAvatar(profile?.avatarId) ? profile.avatarId : DEFAULT_PREFERENCES.profile.avatarId,
    },
    stats: {
      totalFilesEncrypted: typeof stats?.totalFilesEncrypted === 'number' && stats.totalFilesEncrypted >= 0 ? Math.floor(stats.totalFilesEncrypted) : DEFAULT_PREFERENCES.stats.totalFilesEncrypted,
      totalFilesDecrypted: typeof stats?.totalFilesDecrypted === 'number' && stats.totalFilesDecrypted >= 0 ? Math.floor(stats.totalFilesDecrypted) : DEFAULT_PREFERENCES.stats.totalFilesDecrypted,
      totalBytesProcessed: typeof stats?.totalBytesProcessed === 'number' && stats.totalBytesProcessed >= 0 ? stats.totalBytesProcessed : DEFAULT_PREFERENCES.stats.totalBytesProcessed,
      firstUsedTimestamp: typeof stats?.firstUsedTimestamp === 'number' && stats.firstUsedTimestamp > 0 ? stats.firstUsedTimestamp : DEFAULT_PREFERENCES.stats.firstUsedTimestamp,
    },
    crypto: {
      defaultArgon2MemoryMb: isValidMemory(crypto?.defaultArgon2MemoryMb) ? crypto.defaultArgon2MemoryMb : DEFAULT_PREFERENCES.crypto.defaultArgon2MemoryMb,
      saveChunkSize: typeof crypto?.saveChunkSize === 'number' && crypto.saveChunkSize > 0 ? crypto.saveChunkSize : DEFAULT_PREFERENCES.crypto.saveChunkSize,
    },
    ui: {
      language: ui?.language === 'en' || ui?.language === 'es' || ui?.language === 'pt-BR' ? ui.language : DEFAULT_PREFERENCES.ui.language,
      theme: ui?.theme === 'light' ? 'light' : DEFAULT_PREFERENCES.ui.theme,
    },
  }
}

function readStoredPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return structuredClone(DEFAULT_PREFERENCES)
  }

  try {
    const rawValue = window.localStorage.getItem(PREFERENCES_STORAGE_KEY)
    const legacyProfile = window.localStorage.getItem(LEGACY_PROFILE_STORAGE_KEY)
    const legacySecurityProfile = window.localStorage.getItem(LEGACY_SECURITY_PROFILE_STORAGE_KEY)
    const parsed = rawValue ? JSON.parse(rawValue) as Partial<UserPreferences> : null
    const parsedLegacyProfile = legacyProfile ? JSON.parse(legacyProfile) as { displayName?: string; email?: string } : null
    const legacyProfileDefinition = FILE_SECURITY_PROFILES.find((profile) => profile.id === legacySecurityProfile)

    return normalizePreferences({
      ...parsed,
      profile: {
        ...parsed?.profile,
        nickname: parsed?.profile?.nickname ?? parsedLegacyProfile?.displayName ?? '',
        email: parsed?.profile?.email ?? parsedLegacyProfile?.email ?? '',
        avatarId: parsed?.profile?.avatarId ?? 'shield-cyan',
      },
      crypto: {
        ...parsed?.crypto,
        defaultArgon2MemoryMb: parsed?.crypto?.defaultArgon2MemoryMb ?? legacyProfileDefinition?.memoryMb ?? DEFAULT_MEMORY_MB,
        saveChunkSize: parsed?.crypto?.saveChunkSize ?? 4,
      },
    })
  } catch {
    return structuredClone(DEFAULT_PREFERENCES)
  }
}

function writeStoredPreferences(preferences: UserPreferences) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(normalizePreferences(preferences)))
  } catch {
    return
  }
}

async function readNativePreferences() {
  if (!isNativeApp()) {
    return null
  }

  try {
    const { value } = await Preferences.get({ key: PREFERENCES_STORAGE_KEY })

    if (!value) {
      return null
    }

    return normalizePreferences(JSON.parse(value) as Partial<UserPreferences>)
  } catch {
    return null
  }
}

async function writeNativePreferences(preferences: UserPreferences) {
  if (!isNativeApp()) {
    return
  }

  try {
    await Preferences.set({
      key: PREFERENCES_STORAGE_KEY,
      value: JSON.stringify(normalizePreferences(preferences)),
    })
  } catch {
    return
  }
}

function memoryToProfileId(memoryMb: number): FileSecurityProfileId {
  return FILE_SECURITY_PROFILES.find((profile) => profile.memoryMb === memoryMb)?.id ?? DEFAULT_FILE_SECURITY_PROFILE_ID
}

export function getPreferencesSync() {
  return readStoredPreferences()
}

export async function getPreferences() {
  const nativePreferences = await readNativePreferences()

  if (nativePreferences) {
    return nativePreferences
  }

  const fallbackPreferences = readStoredPreferences()
  await writeNativePreferences(fallbackPreferences)
  return fallbackPreferences
}

export async function updatePreferences(partial: UserPreferencesPatch) {
  const current = await getPreferences()
  const next = normalizePreferences({
    ...current,
    ...partial,
    profile: { ...current.profile, ...partial.profile },
    stats: { ...current.stats, ...partial.stats },
    crypto: { ...current.crypto, ...partial.crypto },
    ui: { ...current.ui, ...partial.ui },
  })

  writeStoredPreferences(next)
  await writeNativePreferences(next)
  return next
}

export async function incrementStats(filesCount: number, bytesCount: number, mode: 'encrypt' | 'decrypt') {
  const current = await getPreferences()
  const safeFilesCount = Math.max(0, Math.floor(filesCount))
  const safeBytesCount = Math.max(0, bytesCount)
  const next = await updatePreferences({
    stats: {
      totalFilesEncrypted: current.stats.totalFilesEncrypted + (mode === 'encrypt' ? safeFilesCount : 0),
      totalFilesDecrypted: current.stats.totalFilesDecrypted + (mode === 'decrypt' ? safeFilesCount : 0),
      totalBytesProcessed: current.stats.totalBytesProcessed + safeBytesCount,
      firstUsedTimestamp: current.stats.firstUsedTimestamp || Date.now(),
    },
  })

  return next.stats
}

export async function clearPreferences() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(PREFERENCES_STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_SECURITY_PROFILE_STORAGE_KEY)
  } catch {
    // Native Preferences ainda pode ser limpo mesmo quando o storage web falha.
  }

  if (isNativeApp()) {
    try {
      await Preferences.remove({ key: PREFERENCES_STORAGE_KEY })
    } catch {
      return
    }
  }
}

export function getSecurityProfileIdFromPreferences() {
  return memoryToProfileId(readStoredPreferences().crypto.defaultArgon2MemoryMb)
}
