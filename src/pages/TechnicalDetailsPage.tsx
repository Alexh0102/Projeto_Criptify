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
              title: 'Proteção dupla CRIPTOVEU5',
              description:
                'V5 reutiliza os registros autenticados do V4, mas deriva o material Argon2id de uma estrutura com domínio, tamanho da senha, senha UTF-8 e SHA-256 do arquivo-chave.',
            },
            {
              title: 'Pacotes de arquivo CRIPTOVEU4',
              description:
                'O cabeçalho registra Argon2id, tamanho e quantidade de blocos. Registros tipados separam dados do manifesto criptográfico final.',
            },
            {
              title: 'Envelopes V2 separados',
              description:
                'CVM2 identifica MSG2, CVQ2 identifica QR2 e CVL2 identifica LINK2. O VéuNotes grava um objeto NOTE2 versionado.',
            },
            {
              title: 'Documento portátil PORTABLE_VAULT1',
              description:
                'O plaintext autenticado do NOTE2 é um documento estritamente validado com várias notas e etiquetas. Backups usam a extensão .criptoveu-note sem expor seus metadados.',
            },
            {
              title: 'Argon2id fora da thread da interface',
              description:
                'A derivação usa hash-wasm em WebAssembly dentro de Web Worker. O navegador principal recebe apenas os 32 bytes derivados para importar uma chave AES-GCM não extraível.',
            },
            {
              title: 'Leitura V1 preservada',
              description:
                'Os parsers preservam arquivos CRIPTOVEU3 e formatos PBKDF2 anteriores. Cofres de nota única são migrados para PORTABLE_VAULT1 somente após autenticação bem-sucedida.',
            },
          ],
        },
        {
          title: 'Autenticação e testes',
          items: [
            {
              title: 'AAD canônico',
              description:
                'Tipo, versão, KDF e parâmetros Argon2id são serializados em ordem fixa. O V4 autentica cabeçalho, tipo, índice e tamanho de cada registro.',
            },
            {
              title: 'Manifesto e verificação pós-recuperação',
              description:
                'SHA-256 completo e por bloco é calculado em Worker. O manifesto cifrado preserva metadados e hashes, que são recalculados após a abertura.',
            },
            {
              title: 'Inspetor e relatório local',
              description:
                'O inspetor sem senha valida somente a estrutura. Depois do processamento, um relatório JSON registra algoritmos, parâmetros e resultado da integridade sem enviar o arquivo.',
            },
            {
              title: 'Vetores públicos',
              description:
                'Vetores reproduzíveis registram salt, IV, AAD e ciphertext para MSG2, QR2, LINK2, NOTE2 e CRIPTOVEU4. Valores fixos existem somente em teste.',
            },
            {
              title: 'Adulteração rejeitada',
              description:
                'A suíte cobre ciphertext, IV, salt, parâmetros, tipo, ordem, truncamento, manifesto, hashes e senha incorreta.',
            },
          ],
        },
        {
          title: 'Segurança prática de credenciais',
          items: [
            {
              title: 'Amostragem sem viés de módulo',
              description:
                'Palavras e caracteres são escolhidos com crypto.getRandomValues e rejeição dos bytes fora do maior múltiplo válido para cada intervalo.',
            },
            {
              title: 'Três modos com objetivos distintos',
              description:
                'A frase prioriza memorização, a senha de 24 caracteres equilibra uso e aleatoriedade, e a chave hexadecimal representa 32 bytes aleatórios.',
            },
            {
              title: 'Heurística para entrada humana',
              description:
                'O analisador penaliza termos comuns, nome do projeto, anos, sequências, repetições, pouca variedade e senhas curtas com símbolos.',
            },
            {
              title: 'Testes de propriedades',
              description:
                'A suíte valida formato, tamanho, classes, unicidade amostral, fonte Web Crypto e ausência de Math.random sem fixar valores secretos.',
            },
            {
              title: 'Arquivo-chave sem fingerprint público',
              description:
                'O pacote registra apenas a exigência do segundo fator. Nenhum hash do arquivo-chave é serializado, pois isso permitiria usá-lo no lugar do próprio arquivo.',
            },
          ],
        },
      ]}
    />
  )
}
