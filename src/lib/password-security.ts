export type CredentialMode = 'passphrase' | 'password' | 'key'

export type GeneratedCredential = {
  mode: CredentialMode
  value: string
  entropyBits: number
}

export type PasswordStrengthLevel =
  | 'empty'
  | 'veryWeak'
  | 'weak'
  | 'reasonable'
  | 'strong'
  | 'veryStrong'

export type PasswordWarning =
  | 'tooShort'
  | 'recommendedLength'
  | 'commonPattern'
  | 'projectName'
  | 'year'
  | 'sequence'
  | 'repetition'
  | 'lowVariety'
  | 'misleadingSymbols'

export type PasswordStrengthAnalysis = {
  score: number
  level: PasswordStrengthLevel
  estimatedEntropyBits: number
  warnings: PasswordWarning[]
  isWeak: boolean
}

const PASSPHRASE_WORDS = [
  'abacate',
  'abrigo',
  'acervo',
  'aldeia',
  'amendoa',
  'ancora',
  'areia',
  'aroma',
  'aurora',
  'azulejo',
  'bambu',
  'barco',
  'bosque',
  'brisa',
  'caderno',
  'cafe',
  'canela',
  'canto',
  'carvalho',
  'casulo',
  'cedro',
  'cereja',
  'chave',
  'chuva',
  'cobre',
  'colina',
  'cometa',
  'concha',
  'coral',
  'cristal',
  'dalia',
  'deserto',
  'diamante',
  'duna',
  'eco',
  'estrela',
  'farol',
  'figueira',
  'floresta',
  'folha',
  'fresia',
  'geleira',
  'girassol',
  'granito',
  'horta',
  'ilha',
  'ipe',
  'jade',
  'janela',
  'jardim',
  'lagoa',
  'limao',
  'lirio',
  'lua',
  'madeira',
  'manga',
  'marfim',
  'melodia',
  'menta',
  'montanha',
  'nascente',
  'neblina',
  'ninho',
  'nuvem',
  'oceano',
  'oliva',
  'orquidea',
  'outono',
  'palmeira',
  'papel',
  'passaro',
  'pedra',
  'perola',
  'pinheiro',
  'planeta',
  'ponte',
  'prisma',
  'quartzo',
  'raiz',
  'riacho',
  'rio',
  'rosa',
  'safira',
  'semente',
  'sereno',
  'serra',
  'sino',
  'sol',
  'tangerina',
  'tecido',
  'tempestade',
  'terra',
  'trigo',
  'tulipa',
  'universo',
  'vale',
  'vento',
  'verde',
  'vidro',
  'violeta',
  'vulcao',
  'xilofone',
  'zafira',
  'zimbro',
  'acacia',
  'algodao',
  'ameixa',
  'azeviche',
  'bussola',
  'cacau',
  'campina',
  'castanha',
  'caverna',
  'citrino',
  'damasco',
  'esmeralda',
  'favo',
  'framboesa',
  'hibisco',
  'lavanda',
  'lince',
  'mirante',
  'nectar',
  'pessego',
  'regato',
  'salvia',
  'turmalina',
  'verbena',
] as const

const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz'
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%&*+-=?'
const PASSWORD_ALPHABET = LOWERCASE + UPPERCASE + DIGITS + SYMBOLS
const COMMON_PATTERNS = [
  '123456',
  'password',
  'senha',
  'qwerty',
  'asdf',
  'admin',
  'letmein',
  'welcome',
  'bemvindo',
  'segredo',
  'secret',
]
const SEQUENCES = [
  '0123456789',
  '9876543210',
  'abcdefghijklmnopqrstuvwxyz',
  'zyxwvutsrqponmlkjihgfedcba',
  'qwertyuiop',
  'poiuytrewq',
  'asdfghjkl',
  'lkjhgfdsa',
]

function secureRandomInt(maxExclusive: number) {
  if (
    !Number.isSafeInteger(maxExclusive) ||
    maxExclusive < 1 ||
    maxExclusive > 256
  ) {
    throw new Error('Intervalo inválido para geração aleatória segura.')
  }

  const rejectionLimit = 256 - (256 % maxExclusive)
  const randomByte = new Uint8Array(1)

  do {
    crypto.getRandomValues(randomByte)
  } while (randomByte[0] >= rejectionLimit)

  return randomByte[0] % maxExclusive
}

function chooseCharacter(alphabet: string) {
  return alphabet[secureRandomInt(alphabet.length)]
}

function secureShuffle<T>(values: T[]) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const randomIndex = secureRandomInt(index + 1)
    ;[values[index], values[randomIndex]] = [
      values[randomIndex],
      values[index],
    ]
  }

  return values
}

function generatePassphrase(): GeneratedCredential {
  const availableWords = [...PASSPHRASE_WORDS]
  const selectedWords: string[] = []

  for (let index = 0; index < 8; index += 1) {
    const wordIndex = secureRandomInt(availableWords.length)
    selectedWords.push(availableWords[wordIndex])
    availableWords.splice(wordIndex, 1)
  }

  const suffix = secureRandomInt(90) + 10

  return {
    mode: 'passphrase',
    value: `${selectedWords.join('-')}-${suffix}`,
    entropyBits: 62,
  }
}

function generateRandomPassword(): GeneratedCredential {
  const characters = [
    chooseCharacter(LOWERCASE),
    chooseCharacter(UPPERCASE),
    chooseCharacter(DIGITS),
    chooseCharacter(SYMBOLS),
  ]

  while (characters.length < 24) {
    characters.push(chooseCharacter(PASSWORD_ALPHABET))
  }

  return {
    mode: 'password',
    value: secureShuffle(characters).join(''),
    entropyBits: 128,
  }
}

function generateRandomKey(): GeneratedCredential {
  const bytes = crypto.getRandomValues(new Uint8Array(32))

  return {
    mode: 'key',
    value: Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, '0'),
    )
      .join('')
      .toUpperCase(),
    entropyBits: 256,
  }
}

export function generateSecureCredential(
  mode: CredentialMode,
): GeneratedCredential {
  if (mode === 'passphrase') {
    return generatePassphrase()
  }

  if (mode === 'password') {
    return generateRandomPassword()
  }

  return generateRandomKey()
}

function normalizeForAnalysis(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function containsSequence(value: string) {
  return SEQUENCES.some((sequence) => {
    for (let index = 0; index <= sequence.length - 4; index += 1) {
      if (value.includes(sequence.slice(index, index + 4))) {
        return true
      }
    }

    return false
  })
}

function estimateCharacterPool(value: string) {
  let poolSize = 0

  if (/[a-z]/.test(value)) {
    poolSize += 26
  }

  if (/[A-Z]/.test(value)) {
    poolSize += 26
  }

  if (/\d/.test(value)) {
    poolSize += 10
  }

  if (/[^A-Za-z0-9]/.test(value)) {
    poolSize += 32
  }

  return Math.max(poolSize, 1)
}

function getStrengthLevel(score: number): PasswordStrengthLevel {
  if (score <= 0) {
    return 'empty'
  }

  if (score === 1) {
    return 'veryWeak'
  }

  if (score === 2) {
    return 'weak'
  }

  if (score === 3) {
    return 'reasonable'
  }

  if (score === 4) {
    return 'strong'
  }

  return 'veryStrong'
}

export function analyzePasswordStrength(
  value: string,
  knownEntropyBits?: number | null,
): PasswordStrengthAnalysis {
  if (!value) {
    return {
      score: 0,
      level: 'empty',
      estimatedEntropyBits: 0,
      warnings: [],
      isWeak: false,
    }
  }

  const normalized = normalizeForAnalysis(value)
  const warnings: PasswordWarning[] = []
  const uniqueCharacterCount = new Set(value).size
  const uniqueRatio = uniqueCharacterCount / value.length
  const looksLikeHexKey = /^[a-f0-9]{64}$/i.test(value)
  const hasLowVariety = looksLikeHexKey
    ? uniqueCharacterCount < 10
    : uniqueRatio < 0.5
  const hasSymbol = /[^A-Za-z0-9]/.test(value)
  const hasCommonPattern = COMMON_PATTERNS.some((pattern) =>
    normalized.includes(pattern),
  )
  const hasProjectName =
    normalized.includes('criptoveu') ||
    normalized.includes('cripto') ||
    normalized.includes('veu')
  const hasYear = /(?:19|20)\d{2}/.test(normalized)
  const hasSequence = containsSequence(normalized)
  const hasRepetition =
    /(.)\1{2,}/u.test(value) || /(.{1,4})\1{2,}/u.test(value)

  if (value.length < 12) {
    warnings.push('tooShort')
  } else if (value.length < 16) {
    warnings.push('recommendedLength')
  }

  if (hasCommonPattern) {
    warnings.push('commonPattern')
  }

  if (hasProjectName) {
    warnings.push('projectName')
  }

  if (hasYear) {
    warnings.push('year')
  }

  if (hasSequence) {
    warnings.push('sequence')
  }

  if (hasRepetition) {
    warnings.push('repetition')
  }

  if (hasLowVariety) {
    warnings.push('lowVariety')
  }

  if (value.length < 12 && hasSymbol) {
    warnings.push('misleadingSymbols')
  }

  let estimatedEntropyBits =
    knownEntropyBits ??
    Math.floor(value.length * Math.log2(estimateCharacterPool(value)))
  let score =
    value.length < 8
      ? 1
      : value.length < 12
        ? 2
        : value.length < 16
          ? 3
          : value.length < 24
            ? 4
            : 5

  if (knownEntropyBits !== undefined && knownEntropyBits !== null) {
    warnings.length = 0
    score =
      knownEntropyBits >= 128
        ? 5
        : knownEntropyBits >= 60
          ? 4
          : knownEntropyBits >= 45
            ? 3
            : knownEntropyBits >= 30
              ? 2
              : 1
  } else {
    if (hasCommonPattern || hasProjectName) {
      score = Math.min(score, 1)
      estimatedEntropyBits = Math.min(estimatedEntropyBits, 20)
    }

    if (hasRepetition && hasLowVariety) {
      score = Math.min(score, 1)
      estimatedEntropyBits = Math.min(estimatedEntropyBits, 16)
    }

    const penaltyCount = [
      hasYear,
      hasSequence,
      hasRepetition,
      hasLowVariety,
    ].filter(Boolean).length
    score = Math.max(1, score - penaltyCount)
    estimatedEntropyBits = Math.max(
      1,
      Math.floor(estimatedEntropyBits * Math.max(0.2, 1 - penaltyCount * 0.2)),
    )
  }

  return {
    score,
    level: getStrengthLevel(score),
    estimatedEntropyBits,
    warnings,
    isWeak: score <= 2,
  }
}
