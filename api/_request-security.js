const DEFAULT_MAX_BODY_BYTES = 16 * 1024
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 1000
const DEFAULT_CORS_ORIGINS = [
  'https://criptoveu.com',
  'https://www.criptoveu.com',
  'https://localhost',
  'https://127.0.0.1',
  'http://localhost',
  'http://127.0.0.1',
  'capacitor://localhost',
  'ionic://localhost',
]
const rateLimitBuckets = new Map()

function getHeader(req, headerName) {
  const value = req.headers[headerName.toLowerCase()]

  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function getAllowedCorsOrigins() {
  const configuredOrigins = String(process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  return new Set([...DEFAULT_CORS_ORIGINS, ...configuredOrigins])
}

export function handleCorsRequest(req, res) {
  const requestOrigin = getHeader(req, 'origin')
  const allowedOrigin = requestOrigin && getAllowedCorsOrigins().has(requestOrigin)
    ? requestOrigin
    : null

  res.setHeader('Vary', 'Origin')

  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  }

  if (req.method !== 'OPTIONS') {
    return false
  }

  if (!allowedOrigin) {
    res.status(403).json({ error: 'Origin not allowed' })
    return true
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Max-Age', '600')
  res.status(204).end()
  return true
}

function getClientIdentifier(req) {
  const forwardedFor = getHeader(req, 'x-forwarded-for')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  return getHeader(req, 'x-real-ip') || getHeader(req, 'host') || 'unknown-client'
}

function cleanupRateLimitBuckets(now) {
  for (const [bucketKey, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(bucketKey)
    }
  }
}

export class RequestSecurityError extends Error {
  code

  constructor(code, message) {
    super(message)
    this.name = 'RequestSecurityError'
    this.code = code
  }
}

export function enforceRateLimit(
  req,
  { key, maxRequests, windowMs = DEFAULT_RATE_LIMIT_WINDOW_MS },
) {
  const now = Date.now()
  cleanupRateLimitBuckets(now)
  const bucketKey = `${key}:${getClientIdentifier(req)}`
  const current = rateLimitBuckets.get(bucketKey)

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(bucketKey, {
      count: 1,
      resetAt: now + windowMs,
    })
    return
  }

  if (current.count >= maxRequests) {
    throw new RequestSecurityError(
      'RATE_LIMITED',
      'Muitas tentativas. Aguarde antes de tentar novamente.',
    )
  }

  current.count += 1
}

function assertBodyLength(contentLength, maxBodyBytes) {
  if (!contentLength) {
    return
  }

  const parsedLength = Number.parseInt(contentLength, 10)

  if (Number.isFinite(parsedLength) && parsedLength > maxBodyBytes) {
    throw new RequestSecurityError(
      'PAYLOAD_TOO_LARGE',
      'O corpo da requisição excede o limite permitido.',
    )
  }
}

export async function readJsonBody(
  req,
  { maxBodyBytes = DEFAULT_MAX_BODY_BYTES } = {},
) {
  assertBodyLength(getHeader(req, 'content-length'), maxBodyBytes)

  if (req.body && typeof req.body === 'object') {
    if (Buffer.byteLength(JSON.stringify(req.body), 'utf8') > maxBodyBytes) {
      throw new RequestSecurityError(
        'PAYLOAD_TOO_LARGE',
        'O corpo da requisição excede o limite permitido.',
      )
    }

    return req.body
  }

  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body, 'utf8') > maxBodyBytes) {
      throw new RequestSecurityError(
        'PAYLOAD_TOO_LARGE',
        'O corpo da requisição excede o limite permitido.',
      )
    }

    return JSON.parse(req.body)
  }

  return new Promise((resolve, reject) => {
    const chunks = []
    let totalBytes = 0
    let settled = false

    req.on('data', (chunk) => {
      if (settled) {
        return
      }

      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      totalBytes += buffer.length

      if (totalBytes > maxBodyBytes) {
        settled = true
        reject(
          new RequestSecurityError(
            'PAYLOAD_TOO_LARGE',
            'O corpo da requisição excede o limite permitido.',
          ),
        )
        req.destroy()
        return
      }

      chunks.push(buffer)
    })

    req.on('end', () => {
      if (settled) {
        return
      }

      settled = true
      const rawBody = Buffer.concat(chunks).toString('utf8')
      resolve(rawBody ? JSON.parse(rawBody) : {})
    })

    req.on('error', (error) => {
      if (!settled) {
        settled = true
        reject(error)
      }
    })
  })
}

export function getConfiguredSiteOrigin() {
  const configuredSiteUrl =
    process.env.CHECKOUT_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PUBLIC_SITE_URL

  if (!configuredSiteUrl) {
    throw new Error('Missing required environment variable: CHECKOUT_SITE_URL')
  }

  const parsedUrl = new URL(configuredSiteUrl)
  const isLocalHttp =
    parsedUrl.protocol === 'http:' &&
    (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')

  if (parsedUrl.protocol !== 'https:' && !isLocalHttp) {
    throw new Error('CHECKOUT_SITE_URL must use HTTPS')
  }

  return parsedUrl.origin
}
