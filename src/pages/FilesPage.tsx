import { useTranslation } from 'react-i18next'

import FileCryptoWorkspace from '../components/file-crypto/FileCryptoWorkspace'
import ToolPageLayout from '../components/layout/ToolPageLayout'
import HelpAccordion from '../components/ui/HelpAccordion'
import ToolHeroCompact from '../components/ui/ToolHeroCompact'

export default function FilesPage() {
  const { t } = useTranslation()

  return (
    <ToolPageLayout>
      <div className="space-y-5">
        <ToolHeroCompact
          eyebrow={t('files.page.eyebrow')}
          title={t('files.page.title')}
          description={t('files.page.description')}
        />

        <FileCryptoWorkspace />

        <HelpAccordion
          items={[
            {
              title: t('files.page.help.how.title'),
              content: t('files.page.help.how.content'),
            },
            {
              title: t('files.page.help.privacy.title'),
              content: t('files.page.help.privacy.content'),
            },
          ]}
        />
      </div>
    </ToolPageLayout>
  )
}
