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
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import ToolPageLayout from '../components/layout/ToolPageLayout'
import BrandLogo from '../components/ui/BrandLogo'
import HelpAccordion from '../components/ui/HelpAccordion'
import { toolDefinitions } from '../config/tools'

const iconByPath = {
  '/arquivos': FileArchive,
  '/qr-secreto': QrCode,
  '/link-secreto': Link2,
  '/esteganografia': ImageUp,
  '/veu-notes': NotebookPen,
} as const

const trustItemKeys = ['local', 'focusedFlow', 'ready'] as const
const useCaseKeys = ['file', 'qr', 'link', 'image', 'carefulTasks'] as const
const localBenefitKeys = ['control', 'lessExposure', 'simplicity'] as const
const faqKeys = ['account', 'server', 'mobile', 'contentTypes', 'firstTool', 'steganography'] as const

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
      <section className="space-y-5 sm:space-y-6">
        <section className="cv-hero surface-primary rounded-[38px] p-5 sm:p-7">
          <div className="cv-hero-brand mb-5">
            <BrandLogo variant="hero" showTagline />
          </div>

          <div className="hero-badge">
            <ShieldCheck className="h-4 w-4" />
            {t('home.hero.badge')}
          </div>

          <div className="cv-hero-copy mt-4 space-y-3.5">
            <p className="text-xs uppercase tracking-[0.38em] text-zinc-500">
              {t('home.hero.eyebrow')}
            </p>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-[1.02]">
              {t('home.hero.title')}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
              {t('home.hero.description')}
            </p>
          </div>

          <div className="cv-hero-actions mt-5 flex flex-wrap gap-3">
            <Link to="/arquivos" className="btn-primary">
              {t('home.hero.filesCta')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#ferramentas" className="btn-secondary">
              {t('home.hero.toolsCta')}
            </a>
            <Link to="/apoiar" className="btn-secondary">
              {t('home.hero.supportCta')}
            </Link>
          </div>

          <p className="mt-3.5 text-sm text-zinc-400">{t('home.hero.note')}</p>
        </section>

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">
            {t('home.trust.eyebrow')}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-[1.9rem]">
            {t('home.trust.title')}
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
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

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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

        <section id="ferramentas" className="scroll-mt-36 space-y-3.5 sm:scroll-mt-32">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">
              {t('home.tools.eyebrow')}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white sm:text-[2rem]">
              {t('home.tools.title')}
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                  className="surface-primary group rounded-[30px] p-4 transition duration-200 hover:-translate-y-1 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="icon-chip transition group-hover:scale-105">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                      {t(`tools.${tool.id}.eyebrow`)}
                    </span>
                  </div>

                  <h3 className={`mt-4 font-semibold leading-tight text-white ${isSteganographyCard ? 'text-[1.18rem]' : 'text-[1.28rem]'}`}>
                    {t(`tools.${tool.id}.cardTitle`)}
                  </h3>
                  <p className="mt-2.5 text-sm leading-6 text-zinc-400">
                    {t(`tools.${tool.id}.description`)}
                  </p>
                  {technicalLabel ? (
                    <p className="mt-2.5 text-[10px] uppercase tracking-[0.32em] text-zinc-500/80">
                      {technicalLabel}
                    </p>
                  ) : null}
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cyan-100">
                    {t('home.tools.open')}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <div className="flex flex-col gap-4 rounded-[26px] border border-emerald-400/25 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(34,211,238,0.08))] p-5 shadow-[0_18px_48px_rgba(16,185,129,0.08)] md:flex-row md:items-center md:justify-between">
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
            <Link to="/apoiar" className="btn-primary shrink-0">
              {t('home.hero.supportCta')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="surface-secondary rounded-[32px] p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">
            {t('home.local.eyebrow')}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-[1.9rem]">
            {t('home.local.title')}
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
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

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
