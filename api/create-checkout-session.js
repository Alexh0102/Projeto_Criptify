import crypto from 'node:crypto'

import Stripe from 'stripe'

import {
  enforceRateLimit,
  readJsonBody,
  RequestSecurityError,
  getConfiguredSiteOrigin,
} from './_request-security.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const CHECKOUT_PRICE_CENTS = 1000

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

function validateEmail(email) {
  const normalizedEmail = normalizeEmail(email)

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return {
      valid: false,
      error: 'Informe um e-mail válido para receber sua chave de ativação.',
    }
  }

  return { valid: true, normalizedEmail }
}

function buildClientReferenceId(email) {
  return crypto.createHash('sha256').update(email).digest('hex').slice(0, 32)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    enforceRateLimit(req, {
      key: 'create-checkout-session',
      maxRequests: 5,
    })
  } catch (error) {
    if (error instanceof RequestSecurityError && error.code === 'RATE_LIMITED') {
      return res.status(429).json({ error: error.message })
    }

    throw error
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
  } catch (error) {
    if (error instanceof RequestSecurityError && error.code === 'PAYLOAD_TOO_LARGE') {
      return res.status(413).json({ error: error.message })
    }

    return res.status(400).json({ error: 'JSON inválido.' })
  }

  const emailValidation = validateEmail(body?.email)

  if (!emailValidation.valid) {
    return res.status(400).json({ error: emailValidation.error })
  }

  const stripe = new Stripe(stripeSecretKey)

  try {
    const origin = getConfiguredSiteOrigin()
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
              name: 'Apoio ao Projeto CriptoVéu',
              description: 'Microdoação única para manter o CriptoVéu open-source, independente e sem anúncios.',
            },
          },
        },
      ],
      metadata: {
        product: 'criptoveu-donationware-lifetime',
        license_email: emailValidation.normalizedEmail,
      },
      success_url: `${origin}/apoiar?success=true`,
      cancel_url: `${origin}/apoiar`,
    })

    if (!session.url) {
      console.error('[create-checkout-session] Stripe did not return a checkout URL')
      return res.status(502).json({ error: 'Não foi possível criar a sessão de checkout.' })
    }

    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error(`[create-checkout-session] Failed to create Stripe Checkout Session: ${safeErrorMessage(error)}`)
    return res.status(500).json({ error: 'Falha ao criar checkout seguro.' })
  }
}
