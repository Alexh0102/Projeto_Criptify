export const SHARE_PAYLOAD_FIELD_ALLOWLISTS = {
  encryptedTextV1: ['version', 'ciphertext', 'iv', 'salt'],
  autoDestructV1: [
    'version',
    'ciphertext',
    'iv',
    'salt',
    'createdAt',
    'expiresIn',
    'maxViews',
  ],
} as const

const FORBIDDEN_SECRET_FIELD_NAMES = new Set([
  'key',
  'chave',
  'message',
  'mensagem',
  'pwd',
])

const FORBIDDEN_SECRET_FIELD_FRAGMENTS = [
  'password',
  'senha',
  'passphrase',
  'frasedepasse',
  'plaintext',
  'textopuro',
  'secret',
  'segredo',
  'privatekey',
  'chaveprivada',
  'aeskey',
  'derivedkey',
  'chavederivada',
  'encryptionkey',
  'decryptionkey',
  'rawkey',
  'chavebruta',
  'masterkey',
  'chavemestre',
] as const

export class SharePayloadSecurityError extends Error {
  code: 'SECRET_FIELD' | 'UNEXPECTED_FIELD' | 'INVALID_PAYLOAD'

  constructor(
    code: 'SECRET_FIELD' | 'UNEXPECTED_FIELD' | 'INVALID_PAYLOAD',
    message: string,
  ) {
    super(message)
    this.name = 'SharePayloadSecurityError'
    this.code = code
  }
}

function normalizeFieldName(fieldName: string) {
  return fieldName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase()
}

function isForbiddenSecretField(fieldName: string) {
  const normalized = normalizeFieldName(fieldName)

  return (
    FORBIDDEN_SECRET_FIELD_NAMES.has(normalized) ||
    FORBIDDEN_SECRET_FIELD_FRAGMENTS.some((fragment) =>
      normalized.includes(fragment),
    )
  )
}

export function assertNoSecretFields(value: unknown) {
  const visited = new WeakSet<object>()

  function inspect(current: unknown, path: string) {
    if (current === null || typeof current !== 'object') {
      return
    }

    if (visited.has(current)) {
      return
    }

    visited.add(current)

    for (const [fieldName, nestedValue] of Object.entries(current)) {
      if (isForbiddenSecretField(fieldName)) {
        throw new SharePayloadSecurityError(
          'SECRET_FIELD',
          `O payload compartilhável contém um campo secreto proibido em ${path}.${fieldName}.`,
        )
      }

      inspect(nestedValue, `${path}.${fieldName}`)
    }
  }

  inspect(value, 'payload')
}

export function assertAllowedPayloadFields(
  value: unknown,
  allowedFields: readonly string[],
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new SharePayloadSecurityError(
      'INVALID_PAYLOAD',
      'O payload compartilhável precisa ser um objeto válido.',
    )
  }

  const allowedFieldSet = new Set(allowedFields)
  const unexpectedField = Object.keys(value).find(
    (fieldName) => !allowedFieldSet.has(fieldName),
  )

  if (unexpectedField) {
    throw new SharePayloadSecurityError(
      'UNEXPECTED_FIELD',
      `O payload compartilhável contém o campo não permitido "${unexpectedField}".`,
    )
  }
}

export function createAllowlistedPayload<
  Source extends object,
  Field extends Extract<keyof Source, string>,
>(
  source: Source,
  allowedFields: readonly Field[],
): Pick<Source, Field> {
  const payload = {} as Pick<Source, Field>

  for (const fieldName of allowedFields) {
    payload[fieldName] = source[fieldName]
  }

  assertAllowedPayloadFields(payload, allowedFields)
  assertNoSecretFields(payload)
  return payload
}
