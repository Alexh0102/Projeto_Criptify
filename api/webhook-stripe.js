import crypto from 'node:crypto'

import { Resend } from 'resend'
import Stripe from 'stripe'

export const config = {
  api: {
    bodyParser: false,
  },
}

const EMAIL_FROM = 'CriptoVéu <onboarding@resend.dev>'
const EMAIL_SUBJECT = 'Sua Chave de Ativação Vitalícia do CriptoVéu Chegou!'
const LICENSE_SCOPE = 'criptoveu:lifetime:v1'
const MAX_WEBHOOK_BYTES = 2 * 1024 * 1024
const PROCESSED_EVENT_TTL_MS = 10 * 60 * 1000
const processedEvents = new Map()

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

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let totalBytes = 0

    req.on('data', (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      totalBytes += buffer.length

      if (totalBytes > MAX_WEBHOOK_BYTES) {
        const error = new Error('Webhook payload exceeds the configured size limit')
        error.code = 'PAYLOAD_TOO_LARGE'
        reject(error)
        req.destroy()
        return
      }

      chunks.push(buffer)
    })

    req.on('end', () => {
      resolve(Buffer.concat(chunks))
    })

    req.on('error', (error) => {
      reject(error)
    })
  })
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function generateLifetimeLicenseKey(email, licenseSecret) {
  const normalizedEmail = normalizeEmail(email)
  const payload = `${LICENSE_SCOPE}|${normalizedEmail}`
  const signature = crypto.createHmac('sha256', licenseSecret).update(payload).digest('hex').toUpperCase()
  const readableSignature = signature.slice(0, 32).match(/.{1,4}/g).join('-')

  return `CVEU-${readableSignature}`
}

async function extractCustomerEmail(session, stripe) {
  if (session.customer_details?.email) {
    return session.customer_details.email
  }

  if (session.customer_email) {
    return session.customer_email
  }

  if (typeof session.customer === 'string') {
    const customer = await stripe.customers.retrieve(session.customer)

    if (!customer.deleted && customer.email) {
      return customer.email
    }
  }

  return null
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildLicenseEmailHtml({ email, licenseKey }) {
  const safeEmail = escapeHtml(email)
  const safeLicenseKey = escapeHtml(licenseKey)

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${EMAIL_SUBJECT}</title>
  </head>
  <body style="margin:0;background:#07110f;font-family:Inter,Segoe UI,Arial,sans-serif;color:#e8fff8;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#07110f 0%,#10251f 48%,#07131d 100%);padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;border:1px solid rgba(94,234,212,.24);border-radius:28px;background:rgba(9,19,23,.92);box-shadow:0 24px 80px rgba(0,0,0,.35);overflow:hidden;">
            <tr>
              <td style="padding:34px 26px 18px;text-align:center;">
                <p style="margin:0 0 10px;font-size:12px;letter-spacing:.32em;text-transform:uppercase;color:#7dd3fc;">Apoio ao CriptoVéu</p>
                <h1 style="margin:0;font-size:30px;line-height:1.15;color:#ffffff;">Sua chave vitalícia chegou.</h1>
                <p style="margin:16px auto 0;max-width:480px;font-size:15px;line-height:1.7;color:#b9c8c6;">
                  Obrigado por apoiar o CriptoVéu. Use a chave abaixo para liberar o uso ilimitado no site.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 26px;">
                <div style="border-radius:22px;border:1px solid rgba(34,211,238,.34);background:linear-gradient(135deg,rgba(34,211,238,.14),rgba(14,227,141,.12));padding:22px;text-align:center;">
                  <p style="margin:0 0 10px;font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:#a7f3d0;">Chave de Ativação Vitalícia</p>
                  <code style="display:block;word-break:break-word;font-family:SFMono-Regular,Consolas,Liberation Mono,monospace;font-size:22px;font-weight:800;letter-spacing:.08em;color:#ffffff;">${safeLicenseKey}</code>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 26px 34px;">
                <div style="border-radius:20px;background:rgba(255,255,255,.05);padding:18px 20px;">
                  <h2 style="margin:0 0 12px;font-size:16px;color:#ffffff;">Como ativar</h2>
                  <ol style="margin:0;padding-left:20px;color:#c8d4d2;font-size:14px;line-height:1.8;">
                    <li>Acesse o site do CriptoVéu.</li>
                    <li>Abra a área de ativação de chave.</li>
                    <li>Cole a chave exatamente como aparece acima e confirme.</li>
                  </ol>
                </div>
                <p style="margin:18px 0 0;text-align:center;font-size:12px;line-height:1.6;color:#7f918e;">
                  Esta chave foi emitida para ${safeEmail}. Guarde este e-mail em um local seguro.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function buildLicenseEmailText({ email, licenseKey }) {
  return [
    'Sua Chave de Ativação Vitalícia do CriptoVéu Chegou!',
    '',
    `Chave de Ativação: ${licenseKey}`,
    '',
    'Como ativar:',
    '1. Acesse o site do CriptoVéu.',
    '2. Abra a área de ativação de chave.',
    '3. Cole a chave exatamente como aparece acima e confirme.',
    '',
    `Esta chave foi emitida para ${email}. Guarde este e-mail em um local seguro.`,
  ].join('\n')
}

function cleanupProcessedEvents(now = Date.now()) {
  for (const [eventId, expiresAt] of processedEvents.entries()) {
    if (expiresAt <= now) {
      processedEvents.delete(eventId)
    }
  }
}

function wasRecentlyProcessed(eventId) {
  cleanupProcessedEvents()
  return processedEvents.has(eventId)
}

function rememberProcessedEvent(eventId) {
  cleanupProcessedEvents()
  processedEvents.set(eventId, Date.now() + PROCESSED_EVENT_TTL_MS)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let stripeSecretKey
  let stripeWebhookSecret
  let resendApiKey
  let internalLicenseSecret

  try {
    stripeSecretKey = getRequiredEnv('STRIPE_SECRET_KEY')
    stripeWebhookSecret = getRequiredEnv('STRIPE_WEBHOOK_SECRET')
    resendApiKey = getRequiredEnv('RESEND_API_KEY')
    internalLicenseSecret = getRequiredEnv('INTERNAL_LICENSE_SECRET')
  } catch (error) {
    console.error(`[stripe-webhook] Configuration error: ${safeErrorMessage(error)}`)
    return res.status(500).json({ error: 'Webhook is not configured' })
  }

  const signatureHeader = getHeader(req, 'stripe-signature')

  if (!signatureHeader) {
    console.warn('[stripe-webhook] Missing stripe-signature header')
    return res.status(400).send('Bad Request')
  }

  let rawBody

  try {
    rawBody = await readRawBody(req)
  } catch (error) {
    if (error?.code === 'PAYLOAD_TOO_LARGE') {
      console.warn('[stripe-webhook] Payload rejected because it is too large')
      return res.status(413).send('Payload Too Large')
    }

    console.error(`[stripe-webhook] Failed to read raw body: ${safeErrorMessage(error)}`)
    return res.status(400).send('Bad Request')
  }

  const stripe = new Stripe(stripeSecretKey)
  const resend = new Resend(resendApiKey)
  let event

  try {
    event = stripe.webhooks.constructEvent(rawBody, signatureHeader, stripeWebhookSecret)
  } catch (error) {
    console.warn(`[stripe-webhook] Invalid Stripe signature or expired timestamp: ${safeErrorMessage(error)}`)
    return res.status(400).send('Bad Request')
  }

  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true, ignored: true })
  }

  if (wasRecentlyProcessed(event.id)) {
    console.info(`[stripe-webhook] Duplicate event ignored: ${event.id}`)
    return res.status(200).json({ received: true, duplicate: true })
  }

  const session = event.data.object

  try {
    if (session.payment_status && session.payment_status !== 'paid') {
      console.warn(
        `[stripe-webhook] Checkout session completed without paid status: ${session.id} (${session.payment_status})`,
      )
      return res.status(200).json({ received: true, skipped: true })
    }

    const customerEmail = await extractCustomerEmail(session, stripe)

    if (!customerEmail) {
      console.error(`[stripe-webhook] Checkout session completed without a customer email: ${session.id}`)
      return res.status(422).json({ error: 'Customer email not found' })
    }

    const normalizedEmail = normalizeEmail(customerEmail)
    const licenseKey = generateLifetimeLicenseKey(normalizedEmail, internalLicenseSecret)
    const emailResponse = await resend.emails.send({
      from: EMAIL_FROM,
      to: [normalizedEmail],
      subject: EMAIL_SUBJECT,
      html: buildLicenseEmailHtml({ email: normalizedEmail, licenseKey }),
      text: buildLicenseEmailText({ email: normalizedEmail, licenseKey }),
    })

    if (emailResponse.error) {
      console.error(`[stripe-webhook] Resend delivery failed: ${safeErrorMessage(emailResponse.error)}`)
      return res.status(502).json({ error: 'Email delivery failed' })
    }

    rememberProcessedEvent(event.id)
    console.info(`[stripe-webhook] Lifetime license sent for checkout session: ${session.id}`)
    return res.status(200).json({ received: true })
  } catch (error) {
    console.error(`[stripe-webhook] Failed to process checkout.session.completed: ${safeErrorMessage(error)}`)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }
}
