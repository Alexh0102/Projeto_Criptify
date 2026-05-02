import FileCryptoWorkspace from '../components/file-crypto/FileCryptoWorkspace'
import ToolPageLayout from '../components/layout/ToolPageLayout'
import HelpAccordion from '../components/ui/HelpAccordion'
import ToolHeroCompact from '../components/ui/ToolHeroCompact'

export default function FilesPage() {
  return (
    <ToolPageLayout>
      <div className="space-y-5">
        <ToolHeroCompact
          eyebrow="Criptografia de arquivos"
          title="Proteja ou recupere arquivos sem sair do navegador."
          description="Pré-visualize vídeos, fotos, PDFs e documentos locais antes de proteger ou recuperar arquivos com senha, sem upload."
        />

        <FileCryptoWorkspace />

        <HelpAccordion
          items={[
            {
              title: 'Como funciona',
              content:
                'Você escolhe os arquivos, define a senha e o processamento acontece localmente no navegador.',
            },
            {
              title: 'Privacidade',
              content:
                'Seus arquivos não saem do dispositivo. O resultado é gerado localmente para download.',
            },
          ]}
        />
      </div>
    </ToolPageLayout>
  )
}
