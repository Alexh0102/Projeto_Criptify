import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases'

import { isNativeApp } from '../platform'

export const PLAY_LIFETIME_PRODUCT_ID = 'criptoveu_vitalicio'

const PLAY_PREMIUM_STORAGE_KEY = 'criptoveu-play-premium-v1'

type PlayPremiumEntitlement = {
  productId: typeof PLAY_LIFETIME_PRODUCT_ID
  activatedAt: number
}

export type PlayBillingResult =
  | { status: 'purchased'; purchaseTokenReceived: true }
  | { status: 'restored'; purchaseTokenReceived: true }
  | { status: 'pending' }
  | { status: 'unavailable' }
  | { status: 'failed'; message: string }

function readEntitlement(): PlayPremiumEntitlement | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(PLAY_PREMIUM_STORAGE_KEY)

    if (!rawValue) {
      return null
    }

    const parsed = JSON.parse(rawValue) as Partial<PlayPremiumEntitlement>

    if (parsed.productId !== PLAY_LIFETIME_PRODUCT_ID || typeof parsed.activatedAt !== 'number') {
      return null
    }

    return {
      productId: PLAY_LIFETIME_PRODUCT_ID,
      activatedAt: parsed.activatedAt,
    }
  } catch {
    return null
  }
}

function saveEntitlement() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const entitlement: PlayPremiumEntitlement = {
      productId: PLAY_LIFETIME_PRODUCT_ID,
      activatedAt: Date.now(),
    }
    window.localStorage.setItem(PLAY_PREMIUM_STORAGE_KEY, JSON.stringify(entitlement))
  } catch {
    return
  }
}

function isCompletedPurchase(transaction: {
  productIdentifier: string
  purchaseState?: string
  purchaseToken?: string
}) {
  return (
    transaction.productIdentifier === PLAY_LIFETIME_PRODUCT_ID &&
    transaction.purchaseState === '1' &&
    Boolean(transaction.purchaseToken)
  )
}

export function estaPremium() {
  return Boolean(readEntitlement())
}

export async function comprarVitalicio(): Promise<PlayBillingResult> {
  if (!isNativeApp()) {
    return { status: 'unavailable' }
  }

  try {
    const support = await NativePurchases.isBillingSupported()

    if (!support.isBillingSupported) {
      return { status: 'unavailable' }
    }

    const transaction = await NativePurchases.purchaseProduct({
      productIdentifier: PLAY_LIFETIME_PRODUCT_ID,
      productType: PURCHASE_TYPE.INAPP,
      autoAcknowledgePurchases: true,
    })

    if (transaction.purchaseState === '0') {
      return { status: 'pending' }
    }

    if (!isCompletedPurchase(transaction)) {
      return {
        status: 'failed',
        message: 'A compra nao foi confirmada pela Google Play.',
      }
    }

    saveEntitlement()
    return { status: 'purchased', purchaseTokenReceived: true }
  } catch {
    return {
      status: 'failed',
      message: 'Nao foi possivel concluir a compra pela Google Play.',
    }
  }
}

export async function restaurarCompras(): Promise<PlayBillingResult> {
  if (!isNativeApp()) {
    return { status: 'unavailable' }
  }

  try {
    await NativePurchases.restorePurchases()
    const { purchases } = await NativePurchases.getPurchases({
      productType: PURCHASE_TYPE.INAPP,
      onlyCurrentEntitlements: true,
    })
    const lifetimePurchase = purchases.find((purchase) =>
      isCompletedPurchase(purchase),
    )

    if (lifetimePurchase) {
      saveEntitlement()
      return { status: 'restored', purchaseTokenReceived: true }
    }

    if (purchases.some((purchase) => purchase.productIdentifier === PLAY_LIFETIME_PRODUCT_ID && purchase.purchaseState === '0')) {
      return { status: 'pending' }
    }

    return {
      status: 'failed',
      message: 'Nenhuma compra vitalicia encontrada nesta conta Google.',
    }
  } catch {
    return {
      status: 'failed',
      message: 'Nao foi possivel restaurar as compras agora.',
    }
  }
}
