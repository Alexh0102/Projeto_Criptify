import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Cpu,
  HardDrive,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import ToolPageLayout from '../components/layout/ToolPageLayout'
import ToolHeroCompact from '../components/ui/ToolHeroCompact'
import {
  collectBrowserDiagnosticsInput,
  createBrowserDiagnosticsReport,
} from '../lib/browser-diagnostics'
import type {
  BrowserDiagnosticsReport,
  DiagnosticStatus,
} from '../lib/browser-diagnostics'

const statusCopy: Record<DiagnosticStatus, { label: string; className: string }> = {
  ok: {
    label: 'Pronto',
    className: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100',
  },
  warning: {
    label: 'Atenção',
    className: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
  },
  fail: {
    label: 'Crítico',
    className: 'border-rose-400/30 bg-rose-500/10 text-rose-100',
  },
}

const statusIcon = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  fail: XCircle,
} satisfies Record<DiagnosticStatus, typeof CheckCircle2>

function StatusBadge({ status }: { status: DiagnosticStatus }) {
  const Icon = statusIcon[status]
  const copy = statusCopy[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] ${copy.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {copy.label}
    </span>
  )
}

function createReport() {
  return createBrowserDiagnosticsReport(collectBrowserDiagnosticsInput())
}

export default function BrowserDiagnosticsPage() {
  const { t } = useTranslation()
  const [report, setReport] = useState<BrowserDiagnosticsReport | null>(() =>
    typeof window === 'undefined' ? null : createReport(),
  )
  const [copyStatus, setCopyStatus] = useState('')

  function refreshReport() {
    setReport(createReport())
    setCopyStatus('')
  }

  async function copyReport() {
    if (!report) {
      return
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2))
      setCopyStatus('Relatório copiado.')
    } catch {
      setCopyStatus('Não foi possível copiar automaticamente.')
    }
  }

  return (
    <ToolPageLayout>
      <div className="space-y-5">
        <ToolHeroCompact
          eyebrow={t('diagnostics.page.eyebrow')}
          title={t('diagnostics.page.title')}
          description={t('diagnostics.page.description')}
          badge={t('diagnostics.page.badge')}
          actions={
            <button type="button" onClick={refreshReport} className="btn-secondary">
              <RefreshCw className="h-4 w-4" />
              {t('diagnostics.page.refresh')}
            </button>
          }
        />

        {report ? (
          <>
            <section className="surface-primary rounded-[32px] p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-cyan-100/80">
                    {t('diagnostics.report.eyebrow')}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {report.summary}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">
                    {t('diagnostics.report.helper')}
                  </p>
                </div>
                <StatusBadge status={report.overallStatus} />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="surface-technical rounded-[22px] p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
                    {t('diagnostics.environment.browser')}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {report.environment.browserLabel}
                  </p>
                </div>
                <div className="surface-technical rounded-[22px] p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
                    {t('diagnostics.environment.memory')}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {report.environment.deviceMemoryGb
                      ? `${report.environment.deviceMemoryGb} GB`
                      : t('diagnostics.environment.unknown')}
                  </p>
                </div>
                <div className="surface-technical rounded-[22px] p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
                    {t('diagnostics.environment.cores')}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {report.environment.hardwareConcurrency ??
                      t('diagnostics.environment.unknown')}
                  </p>
                </div>
                <div className="surface-technical rounded-[22px] p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
                    {t('diagnostics.environment.context')}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {report.environment.secureContext
                      ? t('diagnostics.environment.secure')
                      : t('diagnostics.environment.insecure')}
                  </p>
                </div>
              </div>
            </section>

            <section className="surface-secondary rounded-[32px] p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-cyan-100" />
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">
                    {t('diagnostics.capabilities.eyebrow')}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    {t('diagnostics.capabilities.title')}
                  </h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {report.capabilities.map((capability) => (
                  <div
                    key={capability.id}
                    className="surface-technical rounded-[22px] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-white">
                        {capability.title}
                      </p>
                      <StatusBadge status={capability.status} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      {capability.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-secondary rounded-[32px] p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <HardDrive className="h-5 w-5 text-cyan-100" />
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">
                    {t('diagnostics.argon2.eyebrow')}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    {t('diagnostics.argon2.title')}
                  </h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                {report.argon2Profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="surface-primary rounded-[24px] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="icon-chip">
                        <Cpu className="h-5 w-5" />
                      </div>
                      <StatusBadge status={profile.status} />
                    </div>
                    <p className="mt-4 text-lg font-semibold text-white">
                      {profile.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {profile.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-primary rounded-[32px] p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-cyan-100/80">
                    {t('diagnostics.notes.eyebrow')}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    {t('diagnostics.notes.title')}
                  </h2>
                </div>
                <button type="button" onClick={copyReport} className="btn-secondary">
                  <ClipboardCopy className="h-4 w-4" />
                  {t('diagnostics.notes.copy')}
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {report.notes.map((note) => (
                  <p
                    key={note}
                    className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-zinc-400"
                  >
                    {note}
                  </p>
                ))}
              </div>
              {copyStatus ? (
                <p className="mt-3 text-sm text-cyan-100">{copyStatus}</p>
              ) : null}
            </section>
          </>
        ) : (
          <section className="surface-primary rounded-[32px] p-6 text-sm text-zinc-400">
            {t('diagnostics.page.loading')}
          </section>
        )}
      </div>
    </ToolPageLayout>
  )
}
