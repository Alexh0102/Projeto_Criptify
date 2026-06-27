import InfoPage from '../components/content/InfoPage'

export default function TechnicalDetailsPage() {
  return (
    <InfoPage
      eyebrow="Detalhes técnicos"
      title="Visão geral das rotas, do fluxo e das decisões de interface"
      description="A estrutura do CriptoVéu foi desenhada para separar tarefas por rota, reduzir ruído e manter o uso claro no desktop e no mobile."
      sections={[
        {
          title: 'Rotas e organização da experiência',
          items: [
            {
              title: 'Uma rota por ferramenta',
              description:
                'Cada ferramenta abre em uma tela própria para evitar mistura de fluxo e reduzir distrações desnecessárias.',
            },
            {
              title: 'Home como ponto de entrada',
              description:
                'A home funciona como hub de navegação, com contexto, casos de uso e acesso rápido às ferramentas.',
            },
          ],
        },
        {
          title: 'Decisões da interface',
          items: [
            {
              title: 'Ação principal mais visível',
              description:
                'As telas priorizam um CTA principal, campos essenciais e um resultado claro logo após o processamento.',
            },
            {
              title: 'Componentes reutilizáveis',
              description:
                'Layouts, accordions, painéis de resultado e blocos de campo ajudam a manter consistência entre as páginas.',
            },
          ],
        },
        {
          title: 'Formatos e compatibilidade',
          items: [
            {
              title: 'Envelopes V2 separados',
              description:
                'CVM2 identifica MSG2, CVQ2 identifica QR2 e CVL2 identifica LINK2. O VéuNotes grava um objeto NOTE2 versionado.',
            },
            {
              title: 'Argon2id fora da thread da interface',
              description:
                'A derivação usa hash-wasm em WebAssembly dentro de Web Worker. O navegador principal recebe apenas os 32 bytes derivados para importar uma chave AES-GCM não extraível.',
            },
            {
              title: 'Leitura V1 preservada',
              description:
                'Os parsers detectam V2 antes de recorrer aos formatos PBKDF2 existentes. Assim, links, QRs, mensagens e cofres antigos continuam utilizáveis.',
            },
          ],
        },
        {
          title: 'Autenticação e testes',
          items: [
            {
              title: 'AAD canônico',
              description:
                'Tipo, versão, KDF e parâmetros Argon2id são serializados em ordem fixa e autenticados. LINK2 também autentica criação, validade e limite.',
            },
            {
              title: 'Vetores públicos',
              description:
                'Vetores reproduzíveis registram salt, IV, AAD e ciphertext para MSG2, QR2, LINK2 e NOTE2. Valores fixos existem somente em teste.',
            },
            {
              title: 'Adulteração rejeitada',
              description:
                'A suíte cobre mudança de ciphertext, IV, salt, parâmetros, tipo, versão, expiração, limite, truncamento e senha incorreta.',
            },
          ],
        },
      ]}
    />
  )
}
