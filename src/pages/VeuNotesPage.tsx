import { useTranslation } from 'react-i18next'

import VeuNotesVault from '../components/VeuNotesVault'
import ToolPageLayout from '../components/layout/ToolPageLayout'
import HelpAccordion from '../components/ui/HelpAccordion'
import ToolHeroCompact from '../components/ui/ToolHeroCompact'

export default function VeuNotesPage() {
  const { t } = useTranslation()

  return (
    <ToolPageLayout>
      <div className="space-y-6">
        <ToolHeroCompact
          eyebrow={t('notes.page.eyebrow')}
          title={t('notes.page.title')}
          description={t('notes.page.description')}
          badge={t('notes.page.badge')}
        />

        <VeuNotesVault />

        <HelpAccordion
          items={[
            {
              title: t('notes.page.help.how.title'),
              content: t('notes.page.help.how.content'),
            },
            {
              title: t('notes.page.help.saved.title'),
              content: t('notes.page.help.saved.content'),
            },
            {
              title: t('notes.page.help.backup.title'),
              content: t('notes.page.help.backup.content'),
            },
            {
              title: t('notes.page.help.forgot.title'),
              content: t('notes.page.help.forgot.content'),
            },
          ]}
        />
      </div>
    </ToolPageLayout>
  )
}
