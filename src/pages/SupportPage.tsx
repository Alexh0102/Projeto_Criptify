import { ArrowRight, CheckCircle2, Crown, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import ToolPageLayout from '../components/layout/ToolPageLayout'
import HelpAccordion from '../components/ui/HelpAccordion'
import ToolHeroCompact from '../components/ui/ToolHeroCompact'
import { usePremium } from '../context/premium'

const activationEmailPrompt =
  'Insira o e-mail onde você deseja receber a sua Chave de Ativação Vitalícia.'

const freePlanItems = [
  'Criptografia e recuperação de arquivos sem limite de usos; arquivos de até 10 GB.',
  'Até 10 gerações a cada 24h para Links Protegidos, QR Codes e Mensagens Ocultas.',
  'VéuNotes: totalmente ilimitado, sem restrições.',
]

const supportPlanItems = [
  'Remoção de todas as travas, com arquivos de tamanho ilimitado.',
  'Gerações diárias infinitas de links, QR codes e mensagens ocultas.',
  'Acesso vitalício atrelado à sua chave matemática.',
  'Recibo e fatura em PDF enviados pela Stripe.',
]

const faqItems = [
  {
    title: 'É assinatura mensal?',
    content:
      'Não. É uma doação única de R$ 10,00 que libera uma chave vitalícia para este fluxo de uso ilimitado.',
  },
  {
    title: 'Preciso criar conta?',
    content:
      'Não. Você informa apenas o e-mail de entrega da chave, conclui o pagamento pela Stripe e recebe a chave por e-mail.',
  },
  {
    title: 'O uso gratuito continua existindo?',
    content:
      'Sim. A criptografia e a recuperação de arquivos não têm limite de quantidade de usos, respeitando apenas o limite gratuito de tamanho. Links Protegidos, QR Codes e Mensagens Ocultas oferecem 10 gerações a cada 24 horas.',
  },
  {
    title: 'Por que há limite em algumas ferramentas?',
    content:
      'O processamento acontece localmente no seu dispositivo. O limite de geração existe para incentivar o apoio voluntário ao desenvolvimento e à manutenção do CriptoVéu, não por cobrança de processamento em servidor.',
  },
]

export default function SupportPage() {
  const { isPremium, tier, requestPremiumAccess, openLicenseActivation } = usePremium()

  function handleSupportClick() {
    requestPremiumAccess({
      title: 'Apoiar o Projeto',
      description: activationEmailPrompt,
    })
  }

  return (
    <ToolPageLayout>
      <div className="space-y-6">
        <ToolHeroCompact
          eyebrow="Doação incentivada"
          badge="Projeto aberto"
          title="Apoie o CriptoVéu e libere processamento ilimitado."
          description="Uma contribuição única ajuda a manter o projeto open-source ativo, independente e sem anúncios. Em troca, você recebe uma Chave de Ativação Vitalícia."
          actions={
            <button type="button" onClick={handleSupportClick} className="btn-primary">
              <Crown className="h-4 w-4" />
              Apoiar com R$ 10
            </button>
          }
        />

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <div className="rounded-[26px] border border-emerald-400/30 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(34,197,94,0.08))] p-4 shadow-[0_18px_48px_rgba(16,185,129,0.10)] motion-safe:animate-pulse sm:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-emerald-50">Apoio ao projeto</p>
                <h2 className="mt-2 text-xl font-semibold text-white sm:text-[1.8rem]">
                  Apoie o CriptoVéu: contribua com o projeto e libere processamento ilimitado
                </h2>
              </div>
              <button type="button" onClick={handleSupportClick} className="btn-primary shrink-0">
                <Crown className="h-4 w-4" />
                Apoiar com R$ 10
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <article className="surface-technical rounded-[28px] p-5">
              <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Uso comunitário</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">Uso Comunitário (Gratuito)</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Focado em uso casual para proteção essencial de arquivos do dia a dia.
              </p>
              <div className="mt-5 grid gap-3">
                {freePlanItems.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm leading-6 text-zinc-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-100" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <p className="mt-5 rounded-[20px] border border-cyan-400/15 bg-cyan-400/[0.05] p-3 text-xs leading-6 text-zinc-400">
                Transparência: o processamento é local. A cota de links, QRs e mensagens ocultas
                incentiva o apoio voluntário à manutenção do projeto; ela não bloqueia a
                criptografia ou a recuperação de arquivos por quantidade de usos.
              </p>
            </article>

            <article className="surface-primary rounded-[28px] border-emerald-400/30 p-5 shadow-[0_24px_70px_rgba(16,185,129,0.10)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-emerald-50">Doação única</p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">Apoio ao Projeto (R$ 10,00)</h3>
                </div>
                <div className="icon-chip">
                  <Crown className="h-5 w-5" />
                </div>
              </div>

              <p className="mt-3 text-sm leading-7 text-zinc-300">
                Uma microdoação única para ajudar a manter o software open-source ativo, livre de anúncios e independente.
              </p>
              <p className="mt-3 text-xs leading-6 text-zinc-400">
                Meios de pagamento aceitos: cartão de crédito, cartão de débito, Google Pay e boleto.
              </p>
              <p className="mt-3 rounded-[20px] border border-cyan-400/15 bg-cyan-400/[0.05] p-3 text-xs leading-6 text-zinc-300">
                Privacidade: a chave de apoio remove apenas os limites comunitários. Ela não
                acessa arquivos, mensagens, senhas ou notas.
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
                <button type="button" onClick={handleSupportClick} className="btn-primary">
                  <Crown className="h-4 w-4" />
                  Apoiar com R$ 10
                </button>
                <button type="button" onClick={openLicenseActivation} className="btn-secondary">
                  Já tenho uma chave
                </button>
              </div>

              {isPremium ? (
                <p className="mt-4 rounded-[20px] border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-50">
                  {tier === 'admin' ? 'Acesso Admin ativo neste navegador.' : 'Apoiador Vitalício ativo neste navegador.'}
                </p>
              ) : null}
            </article>
          </div>
        </section>

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="hero-badge">
                <ShieldCheck className="h-4 w-4" />
                Fluxo seguro
              </div>
              <h2 className="mt-4 text-xl font-semibold text-white sm:text-[1.9rem]">
                O pagamento abre pela Stripe e a chave chega por e-mail.
              </h2>
              <p className="mt-2.5 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
                O e-mail é usado apenas para travar o checkout e entregar a chave matemática. A validação acontece no servidor, sem expor segredos no código público.
              </p>
            </div>
            <Link to="/arquivos" className="btn-secondary shrink-0">
              Ver ferramentas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <HelpAccordion items={faqItems} defaultOpenIndex={0} />
      </div>
    </ToolPageLayout>
  )
}
