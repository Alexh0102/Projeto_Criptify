import crypto from 'node:crypto'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const LICENSE_SCOPE = 'criptoveu:lifetime:v1'

function getRequiredEnv(name) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function safeErrorMessage(error) {
  if (error instanceof Error) {
    return error.message
  }

  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }

  return 'Unknown error'
}

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

function normalizeLicenseKey(licenseKey) {
  return String(licenseKey ?? '').trim().toUpperCase()
}

function buildLifetimeLicenseKey(email, licenseSecret) {
  const payload = `${LICENSE_SCOPE}|${normalizeEmail(email)}`
  const signature = crypto.createHmac('sha256', licenseSecret).update(payload).digest('hex').toUpperCase()
  const readableSignature = signature.slice(0, 32).match(/.{1,4}/g).join('-')

  return `CVEU-${readableSignature}`
}

function timingSafeEqualText(firstValue, secondValue) {
  const firstBuffer = Buffer.from(firstValue)
  const secondBuffer = Buffer.from(secondValue)

  if (firstBuffer.length !== secondBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(firstBuffer, secondBuffer)
}

function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(req.body)
  }

  if (typeof req.body === 'string') {
    try {
      return Promise.resolve(JSON.parse(req.body))
    } catch {
      return Promise.resolve({})
    }
  }

  return new Promise((resolve, reject) => {
    const chunks = []

    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })

    req.on('end', () => {
      try {
        const rawBody = Buffer.concat(chunks).toString('utf8')
        resolve(rawBody ? JSON.parse(rawBody) : {})
      } catch (error) {
        reject(error)
      }
    })

    req.on('error', (error) => reject(error))
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let internalLicenseSecret

  try {
    internalLicenseSecret = getRequiredEnv('INTERNAL_LICENSE_SECRET')
  } catch (error) {
    console.error(`[verify-license] Configuration error: ${safeErrorMessage(error)}`)
    return res.status(500).json({ error: 'License verification is not configured' })
  }

  let body

  try {
    body = await readJsonBody(req)
  } catch {
    return res.status(400).json({ valid: false, error: 'JSON inválido.' })
  }

  const rawLicenseKey = String(body?.licenseKey ?? '').trim()
  const normalizedLicenseKey = normalizeLicenseKey(rawLicenseKey)
  const adminMasterKey = process.env.ADMIN_MASTER_KEY

  if (!rawLicenseKey) {
    return res.status(400).json({ valid: false, error: 'Informe a chave de licença.' })
  }

  if (adminMasterKey && rawLicenseKey === adminMasterKey) {
    return res.status(200).json({ valid: true, tier: 'admin' })
  }

  const normalizedEmail = normalizeEmail(body?.email)

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return res.status(400).json({ valid: false, error: 'Informe o e-mail usado na compra.' })
  }

  const expectedLicenseKey = buildLifetimeLicenseKey(normalizedEmail, internalLicenseSecret)

  if (!timingSafeEqualText(normalizedLicenseKey, expectedLicenseKey)) {
    return res.status(401).json({ valid: false, error: 'Licença inválida para este e-mail.' })
  }

  return res.status(200).json({ valid: true, tier: 'premium' })
}
