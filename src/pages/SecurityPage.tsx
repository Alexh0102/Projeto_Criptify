import InfoPage from '../components/content/InfoPage'

export default function SecurityPage() {
  return (
    <InfoPage
      eyebrow="Segurança"
      title="Boas práticas para usar o CriptoVéu com mais segurança"
      description="As ferramentas ajudam a reduzir exposição, mas o resultado depende também da forma como você define a senha, compartilha o conteúdo e organiza o uso."
      sections={[
        {
          title: 'Boas práticas essenciais',
          items: [
            {
              title: 'Use uma senha forte e específica',
              description:
                'Prefira senhas longas, únicas e difíceis de adivinhar para cada conteúdo protegido.',
            },
            {
              title: 'Separe o canal da senha',
              description:
                'Quando possível, envie a senha por um canal diferente daquele usado para compartilhar o arquivo, o link ou a imagem.',
            },
            {
              title: 'Senha e chave não acompanham links ou QRs',
              description:
                'Links e QRs do CriptoVéu carregam apenas dados criptografados e parâmetros públicos. A senha ou chave deve ser entregue separadamente.',
            },
          ],
        },
        {
          title: 'Cuidados de uso',
          items: [
            {
              title: 'Revise antes de compartilhar',
              description:
                'Confirme o arquivo, o destino e o contexto antes de enviar qualquer conteúdo sensível.',
            },
            {
              title: 'Use dispositivos confiáveis',
              description:
                'Dê preferência a navegadores atualizados e a dispositivos sob seu controle direto.',
            },
          ],
        },
        {
          title: 'Senhas, frases e chaves',
          items: [
            {
              title: 'Geração segura e totalmente local',
              description:
                'O gerador usa crypto.getRandomValues para criar frase-senha, senha aleatória ou uma chave de 32 bytes. Nada é enviado ou armazenado pelo CriptoVéu.',
            },
            {
              title: 'Chave aleatória de 256 bits',
              description:
                'O modo máximo gera 32 bytes aleatórios e os mostra em hexadecimal. Em links e QRs, essa chave continua fora do payload e deve ser enviada por outro canal.',
            },
            {
              title: 'Medidor sem falsa precisão',
              description:
                'Valores digitados recebem uma avaliação heurística de comprimento, variedade e padrões previsíveis. A classificação ajuda, mas não prova entropia.',
            },
          ],
        },
        {
          title: 'Proteção dupla de arquivos',
          items: [
            {
              title: 'Senha e arquivo-chave são obrigatórios',
              description:
                'Pacotes CRIPTOVEU5 combinam a senha e o SHA-256 dos bytes do arquivo-chave antes do Argon2id. Sem qualquer um dos fatores, o AES-GCM não autentica.',
            },
            {
              title: 'O arquivo-chave fica fora do pacote',
              description:
                'Nome, conteúdo, hash e material combinado não são gravados no .criptoveu nem no relatório. A assinatura revela apenas que o segundo fator é exigido.',
            },
            {
              title: 'Backup separado é indispensável',
              description:
                'O mesmo conteúdo pode ser renomeado, mas alterar um único byte impede a abertura. Guarde senha, pacote e arquivo-chave em locais separados.',
            },
          ],
        },
        {
          title: 'Formatos criptográficos',
          items: [
            {
              title: 'Novas criações usam Argon2id',
              description:
                'Arquivos CRIPTOVEU4 usam o perfil escolhido de 64, 256 ou 512 MB; MSG2, QR2 e LINK2 usam 64 MB; NOTE2 usa 128 MB. Todos executam Argon2id em Web Worker com AES-256-GCM.',
            },
            {
              title: 'Metadados críticos são autenticados',
              description:
                'Tipo, versão e parâmetros da KDF entram no AAD. Em arquivos V4, cabeçalho, tipo, índice e tamanho de cada registro também são autenticados.',
            },
            {
              title: 'Escudo de Integridade para arquivos',
              description:
                'O CRIPTOVEU4 cifra um manifesto com SHA-256 do arquivo e de cada bloco. Após a recuperação, o navegador recalcula e compara todos os hashes localmente.',
            },
            {
              title: 'Diagnóstico sem senha tem alcance limitado',
              description:
                'O inspetor pode reconhecer cabeçalho, registros e manifesto, mas informa apenas estrutura plausível. A autenticidade só é confirmada com a senha e o AES-GCM.',
            },
            {
              title: 'Compatibilidade sem enfraquecer novas criações',
              description:
                'Arquivos V3 e payloads V1 com PBKDF2 continuam legíveis. Novos arquivos usam V4; mensagens, QRs e links usam V2.',
            },
          ],
        },
        {
          title: 'Cofre portátil VéuNotes',
          items: [
            {
              title: 'Metadados também ficam cifrados',
              description:
                'Títulos, etiquetas, textos e identificadores das notas ficam dentro do NOTE2 autenticado. A busca local só funciona depois do desbloqueio.',
            },
            {
              title: 'Backup não contém a senha',
              description:
                'O arquivo .criptoveu-note contém apenas o envelope cifrado e parâmetros públicos. Sem a senha mestre correta, não há recuperação.',
            },
            {
              title: 'Troca de senha não altera backups antigos',
              description:
                'A troca recriptografa o cofre local com novo salt. Arquivos exportados antes dela continuam protegidos pela senha anterior e devem ser substituídos manualmente.',
            },
          ],
        },
        {
          title: 'Limites realistas',
          items: [
            {
              title: 'Argon2id não corrige senha fraca',
              description:
                'O custo de memória dificulta tentativas paralelas, mas senhas curtas ou previsíveis ainda podem ser adivinhadas.',
            },
            {
              title: 'Sem promessa de resistência quântica absoluta',
              description:
                'AES-256 oferece uma margem conservadora diante de modelos conhecidos, mas o projeto não afirma segurança pós-quântica absoluta.',
            },
          ],
        },
      ]}
    />
  )
}
