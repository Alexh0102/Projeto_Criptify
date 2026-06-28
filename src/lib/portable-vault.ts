const PORTABLE_VAULT_FORMAT = 'PORTABLE_VAULT1'
const PORTABLE_VAULT_FIELDS = [
  'format',
  'version',
  'id',
  'createdAt',
  'updatedAt',
  'notes',
] as const
const PORTABLE_NOTE_FIELDS = [
  'id',
  'title',
  'content',
  'tags',
  'createdAt',
  'updatedAt',
] as const

export const PORTABLE_VAULT_VERSION = 1
export const PORTABLE_VAULT_MAX_NOTES = 500
export const PORTABLE_VAULT_MAX_TITLE_LENGTH = 160
export const PORTABLE_VAULT_MAX_CONTENT_LENGTH = 1_000_000
export const PORTABLE_VAULT_MAX_TAGS_PER_NOTE = 12
export const PORTABLE_VAULT_MAX_TAG_LENGTH = 40

export type PortableVaultNote = {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export type PortableVaultDocument = {
  format: typeof PORTABLE_VAULT_FORMAT
  version: typeof PORTABLE_VAULT_VERSION
  id: string
  createdAt: number
  updatedAt: number
  notes: PortableVaultNote[]
}

export type PortableVaultDecodeResult = {
  vault: PortableVaultDocument
  migratedFromLegacyNote: boolean
}

export class PortableVaultError extends Error {
  code: 'INVALID_DOCUMENT' | 'LIMIT_EXCEEDED'

  constructor(
    code: 'INVALID_DOCUMENT' | 'LIMIT_EXCEEDED',
    message: string,
  ) {
    super(message)
    this.name = 'PortableVaultError'
    this.code = code
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasExactFields(
  value: Record<string, unknown>,
  fields: readonly string[],
) {
  const keys = Object.keys(value)
  return (
    keys.length === fields.length &&
    keys.every((key) => fields.includes(key))
  )
}

function isSafeTimestamp(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
  )
}

function isSafeId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 16 &&
    value.length <= 128 &&
    /^[A-Za-z0-9_-]+$/.test(value)
  )
}

function randomId() {
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)

  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function normalizeTags(tags: readonly string[]) {
  const normalized = tags
    .map((tag) => tag.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .map((tag) => tag.slice(0, PORTABLE_VAULT_MAX_TAG_LENGTH))

  return [...new Set(normalized)].slice(0, PORTABLE_VAULT_MAX_TAGS_PER_NOTE)
}

function validateNote(value: unknown): value is PortableVaultNote {
  if (!isRecord(value) || !hasExactFields(value, PORTABLE_NOTE_FIELDS)) {
    return false
  }

  return (
    isSafeId(value.id) &&
    typeof value.title === 'string' &&
    value.title.length <= PORTABLE_VAULT_MAX_TITLE_LENGTH &&
    typeof value.content === 'string' &&
    value.content.length <= PORTABLE_VAULT_MAX_CONTENT_LENGTH &&
    Array.isArray(value.tags) &&
    value.tags.length <= PORTABLE_VAULT_MAX_TAGS_PER_NOTE &&
    value.tags.every(
      (tag) =>
        typeof tag === 'string' &&
        tag.length > 0 &&
        tag.length <= PORTABLE_VAULT_MAX_TAG_LENGTH,
    ) &&
    new Set(value.tags).size === value.tags.length &&
    isSafeTimestamp(value.createdAt) &&
    isSafeTimestamp(value.updatedAt) &&
    value.updatedAt >= value.createdAt
  )
}

export function assertPortableVaultDocument(
  value: unknown,
): PortableVaultDocument {
  if (
    !isRecord(value) ||
    !hasExactFields(value, PORTABLE_VAULT_FIELDS) ||
    value.format !== PORTABLE_VAULT_FORMAT ||
    value.version !== PORTABLE_VAULT_VERSION ||
    !isSafeId(value.id) ||
    !isSafeTimestamp(value.createdAt) ||
    !isSafeTimestamp(value.updatedAt) ||
    value.updatedAt < value.createdAt ||
    !Array.isArray(value.notes)
  ) {
    throw new PortableVaultError(
      'INVALID_DOCUMENT',
      'O conteúdo do cofre portátil usa uma estrutura inválida.',
    )
  }

  if (value.notes.length > PORTABLE_VAULT_MAX_NOTES) {
    throw new PortableVaultError(
      'LIMIT_EXCEEDED',
      `O cofre excede o limite de ${PORTABLE_VAULT_MAX_NOTES} notas.`,
    )
  }

  if (!value.notes.every(validateNote)) {
    throw new PortableVaultError(
      'INVALID_DOCUMENT',
      'Uma ou mais notas do cofre possuem campos inválidos.',
    )
  }

  if (new Set(value.notes.map((note) => note.id)).size !== value.notes.length) {
    throw new PortableVaultError(
      'INVALID_DOCUMENT',
      'O cofre contém identificadores de nota duplicados.',
    )
  }

  return value as PortableVaultDocument
}

export function createPortableVault(
  legacyContent = '',
  now = Date.now(),
): PortableVaultDocument {
  const notes =
    legacyContent.length > 0
      ? [
          {
            id: randomId(),
            title: 'Nota migrada',
            content: legacyContent,
            tags: ['migrada'],
            createdAt: now,
            updatedAt: now,
          },
        ]
      : []

  return {
    format: PORTABLE_VAULT_FORMAT,
    version: PORTABLE_VAULT_VERSION,
    id: randomId(),
    createdAt: now,
    updatedAt: now,
    notes,
  }
}

export function createPortableVaultNote(
  title = 'Nova nota',
  now = Date.now(),
): PortableVaultNote {
  return {
    id: randomId(),
    title: title.slice(0, PORTABLE_VAULT_MAX_TITLE_LENGTH),
    content: '',
    tags: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function serializePortableVault(vault: PortableVaultDocument) {
  return JSON.stringify(assertPortableVaultDocument(vault))
}

export function decodePortableVaultPlaintext(
  plaintext: string,
): PortableVaultDecodeResult {
  let parsed: unknown

  try {
    parsed = JSON.parse(plaintext)
  } catch {
    return {
      vault: createPortableVault(plaintext),
      migratedFromLegacyNote: true,
    }
  }

  if (
    isRecord(parsed) &&
    typeof parsed.format === 'string' &&
    parsed.format.startsWith('PORTABLE_VAULT')
  ) {
    return {
      vault: assertPortableVaultDocument(parsed),
      migratedFromLegacyNote: false,
    }
  }

  return {
    vault: createPortableVault(plaintext),
    migratedFromLegacyNote: true,
  }
}

export function updatePortableVaultNote(
  vault: PortableVaultDocument,
  noteId: string,
  patch: Partial<Pick<PortableVaultNote, 'title' | 'content' | 'tags'>>,
  now = Date.now(),
): PortableVaultDocument {
  const noteIndex = vault.notes.findIndex((note) => note.id === noteId)

  if (noteIndex < 0) {
    return vault
  }

  const currentNote = vault.notes[noteIndex]
  const nextNote: PortableVaultNote = {
    ...currentNote,
    ...(patch.title === undefined
      ? {}
      : {
          title: patch.title.slice(0, PORTABLE_VAULT_MAX_TITLE_LENGTH),
        }),
    ...(patch.content === undefined
      ? {}
      : {
          content: patch.content.slice(0, PORTABLE_VAULT_MAX_CONTENT_LENGTH),
        }),
    ...(patch.tags === undefined ? {} : { tags: normalizeTags(patch.tags) }),
    updatedAt: Math.max(now, currentNote.createdAt),
  }
  const notes = vault.notes.slice()
  notes[noteIndex] = nextNote

  return {
    ...vault,
    notes,
    updatedAt: Math.max(now, vault.createdAt),
  }
}

export function addPortableVaultNote(
  vault: PortableVaultDocument,
  note = createPortableVaultNote(),
): PortableVaultDocument {
  if (vault.notes.length >= PORTABLE_VAULT_MAX_NOTES) {
    throw new PortableVaultError(
      'LIMIT_EXCEEDED',
      `O cofre atingiu o limite de ${PORTABLE_VAULT_MAX_NOTES} notas.`,
    )
  }

  return {
    ...vault,
    notes: [note, ...vault.notes],
    updatedAt: Math.max(note.updatedAt, vault.createdAt),
  }
}

export function removePortableVaultNote(
  vault: PortableVaultDocument,
  noteId: string,
  now = Date.now(),
): PortableVaultDocument {
  const notes = vault.notes.filter((note) => note.id !== noteId)

  if (notes.length === vault.notes.length) {
    return vault
  }

  return {
    ...vault,
    notes,
    updatedAt: Math.max(now, vault.createdAt),
  }
}

export function searchPortableVaultNotes(
  notes: readonly PortableVaultNote[],
  query: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase()

  if (!normalizedQuery) {
    return [...notes]
  }

  return notes.filter((note) =>
    [note.title, note.content, ...note.tags].some((value) =>
      value.toLocaleLowerCase().includes(normalizedQuery),
    ),
  )
}
