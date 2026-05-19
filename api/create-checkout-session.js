import crypto from 'node:crypto'

import Stripe from 'stripe'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const CHECKOUT_PRICE_CENTS = 1000

function getRequiredEnv(name) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function getHeader(req, headerName) {
  const value = req.headers[headerName.toLowerCase()]

  if (Array.isArray(value)) {
    return value[0]
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

function validateEmail(email) {
  const normalizedEmail = normalizeEmail(email)

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return {
      valid: false,
      error: 'Informe um e-mail valido para receber sua chave de ativacao.',
    }
  }

  return { valid: true, normalizedEmail }
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

function getRequestOrigin(req) {
  const configuredSiteUrl =
    process.env.CHECKOUT_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PUBLIC_SITE_URL

  if (configuredSiteUrl) {
    return configuredSiteUrl.replace(/\/$/, '')
  }

  const host = getHeader(req, 'x-forwarded-host') || getHeader(req, 'host')
  const protocol = getHeader(req, 'x-forwarded-proto') || 'https'

  if (!host) {
    throw new Error('Unable to resolve checkout origin')
  }

  return `${protocol}://${host}`.replace(/\/$/, '')
}

function buildClientReferenceId(email) {
  return crypto.createHash('sha256').update(email).digest('hex').slice(0, 32)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let stripeSecretKey

  try {
    stripeSecretKey = getRequiredEnv('STRIPE_SECRET_KEY')
  } catch (error) {
    console.error(`[create-checkout-session] Configuration error: ${safeErrorMessage(error)}`)
    return res.status(500).json({ error: 'Checkout is not configured' })
  }

  let body

  try {
    body = await readJsonBody(req)
  } catch {
    return res.status(400).json({ error: 'JSON invalido.' })
  }

  const emailValidation = validateEmail(body?.email)

  if (!emailValidation.valid) {
    return res.status(400).json({ error: emailValidation.error })
  }

  const stripe = new Stripe(stripeSecretKey)

  try {
    const origin = getRequestOrigin(req)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: emailValidation.normalizedEmail,
      client_reference_id: buildClientReferenceId(emailValidation.normalizedEmail),
      invoice_creation: {
        enabled: true,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: CHECKOUT_PRICE_CENTS,
            product_data: {
              name: 'Apoio ao Projeto CriptoVeu',
              description: 'Microdoacao unica para manter o CriptoVeu open-source, independente e sem anuncios.',
            },
          },
        },
      ],
      metadata: {
        product: 'criptoveu-donationware-lifetime',
        license_email: emailValidation.normalizedEmail,
      },
      success_url: `${origin}/?success=true#apoie`,
      cancel_url: `${origin}/#apoie`,
    })

    if (!session.url) {
      console.error('[create-checkout-session] Stripe did not return a checkout URL')
      return res.status(502).json({ error: 'Nao foi possivel criar a sessao de checkout.' })
    }

    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error(`[create-checkout-session] Failed to create Stripe Checkout Session: ${safeErrorMessage(error)}`)
    return res.status(500).json({ error: 'Falha ao criar checkout seguro.' })
  }
}
