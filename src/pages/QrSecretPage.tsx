import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import QRCodeGenerator from '../components/QRCodeGenerator'
import ToolPageLayout from '../components/layout/ToolPageLayout'
import HelpAccordion from '../components/ui/HelpAccordion'
import ToolHeroCompact from '../components/ui/ToolHeroCompact'
import { QR_SECRET_HASH_PREFIX, readSecretPayloadFromQrHash } from '../lib/qr-secret'

export default function QrSecretPage() {
  const { t } = useTranslation()
  const [incomingHashPayload, setIncomingHashPayload] = useState<string | null>(null)
  const [incomingHashError, setIncomingHashError] = useState<string | null>(null)

  useEffect(() => {
    function syncQrHash() {
      try {
        setIncomingHashPayload(readSecretPayloadFromQrHash(window.location.hash))
        setIncomingHashError(null)
      } catch (error) {
        setIncomingHashPayload(null)
        setIncomingHashError(
          error instanceof Error
            ? error.message
            : t('qr.page.invalidHashFallback'),
        )
      }
    }

    syncQrHash()
    window.addEventListener('hashchange', syncQrHash)
    return () => window.removeEventListener('hashchange', syncQrHash)
  }, [t])

  function handleClearIncomingHash() {
    if (window.location.hash.startsWith(QR_SECRET_HASH_PREFIX)) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }

    setIncomingHashPayload(null)
    setIncomingHashError(null)
  }

  return (
    <ToolPageLayout>
      <div className="space-y-6">
        <ToolHeroCompact
          eyebrow={t('qr.page.eyebrow')}
          title={t('qr.page.title')}
          description={t('qr.page.description')}
        />

        <QRCodeGenerator
          compact
          incomingHashPayload={incomingHashPayload}
          incomingHashError={incomingHashError}
          onClearIncomingHash={handleClearIncomingHash}
        />

        <HelpAccordion
          items={[
            {
              title: t('qr.page.help.how.title'),
              content: t('qr.page.help.how.content'),
            },
            {
              title: t('qr.page.help.compatibility.title'),
              content: t('qr.page.help.compatibility.content'),
            },
            {
              title: t('qr.page.help.privacy.title'),
              content: t('qr.page.help.privacy.content'),
            },
          ]}
        />
      </div>
    </ToolPageLayout>
  )
}
