import crypto from 'node:crypto'

import {
  enforceRateLimit,
  handleCorsRequest,
  readJsonBody,
  RequestSecurityError,
} from './_request-security.js'

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
  return String(licenseKey ?? '').replace(/\s+/g, '').toUpperCase()
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

export default async function handler(req, res) {
  if (handleCorsRequest(req, res)) {
    return
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    enforceRateLimit(req, {
      key: 'verify-license',
      maxRequests: 10,
    })
  } catch (error) {
    if (error instanceof RequestSecurityError && error.code === 'RATE_LIMITED') {
      return res.status(429).json({ valid: false, error: error.message })
    }

    throw error
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
  } catch (error) {
    if (error instanceof RequestSecurityError && error.code === 'PAYLOAD_TOO_LARGE') {
      return res.status(413).json({ valid: false, error: error.message })
    }

    return res.status(400).json({ valid: false, error: 'JSON inválido.' })
  }

  const rawLicenseKey = String(body?.licenseKey ?? '').trim()
  const normalizedLicenseKey = normalizeLicenseKey(rawLicenseKey)
  const adminMasterKey = process.env.ADMIN_MASTER_KEY

  if (!rawLicenseKey) {
    return res.status(400).json({ valid: false, error: 'Informe a chave de licença.' })
  }

  if (adminMasterKey && timingSafeEqualText(normalizedLicenseKey, normalizeLicenseKey(adminMasterKey))) {
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
