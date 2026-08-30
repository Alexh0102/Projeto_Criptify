import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
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
  ScanSearch,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import ToolPageLayout from '../components/layout/ToolPageLayout'
import BrandLogo from '../components/ui/BrandLogo'
import HelpAccordion from '../components/ui/HelpAccordion'
import { betaResourceDefinitions, toolDefinitions } from '../config/tools'

const iconByPath = {
  '/arquivos': FileArchive,
  '/qr-secreto': QrCode,
  '/link-secreto': Link2,
  '/esteganografia': ImageUp,
  '/veu-notes': NotebookPen,
  '/diagnostico-navegador': ScanSearch,
} as const

const trustItemKeys = ['local', 'focusedFlow', 'ready'] as const
const useCaseKeys = ['file', 'qr', 'link', 'image', 'carefulTasks'] as const
const localBenefitKeys = ['control', 'lessExposure', 'simplicity'] as const
const faqKeys = [
  'account',
  'server',
  'linkPassword',
  'mobile',
  'contentTypes',
  'firstTool',
  'steganography',
] as const

const audienceItems = [
  {
    key: 'freelancers',
    icon: BriefcaseBusiness,
  },
  {
    key: 'smallOffices',
    icon: Users,
  },
  {
    key: 'adminOps',
    icon: LockKeyhole,
  },
  {
    key: 'privacyPeople',
    icon: ShieldCheck,
  },
] as const

const transparencyLinks: Array<{
  key: 'privacy' | 'security' | 'technical' | 'about'
  to: '/privacidade' | '/seguranca' | '/detalhes-tecnicos' | '/sobre'
  featured?: boolean
}> = [
  {
    key: 'privacy',
    to: '/privacidade',
    featured: true,
  },
  {
    key: 'security',
    to: '/seguranca',
  },
  {
    key: 'technical',
    to: '/detalhes-tecnicos',
  },
  {
    key: 'about',
    to: '/sobre',
  },
] as const

const socialLinks = [
  {
    key: 'instagram',
    href: 'https://www.instagram.com/criptoveu?igsh=MWE2YXc5dGU4Mmdkaw==',
    icon: Instagram,
    accent:
      'border-pink-400/25 bg-[linear-gradient(135deg,rgba(244,114,182,0.14),rgba(251,191,36,0.14))] shadow-[0_20px_44px_rgba(244,114,182,0.12)]',
  },
  {
    key: 'linkedin',
    href: 'https://www.linkedin.com/in/alex-silva-289108160?utm_source=share_via&utm_content=profile&utm_medium=member_android',
    icon: Linkedin,
    accent:
      'border-sky-400/25 bg-[linear-gradient(135deg,rgba(56,189,248,0.14),rgba(34,211,238,0.12))] shadow-[0_20px_44px_rgba(56,189,248,0.12)]',
  },
  {
    key: 'github',
    href: 'https://github.com/Alexh0102/Projeto_Criptoveu',
    icon: Github,
    accent:
      'border-zinc-300/20 bg-[linear-gradient(135deg,rgba(244,244,245,0.12),rgba(34,211,238,0.08))] shadow-[0_20px_44px_rgba(244,244,245,0.08)]',
  },
] as const

export default function HomePage() {
  const { t } = useTranslation()

  return (
    <ToolPageLayout showToolsDock>
      <section className="space-y-4 sm:space-y-6">
        <section className="cv-hero surface-primary w-full max-w-full min-w-0 rounded-[28px] p-4 sm:rounded-[38px] sm:p-7">
          <div className="cv-hero-brand mb-4 min-w-0 max-w-full sm:mb-6">
            <BrandLogo variant="hero" showTagline />
          </div>

          <div className="hero-badge max-w-full">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="break-words sm:truncate">{t('home.hero.badge')}</span>
          </div>

          <div className="cv-hero-copy mt-4 min-w-0 max-w-full break-words space-y-3 sm:space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500 sm:text-xs sm:tracking-[0.38em]">
              {t('home.hero.eyebrow')}
            </p>
            <h1 className="min-w-0 max-w-4xl break-words text-2xl font-bold tracking-tight text-white min-[360px]:text-3xl sm:text-4xl md:text-5xl leading-tight sm:leading-[1.08]">
              {t('home.hero.title')}
            </h1>
            <p className="min-w-0 max-w-3xl break-words text-sm leading-relaxed text-zinc-300 sm:text-base sm:leading-7">
              {t('home.hero.description')}
            </p>
          </div>

          <div className="cv-hero-actions mt-5 flex w-full max-w-full flex-col gap-2.5 min-[480px]:flex-row min-[480px]:flex-wrap sm:mt-6 sm:gap-3">
            <Link to="/arquivos" className="btn-primary w-full max-w-full min-[480px]:w-auto">
              <span className="truncate">{t('home.hero.filesCta')}</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
            <a href="#ferramentas" className="btn-secondary w-full max-w-full min-[480px]:w-auto">
              <span className="truncate">{t('home.hero.toolsCta')}</span>
            </a>
            <a href="#recursos-beta" className="btn-secondary w-full max-w-full min-[480px]:w-auto">
              <span className="truncate">{t('home.hero.betaCta')}</span>
            </a>
          </div>

          <p className="mt-3.5 min-w-0 max-w-full break-words text-sm text-zinc-400">{t('home.hero.note')}</p>
        </section>

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">
            {t('home.trust.eyebrow')}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-[1.9rem]">
            {t('home.trust.title')}
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {trustItemKeys.map((key) => (
              <div key={key} className="surface-technical rounded-[22px] p-4">
                <p className="text-sm font-semibold text-white sm:text-base">
                  {t(`home.trust.items.${key}.title`)}
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {t(`home.trust.items.${key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">
            {t('home.useCases.eyebrow')}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-[1.9rem]">
            {t('home.useCases.title')}
          </h2>
          <p className="mt-2.5 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
            {t('home.useCases.description')}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {useCaseKeys.map((key) => (
              <div key={key} className="surface-technical rounded-[20px] p-4">
                <p className="text-sm font-semibold text-white sm:text-[15px]">
                  {t(`home.useCases.items.${key}.title`)}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-zinc-400">
                  {t(`home.useCases.items.${key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="ferramentas" className="scroll-mt-28 space-y-4 sm:scroll-mt-32">
          <div className="px-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-500 sm:text-xs">
              {t('home.tools.eyebrow')}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-[2rem]">
              {t('home.tools.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {toolDefinitions.map((tool) => {
              const Icon = iconByPath[tool.path]
              const isSteganographyCard = tool.id === 'steganography'
              const technicalLabel =
                tool.id === 'steganography' || tool.id === 'notes'
                  ? t(`tools.${tool.id}.technicalLabel`)
                  : null

              return (
                <Link
                  key={tool.path}
                  to={tool.path}
                  className="surface-primary group flex flex-col rounded-[30px] p-5 transition duration-200 hover:-translate-y-1 active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="icon-chip transition group-hover:scale-105">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                      {t(`tools.${tool.id}.eyebrow`)}
                    </span>
                  </div>

                  <h3 className={`mt-5 font-bold leading-tight text-white ${isSteganographyCard ? 'text-lg' : 'text-xl'}`}>
                    {t(`tools.${tool.id}.cardTitle`)}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">
                    {t(`tools.${tool.id}.description`)}
                  </p>
                  {technicalLabel ? (
                    <p className="mt-auto pt-4 text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500/80">
                      {technicalLabel}
                    </p>
                  ) : null}
                  <div className={`mt-4 inline-flex items-center gap-2 text-sm font-bold text-cyan-100 ${!technicalLabel ? 'mt-auto' : ''}`}>
                    {t('home.tools.open')}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <section id="recursos-beta" className="scroll-mt-28 space-y-4 sm:scroll-mt-32">
          <div className="px-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70 sm:text-xs">
              {t('home.beta.eyebrow')}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-[2rem]">
              {t('home.beta.title')}
            </h2>
            <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              {t('home.beta.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {betaResourceDefinitions.map((resource) => {
              const Icon = iconByPath[resource.path]

              return (
                <Link
                  key={resource.path}
                  to={resource.path}
                  className="surface-primary group flex flex-col rounded-[30px] border-cyan-500/25 p-5 transition duration-200 hover:-translate-y-1 active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="icon-chip transition group-hover:scale-105">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100">
                      {t('home.beta.badge')}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-bold leading-tight text-white">
                    {t(`tools.${resource.id}.cardTitle`)}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">
                    {t(`tools.${resource.id}.description`)}
                  </p>
                  <p className="mt-auto pt-4 text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500/80">
                    {t(`tools.${resource.id}.technicalLabel`)}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-cyan-100">
                    {t('home.tools.open')}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <div className="rounded-[26px] border border-emerald-400/25 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(34,211,238,0.08))] p-5 shadow-[0_18px_48px_rgba(16,185,129,0.08)]">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-emerald-50">
                {t('home.support.eyebrow')}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white sm:text-[1.9rem]">
                {t('home.support.title')}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
                {t('home.support.description')}
              </p>
            </div>
          </div>
        </section>

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">
            {t('home.local.eyebrow')}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-[1.9rem]">
            {t('home.local.title')}
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {localBenefitKeys.map((key) => (
              <div key={key} className="surface-technical rounded-[22px] p-4">
                <p className="text-sm font-semibold text-white sm:text-base">
                  {t(`home.local.items.${key}.title`)}
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {t(`home.local.items.${key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">
            {t('home.audience.eyebrow')}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-[1.9rem]">
            {t('home.audience.title')}
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {audienceItems.map((item) => {
              const Icon = item.icon

              return (
                <div key={item.key} className="surface-technical rounded-[22px] p-4">
                  <div className="icon-chip">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3.5 text-sm font-semibold text-white sm:text-base">
                    {t(`home.audience.items.${item.key}.title`)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {t(`home.audience.items.${item.key}.description`)}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">
            {t('home.faq.eyebrow')}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-[1.9rem]">
            {t('home.faq.title')}
          </h2>
          <div className="mt-4">
            <HelpAccordion
              items={faqKeys.map((key) => ({
                title: t(`home.faq.items.${key}.title`),
                content: t(`home.faq.items.${key}.content`),
              }))}
              defaultOpenIndex={0}
            />
          </div>
        </section>

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">
            {t('home.social.eyebrow')}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-[1.9rem]">
            {t('home.social.title')}
          </h2>
          <p className="mt-2.5 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
            {t('home.social.description')}
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
                      {t(`home.social.items.${item.key}.eyebrow`)}
                    </span>
                  </div>

                  <h3 className="mt-4 text-[1.2rem] font-semibold leading-tight text-white">
                    {t(`home.social.items.${item.key}.title`)}
                  </h3>
                  <p className="mt-2.5 text-sm leading-6 text-zinc-300">
                    {t(`home.social.items.${item.key}.description`)}
                  </p>

                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cyan-100">
                    {t(`home.social.items.${item.key}.cta`)}
                    <ExternalLink className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </div>
                </a>
              )
            })}
          </div>
        </section>

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">
            {t('home.transparency.eyebrow')}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-[1.9rem]">
            {t('home.transparency.title')}
          </h2>
          <p className="mt-2.5 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
            {t('home.transparency.description')}
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
                    <span className="text-sm font-semibold text-white">
                      {t(`home.transparency.items.${item.key}.title`)}
                    </span>
                  </div>
                  {item.featured ? (
                    <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] text-cyan-100">
                      {t('home.transparency.featuredBadge')}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {t(`home.transparency.items.${item.key}.description`)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </ToolPageLayout>
  )
}
