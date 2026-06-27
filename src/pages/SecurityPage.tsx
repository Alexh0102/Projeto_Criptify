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
          title: 'Formatos criptográficos',
          items: [
            {
              title: 'Novas criações usam Argon2id',
              description:
                'MSG2, QR2 e LINK2 usam 64 MB de memória; NOTE2 usa 128 MB. Todos executam Argon2id em Web Worker com AES-256-GCM.',
            },
            {
              title: 'Metadados críticos são autenticados',
              description:
                'Tipo, versão e parâmetros da KDF entram no AAD. No LINK2, criação, expiração e limite também são autenticados.',
            },
            {
              title: 'Compatibilidade sem enfraquecer novas criações',
              description:
                'Payloads V1 com PBKDF2 continuam legíveis. O CriptoVéu cria somente V2 e migra NOTE1 após uma abertura bem-sucedida.',
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
