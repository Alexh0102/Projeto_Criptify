import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Crown,
  ExternalLink,
  FileArchive,
  Github,
  ImageUp,
  Instagram,
  Link2,
  Linkedin,
  LockKeyhole,
  NotebookPen,
  QrCode,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import ToolPageLayout from '../components/layout/ToolPageLayout'
import BrandLogo from '../components/ui/BrandLogo'
import HelpAccordion from '../components/ui/HelpAccordion'
import { toolDefinitions } from '../config/tools'
import { usePremium } from '../context/premium'

const iconByPath = {
  '/arquivos': FileArchive,
  '/qr-secreto': QrCode,
  '/link-secreto': Link2,
  '/esteganografia': ImageUp,
  '/veu-notes': NotebookPen,
} as const

const trustItems = [
  {
    title: '100% local',
    description: 'Seu conteúdo é processado no navegador durante o uso.',
  },
  {
    title: 'Sem fluxo confuso',
    description: 'Cada ferramenta abre em uma tela própria, com foco direto na tarefa.',
  },
  {
    title: 'Pronto para usar',
    description: 'Escolha a ferramenta, preencha os campos e gere o resultado na hora.',
  },
]

const useCases = [
  {
    title: 'Enviar um arquivo protegido por senha',
    description: 'Proteja documentos antes de compartilhar.',
  },
  {
    title: 'Criar um QR com mensagem protegida',
    description: 'Gere um QR e abra depois com a mesma senha.',
  },
  {
    title: 'Compartilhar um link temporário',
    description: 'Crie uma mensagem protegida para abrir no momento certo.',
  },
  {
    title: 'Ocultar uma mensagem em imagem',
    description: 'Esconda conteúdo sensível dentro de uma imagem.',
  },
  {
    title: 'Organizar tarefas sensíveis com mais cuidado',
    description: 'Separe tarefas para reduzir erro e exposição.',
  },
]

const localBenefits = [
  {
    title: 'Mais controle',
    description:
      'Arquivos, mensagens e imagens permanecem no seu dispositivo durante o uso da ferramenta.',
  },
  {
    title: 'Menos exposição',
    description: 'Você reduz a dependência de fluxos inseguros para tarefas sensíveis.',
  },
  {
    title: 'Mais simplicidade',
    description: 'Cada ferramenta resolve uma tarefa específica sem excesso de etapas visíveis.',
  },
]

const audienceItems = [
  {
    title: 'Profissionais autônomos',
    description: 'Para quem precisa proteger arquivos, mensagens ou imagens no dia a dia.',
    icon: BriefcaseBusiness,
  },
  {
    title: 'Pequenos escritórios',
    description: 'Para equipes que lidam com conteúdo sensível e querem mais controle no envio.',
    icon: Users,
  },
  {
    title: 'Operações administrativas',
    description: 'Para tarefas que envolvem documentos, instruções ou dados reservados.',
    icon: LockKeyhole,
  },
  {
    title: 'Pessoas que priorizam privacidade',
    description: 'Para quem quer resolver tarefas sensíveis diretamente no navegador.',
    icon: ShieldCheck,
  },
]

const faqItems = [
  {
    title: 'Preciso criar conta para usar?',
    content: 'Não. O uso das ferramentas pode começar diretamente pelo navegador.',
  },
  {
    title: 'Meu conteúdo é enviado para um servidor?',
    content:
      'O processamento principal acontece localmente no navegador durante o uso da ferramenta.',
  },
  {
    title: 'Funciona no celular?',
    content: 'Sim. As telas foram organizadas para uso mobile com foco em fluxo direto.',
  },
  {
    title: 'Posso usar para arquivos, mensagens e imagens?',
    content: 'Sim. Cada ferramenta foi criada para uma tarefa específica.',
  },
  {
    title: 'Qual ferramenta devo usar primeiro?',
    content:
      'Se você quer proteger um documento, comece por arquivos. Para mensagens curtas, use QR protegido ou link protegido.',
  },
  {
    title: 'Esteganografia é a mesma coisa que criptografia?',
    content:
      'Não. Na esteganografia, a mensagem protegida é escondida dentro de uma imagem. Na criptografia, o conteúdo é protegido diretamente.',
  },
]

const transparencyLinks = [
  {
    to: '/privacidade',
    title: 'Privacidade',
    description: 'O que é processado localmente e quais são os limites do uso.',
    featured: true,
    badge: 'Destaque',
  },
  {
    to: '/seguranca',
    title: 'Segurança',
    description: 'Boas práticas, cuidados com senha e uso responsável.',
  },
  {
    to: '/detalhes-tecnicos',
    title: 'Detalhes técnicos',
    description: 'Visão geral das rotas, do fluxo e das decisões da interface.',
  },
  {
    to: '/sobre',
    title: 'Sobre o projeto',
    description: 'Objetivo do CriptoVéu, contexto do produto e direção da plataforma.',
  },
]

const socialLinks = [
  {
    href: 'https://www.instagram.com/criptoveu?igsh=MWE2YXc5dGU4Mmdkaw==',
    title: 'Instagram do CriptoVéu',
    description: 'Acompanhe novidades, conteúdos visuais e atualizações do projeto.',
    cta: 'Abrir Instagram',
    eyebrow: '@criptoveu',
    icon: Instagram,
    accent:
      'border-pink-400/25 bg-[linear-gradient(135deg,rgba(244,114,182,0.14),rgba(251,191,36,0.14))] shadow-[0_20px_44px_rgba(244,114,182,0.12)]',
  },
  {
    href: 'https://www.linkedin.com/in/alex-silva-289108160?utm_source=share_via&utm_content=profile&utm_medium=member_android',
    title: 'Perfil no LinkedIn',
    description: 'Veja o perfil profissional ligado ao projeto e encontre mais informacoes sobre a iniciativa.',
    cta: 'Abrir LinkedIn',
    eyebrow: 'Alex Silva',
    icon: Linkedin,
    accent:
      'border-sky-400/25 bg-[linear-gradient(135deg,rgba(56,189,248,0.14),rgba(34,211,238,0.12))] shadow-[0_20px_44px_rgba(56,189,248,0.12)]',
  },
  {
    href: 'https://github.com/Alexh0102/Projeto_Criptoveu',
    title: 'Código-fonte',
    description: 'Consulte o repositório público, acompanhe mudanças e veja como o CriptoVéu funciona por dentro.',
    cta: 'Abrir GitHub',
    eyebrow: 'GitHub',
    icon: Github,
    accent:
      'border-zinc-300/20 bg-[linear-gradient(135deg,rgba(244,244,245,0.12),rgba(34,211,238,0.08))] shadow-[0_20px_44px_rgba(244,244,245,0.08)]',
  },
] as const

const freePlanItems = [
  'Criptografia local AES-256 / RSA.',
  'Limite de tamanho: arquivos ate 500MB.',
  'Ate 5 geracoes a cada 24h para Links Protegidos, QR Codes e Mensagens Ocultas.',
  'VeuNotes: totalmente ILIMITADO, sem restricoes.',
]

const supportPlanItems = [
  'Remocao de todas as travas, com arquivos de tamanho ilimitado.',
  'Geracoes diarias infinitas de links, QR codes e mensagens ocultas.',
  'Acesso vitalicio atrelado a sua chave matematica.',
  'Recibo e fatura em PDF enviados pela Stripe.',
]

export default function HomePage() {
  const { isPremium, tier, requestPremiumAccess, openLicenseActivation } = usePremium()

  return (
    <ToolPageLayout showToolsDock>
      <section className="space-y-5 sm:space-y-6">
        <section className="cv-hero surface-primary rounded-[38px] p-5 sm:p-7">
          <div className="cv-hero-brand mb-5">
            <BrandLogo variant="hero" showTagline />
          </div>

          <div className="hero-badge">
            <ShieldCheck className="h-4 w-4" />
            Ferramentas locais
          </div>

          <div className="cv-hero-copy mt-4 space-y-3.5">
            <p className="text-xs uppercase tracking-[0.38em] text-zinc-500">Privacidade prática</p>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-[1.02]">
              Proteja arquivos, mensagens e imagens sem sair do navegador.
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
              Use ferramentas locais para criptografar, compartilhar e ocultar conteúdo sensível com
              mais controle e menos exposição.
            </p>
          </div>

          <div className="cv-hero-actions mt-5 flex flex-wrap gap-3">
            <Link to="/arquivos" className="btn-primary">
              Começar por arquivos
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#ferramentas" className="btn-secondary">
              Ver ferramentas
            </a>
            <a href="#apoie" className="btn-secondary">
              Apoiar o Projeto
            </a>
          </div>

          <p className="mt-3.5 text-sm text-zinc-400">Tudo processado localmente no seu dispositivo.</p>
        </section>

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Feito para tarefas sensíveis</p>
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-[1.9rem]">
            Clareza, foco e processamento local na mesma experiência.
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {trustItems.map((item) => (
              <div key={item.title} className="surface-technical rounded-[22px] p-4">
                <p className="text-sm font-semibold text-white sm:text-base">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Casos de uso</p>
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-[1.9rem]">Onde o CriptoVéu ajuda</h2>
          <p className="mt-2.5 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
            Proteja conteúdo sensível antes de enviar, compartilhar ou armazenar.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {useCases.map((item) => (
              <div key={item.title} className="surface-technical rounded-[20px] p-4">
                <p className="text-sm font-semibold text-white sm:text-[15px]">{item.title}</p>
                <p className="mt-1.5 text-sm leading-6 text-zinc-400">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="ferramentas" className="scroll-mt-36 space-y-3.5 sm:scroll-mt-32">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Ferramentas</p>
            <h2 className="mt-2 text-2xl font-semibold text-white sm:text-[2rem]">
              Escolha a tarefa e entre direto na ferramenta certa.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {toolDefinitions.map((tool) => {
              const Icon = iconByPath[tool.path]
              const cardTitle = tool.cardTitle ?? tool.title
              const isSteganographyCard = tool.path === '/esteganografia'

              return (
                <Link
                  key={tool.path}
                  to={tool.path}
                  className="surface-primary group rounded-[30px] p-4 transition duration-200 hover:-translate-y-1 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="icon-chip transition group-hover:scale-105">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                      {tool.eyebrow}
                    </span>
                  </div>

                  <h3 className={`mt-4 font-semibold leading-tight text-white ${isSteganographyCard ? 'text-[1.18rem]' : 'text-[1.28rem]'}`}>
                    {cardTitle}
                  </h3>
                  <p className="mt-2.5 text-sm leading-6 text-zinc-400">{tool.description}</p>
                  {tool.technicalLabel ? (
                    <p className="mt-2.5 text-[10px] uppercase tracking-[0.32em] text-zinc-500/80">
                      {tool.technicalLabel}
                    </p>
                  ) : null}
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cyan-100">
                    Abrir ferramenta
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <section id="apoie" className="scroll-mt-36 surface-secondary rounded-[32px] p-4 sm:scroll-mt-32 sm:p-5">
          <div className="rounded-[26px] border border-emerald-400/30 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(34,197,94,0.08))] p-4 shadow-[0_18px_48px_rgba(16,185,129,0.10)] motion-safe:animate-pulse sm:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-emerald-50">Donationware</p>
                <h2 className="mt-2 text-xl font-semibold text-white sm:text-[1.8rem]">
                  Apoie o CriptoVeu: contribua com o projeto e libere processamento ilimitado
                </h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  requestPremiumAccess({
                    title: 'Apoiar o Projeto',
                    description:
                      'Insira o e-mail onde voce deseja receber a sua Chave de Ativacao Vitalicia.',
                  })
                }
                className="btn-primary shrink-0"
              >
                <Crown className="h-4 w-4" />
                Apoiar com R$ 10
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <article className="surface-technical rounded-[28px] p-5">
              <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Uso Comunitario</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">Uso Comunitario (Gratuito)</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Focado em uso casual para protecao essencial de arquivos do dia a dia.
              </p>
              <div className="mt-5 grid gap-3">
                {freePlanItems.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm leading-6 text-zinc-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-100" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="surface-primary rounded-[28px] border-emerald-400/30 p-5 shadow-[0_24px_70px_rgba(16,185,129,0.10)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-emerald-50">Doacao unica</p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">Apoio ao Projeto (R$ 10,00)</h3>
                </div>
                <div className="icon-chip">
                  <Crown className="h-5 w-5" />
                </div>
              </div>

              <p className="mt-3 text-sm leading-7 text-zinc-300">
                Uma microdoacao unica para ajudar a manter o software open-source ativo, livre de anuncios e independente.
              </p>

              <div className="mt-5 grid gap-3">
                {supportPlanItems.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm leading-6 text-zinc-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-100" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() =>
                    requestPremiumAccess({
                      title: 'Apoiar o Projeto',
                      description:
                        'Insira o e-mail onde voce deseja receber a sua Chave de Ativacao Vitalicia.',
                    })
                  }
                  className="btn-primary"
                >
                  <Crown className="h-4 w-4" />
                  Apoiar com R$ 10 (PIX ou Cartao)
                </button>
                <button type="button" onClick={openLicenseActivation} className="btn-secondary">
                  Ja tenho uma chave
                </button>
              </div>

              {isPremium ? (
                <p className="mt-4 rounded-[20px] border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-50">
                  {tier === 'admin' ? 'Acesso Admin ativo neste navegador.' : 'Apoiador Vitalicio ativo neste navegador.'}
                </p>
              ) : null}
            </article>
          </div>
        </section>

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Processamento local</p>
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-[1.9rem]">
            Por que usar processamento local
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {localBenefits.map((item) => (
              <div key={item.title} className="surface-technical rounded-[22px] p-4">
                <p className="text-sm font-semibold text-white sm:text-base">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Perfil de uso</p>
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-[1.9rem]">
            Para quem o CriptoVéu foi feito
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {audienceItems.map((item) => {
              const Icon = item.icon

              return (
                <div key={item.title} className="surface-technical rounded-[22px] p-4">
                  <div className="icon-chip">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3.5 text-sm font-semibold text-white sm:text-base">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{item.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Perguntas frequentes</p>
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-[1.9rem]">Perguntas frequentes</h2>
          <div className="mt-4">
            <HelpAccordion items={faqItems} defaultOpenIndex={0} />
          </div>
        </section>

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Redes e contatos</p>
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-[1.9rem]">
            Saiba mais sobre o CriptoVéu
          </h2>
          <p className="mt-2.5 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
            Para acompanhar novidades do site, conhecer melhor o perfil por trás do projeto
            e consultar o código-fonte, acesse os canais abaixo.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {socialLinks.map((item) => {
              const Icon = item.icon

              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className={`group rounded-[24px] border p-4 transition duration-200 hover:-translate-y-1 ${item.accent}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="icon-chip transition group-hover:scale-105">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                      {item.eyebrow}
                    </span>
                  </div>

                  <h3 className="mt-4 text-[1.2rem] font-semibold leading-tight text-white">{item.title}</h3>
                  <p className="mt-2.5 text-sm leading-6 text-zinc-300">{item.description}</p>

                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cyan-100">
                    {item.cta}
                    <ExternalLink className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </div>
                </a>
              )
            })}
          </div>
        </section>

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Transparência</p>
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-[1.9rem]">Transparência e segurança</h2>
          <p className="mt-2.5 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
            O CriptoVéu foi pensado para tarefas sensíveis com processamento local no navegador. Para
            entender melhor como cada ferramenta funciona, consulte as páginas de privacidade,
            segurança e detalhes técnicos.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {transparencyLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`${item.featured ? 'surface-primary border-cyan-500/25 shadow-[0_18px_42px_rgba(34,211,238,0.08)]' : 'surface-technical'} rounded-[22px] p-4 transition hover:-translate-y-0.5`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 text-cyan-100">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-semibold text-white">{item.title}</span>
                  </div>
                  {item.featured ? (
                    <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] text-cyan-100">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{item.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </ToolPageLayout>
  )
}
