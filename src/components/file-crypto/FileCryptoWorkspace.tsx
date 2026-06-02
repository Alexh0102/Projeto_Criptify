import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  FileArchive,
  LoaderCircle,
  Lock,
  Maximize2,
  Sparkles,
  Unlock,
  Upload,
} from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { useTranslation } from 'react-i18next'

import FieldBlock from '../ui/FieldBlock'
import AdvancedOptions from '../ui/AdvancedOptions'
import MobileStickyCTA from '../ui/MobileStickyCTA'
import ResultPanel from '../ui/ResultPanel'
import SegmentedMode from '../ui/SegmentedMode'
import UniversalPreview from './UniversalPreview'
import { usePremium } from '../../context/premium'
import {
  getUniversalPreviewMetadata,
  type PreviewMetadata,
} from './preview-metadata'
import { useInactivity } from '../../hooks/useInactivity'
import { useStreamingCrypto } from '../../hooks/useStreamingCrypto'
import {
  ARGON2_FILE_ITERATIONS,
  DEFAULT_FILE_SECURITY_PROFILE_ID,
  FILE_SECURITY_PROFILES,
  STREAMING_CHUNK_SIZE_BYTES,
  CriptoveuError,
  formatFileSize,
  generateWhatsappStyleKey,
  getPasswordStrength,
  type FileSecurityProfileId,
} from '../../lib/criptoveu'
import { FREE_FILE_SIZE_BYTES } from '../../lib/premium'

type Mode = 'encrypt' | 'decrypt'
type StatusTone = 'info' | 'success' | 'error'

type StatusState = {
  tone: StatusTone
  message: string
}

type ResultItem = {
  id: string
  name: string
  blob: Blob
  url: string
  size: number
  sourceName: string
  preview: PreviewMetadata
}

const MODE_COPY: Record<
  Mode,
  {
    action: string
    title: string
    description: string
    hint: string
  }
> = {
  encrypt: {
    action: 'files.workspace.modes.encrypt.action',
    title: 'files.workspace.modes.encrypt.title',
    description: 'files.workspace.modes.encrypt.description',
    hint: 'files.workspace.modes.encrypt.hint',
  },
  decrypt: {
    action: 'files.workspace.modes.decrypt.action',
    title: 'files.workspace.modes.decrypt.title',
    description: 'files.workspace.modes.decrypt.description',
    hint: 'files.workspace.modes.decrypt.hint',
  },
}

const STATUS_STYLES: Record<StatusTone, string> = {
  info: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-50',
  success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-50',
  error: 'border-rose-500/25 bg-rose-500/10 text-rose-50',
}

const STRENGTH_SLOTS = [1, 2, 3, 4, 5]
const FILE_SECURITY_PROFILE_STORAGE_KEY = 'criptoveu-file-security-profile-v3'

function loadSecurityProfileId(): FileSecurityProfileId {
  try {
    const storedValue = window.localStorage.getItem(FILE_SECURITY_PROFILE_STORAGE_KEY)
    const selectedProfile = FILE_SECURITY_PROFILES.find(
      (profile) => profile.id === storedValue,
    )

    return selectedProfile?.id ?? DEFAULT_FILE_SECURITY_PROFILE_ID
  } catch {
    return DEFAULT_FILE_SECURITY_PROFILE_ID
  }
}

function downloadBlobUrl(url: string, fileName: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

export default function FileCryptoWorkspace() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('encrypt')
  const [files, setFiles] = useState<File[]>([])
  const [password, setPassword] = useState('')
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState(() => t('files.workspace.status.ready'))
  const [status, setStatus] = useState<StatusState>({
    tone: 'info',
    message: t('files.workspace.status.initial'),
  })
  const [results, setResults] = useState<ResultItem[]>([])
  const [previewItem, setPreviewItem] = useState<ResultItem | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [securityProfileId, setSecurityProfileId] =
    useState<FileSecurityProfileId>(loadSecurityProfileId)
  const fileInputId = useId()
  const passwordInputId = useId()
  const resultUrlRef = useRef<string[]>([])
  const resultPanelRef = useRef<HTMLDivElement | null>(null)
  const isInactive = useInactivity({ disabled: results.length === 0 && !isPreviewOpen })
  const streamingCrypto = useStreamingCrypto()
  const { isPremium, tier, requestPremiumAccess } = usePremium()
  const canUseSecureProcessing =
    window.isSecureContext && typeof window.crypto?.subtle !== 'undefined'
  const hasClipboardSupport = typeof navigator.clipboard?.writeText === 'function'
  const securityProfile =
    FILE_SECURITY_PROFILES.find((profile) => profile.id === securityProfileId) ??
    FILE_SECURITY_PROFILES[1]

  const strength = getPasswordStrength(password)
  const currentMode = MODE_COPY[mode]
  const totalSelectedSize = files.reduce((sum, currentFile) => sum + currentFile.size, 0)
  const activeFileLimit = isPremium ? null : FREE_FILE_SIZE_BYTES
  const fileLimitLabel =
    activeFileLimit === null
      ? t('files.workspace.plan.unlimited')
      : formatFileSize(activeFileLimit)
  const resultUrl = previewItem?.url ?? results[0]?.url ?? null
  const resultName = previewItem?.name ?? results[0]?.name ?? ''
  const activePreviewItem = previewItem ?? results[0] ?? null
  const preview = activePreviewItem?.preview ?? { kind: 'none', label: t('common.file') }
  const quickFacts = [
    {
      label: t('files.workspace.quickFacts.formats'),
      value:
        mode === 'encrypt'
          ? t('files.workspace.quickFacts.anyFile')
          : t('files.workspace.quickFacts.criptoveuFiles'),
    },
    {
      label: t('files.workspace.quickFacts.planLimit'),
      value: fileLimitLabel,
    },
    {
      label: t('files.workspace.quickFacts.activeTier'),
      value: isPremium
        ? tier === 'admin'
          ? t('files.workspace.plan.admin')
          : t('files.workspace.plan.supporter')
        : t('files.workspace.plan.community'),
    },
    {
      label: t('files.workspace.quickFacts.processing'),
      value: t('files.workspace.quickFacts.blocksOf', {
        size: formatFileSize(STREAMING_CHUNK_SIZE_BYTES),
      }),
    },
    {
      label: t('files.workspace.quickFacts.derivation'),
      value:
        mode === 'encrypt'
          ? t('files.workspace.quickFacts.argon2', { memory: securityProfile.memoryMb })
          : t('files.workspace.quickFacts.packageParams'),
    },
    {
      label: t('files.workspace.quickFacts.transfer'),
      value: t('files.workspace.quickFacts.noUpload'),
    },
  ]

  useEffect(() => {
    if (!canUseSecureProcessing) {
      setStatus({
        tone: 'error',
        message: t('files.workspace.status.secureContextRequired'),
      })
    }
  }, [canUseSecureProcessing, t])

  useEffect(() => {
    try {
      window.localStorage.setItem(FILE_SECURITY_PROFILE_STORAGE_KEY, securityProfileId)
    } catch {
      // A seleção em memória continua válida quando o armazenamento é bloqueado.
    }
  }, [securityProfileId])

  useEffect(() => {
    if (!copied) {
      return
    }

    const timeoutId = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timeoutId)
  }, [copied])

  useEffect(() => {
    if (results.length === 0) {
      return
    }

    resultPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [results.length])

  useEffect(() => {
    if (!isPreviewOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsPreviewOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPreviewOpen])

  useEffect(() => {
    return () => {
      for (const url of resultUrlRef.current) {
        URL.revokeObjectURL(url)
      }
    }
  }, [])

  function clearResults() {
    for (const url of resultUrlRef.current) {
      URL.revokeObjectURL(url)
    }

    resultUrlRef.current = []
    setResults([])
    setPreviewItem(null)
    setIsPreviewOpen(false)
    streamingCrypto.resetProgress()
  }

  function handleModeChange(nextMode: string) {
    const resolvedMode = nextMode as Mode

    if (resolvedMode === mode) {
      return
    }

    setMode(resolvedMode)
    setProgress(0)
    setProgressLabel(t('files.workspace.status.ready'))
    setStatus({
      tone: 'info',
      message: t(`files.workspace.status.mode.${resolvedMode}`),
    })
    setFiles([])
    clearResults()
  }

  function handleSelectedFiles(selectedFiles: FileList | File[] | null | undefined) {
    const nextFiles = Array.from(selectedFiles ?? [])

    if (nextFiles.length === 0) {
      return
    }

    const validFiles =
      activeFileLimit === null
        ? nextFiles
        : nextFiles.filter((selectedFile) => selectedFile.size <= activeFileLimit)
    const rejectedFiles =
      activeFileLimit === null
        ? []
        : nextFiles.filter((selectedFile) => selectedFile.size > activeFileLimit)

    if (validFiles.length === 0) {
      setFiles([])
      clearResults()
      setStatus({
        tone: 'error',
        message: t('files.workspace.status.allFilesTooLarge', {
          size: formatFileSize(FREE_FILE_SIZE_BYTES),
        }),
      })
      requestPremiumAccess({
        title: t('premium.communityLimitTitle'),
        description: t('premium.communityLimitDescription'),
      })
      return
    }

    setFiles(validFiles)
    setProgress(0)
    setProgressLabel(
      validFiles.length === 1
        ? t('files.workspace.status.filesReady_one')
        : t('files.workspace.status.filesReady_other'),
    )
    setStatus({
      tone: rejectedFiles.length > 0 ? 'error' : 'info',
      message:
        rejectedFiles.length > 0
          ? t('files.workspace.status.filesLoadedWithRejected', {
              valid: validFiles.length,
              rejected: rejectedFiles.length,
            })
          : t('files.workspace.status.filesLoaded', { count: validFiles.length }),
    })
    if (rejectedFiles.length > 0) {
      requestPremiumAccess({
        title: t('premium.communityLimitTitle'),
        description: t('premium.communityLimitDescription'),
      })
    }
    clearResults()
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleSelectedFiles(event.target.files)
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragging(false)
    handleSelectedFiles(event.dataTransfer.files)
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return
    }

    setIsDragging(false)
  }

  async function handleCopyKey() {
    if (!password) {
      setStatus({
        tone: 'error',
        message: t('files.workspace.status.copyNeedsPassword'),
      })
      return
    }

    if (!hasClipboardSupport) {
      setStatus({
        tone: 'error',
        message: t('files.workspace.status.clipboardUnavailable'),
      })
      return
    }

    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setStatus({
        tone: 'success',
        message: t('files.workspace.status.copied'),
      })
    } catch {
      setStatus({
        tone: 'error',
        message: t('files.workspace.status.clipboardDenied'),
      })
    }
  }

  function handleGenerateKey() {
    setPassword(generateWhatsappStyleKey())
    setCopied(false)
    setStatus({
      tone: 'info',
      message: t('files.workspace.status.keyGenerated'),
    })
  }

  function handleDownloadResult(result: ResultItem) {
    downloadBlobUrl(result.url, result.name)
  }

  function handleDownload() {
    const targetResult = previewItem ?? results[0] ?? null

    if (!targetResult) {
      return
    }

    handleDownloadResult(targetResult)
  }

  function handleDownloadAll() {
    if (results.length === 0) {
      return
    }

    results.forEach((result, index) => {
      window.setTimeout(() => {
        downloadBlobUrl(result.url, result.name)
      }, index * 120)
    })
  }

  function handleOpenPreview(result: ResultItem | null = results[0] ?? null) {
    if (!result || result.preview.kind === 'none') {
      return
    }

    setPreviewItem(result)
    setIsPreviewOpen(true)
  }

  function handleClosePreview() {
    setIsPreviewOpen(false)
    setPreviewItem(null)
  }

  async function handleProcess() {
    if (!canUseSecureProcessing) {
      setStatus({
        tone: 'error',
        message: t('files.workspace.status.secureContextRequired'),
      })
      return
    }

    if (files.length === 0 || !password) {
      setStatus({
        tone: 'error',
        message: t('files.workspace.status.missingFilesOrPassword'),
      })
      return
    }

    const oversizedFreeFiles = isPremium
      ? []
      : files.filter((selectedFile) => selectedFile.size > FREE_FILE_SIZE_BYTES)

    if (oversizedFreeFiles.length > 0) {
      setStatus({
        tone: 'error',
        message: t('files.workspace.status.fileTooLargeForCommunity', {
          size: formatFileSize(FREE_FILE_SIZE_BYTES),
        }),
      })
      requestPremiumAccess({
        title: t('premium.communityLimitTitle'),
        description: t('premium.communityLimitDescription'),
      })
      return
    }

    setIsProcessing(true)
    setProgress(4)
    setProgressLabel(t('files.workspace.status.preparingSecureEnvironment'))
    setStatus({
      tone: 'info',
      message: t(`files.workspace.status.processing.${mode}`),
    })
    clearResults()

    try {
      const processedResults: ResultItem[] = []
      const failures: string[] = []

      for (const [index, currentFile] of files.entries()) {
        const currentStep = index + 1

        try {
          const { blob, downloadName } = await streamingCrypto.processFile(
            mode,
            currentFile,
            password,
            (value, label) => {
              const startProgress = (index / files.length) * 100
              const endProgress = ((index + 1) / files.length) * 100
              const aggregateProgress = startProgress + ((endProgress - startProgress) * value) / 100

              setProgress(Math.round(aggregateProgress))
              setProgressLabel(
                files.length === 1
                  ? label
                  : t('files.workspace.status.fileStep', {
                      current: currentStep,
                      total: files.length,
                      label,
                    }),
              )
            },
            {
              maxFileSizeBytes: isPremium ? null : FREE_FILE_SIZE_BYTES,
              argon2MemoryMb:
                mode === 'encrypt' ? securityProfile.memoryMb : undefined,
              argon2Iterations:
                mode === 'encrypt' ? ARGON2_FILE_ITERATIONS : undefined,
            },
          )

          const nextUrl = URL.createObjectURL(blob)
          const nextPreview =
            mode === 'decrypt'
              ? getUniversalPreviewMetadata(blob.type)
              : ({ kind: 'none', label: t('common.file') } as PreviewMetadata)

          processedResults.push({
            id: `${downloadName}-${index}-${blob.size}`,
            name: downloadName,
            blob,
            url: nextUrl,
            size: blob.size,
            sourceName: currentFile.name,
            preview: nextPreview,
          })

          if (mode === 'encrypt') {
            downloadBlobUrl(nextUrl, downloadName)
          }
        } catch (error) {
          failures.push(
            `${currentFile.name}: ${
              error instanceof CriptoveuError
                ? error.message
                : t('files.workspace.status.unexpectedFileFailure')
            }`,
          )
          setProgress(Math.round(((index + 1) / files.length) * 100))
        }
      }

      resultUrlRef.current = processedResults.map((result) => result.url)
      setResults(processedResults)
      setPreviewItem(null)

      if (processedResults.length === 0) {
        setProgress(0)
        setProgressLabel(t('files.workspace.status.processingFailed'))
        setStatus({
          tone: 'error',
          message: failures[0] ?? t('files.workspace.status.noSuccessfulFiles'),
        })
        return
      }

      const previewableResults = processedResults.filter(
        (result) => result.preview.kind !== 'none',
      )

      setProgress(100)
      setProgressLabel(
        processedResults.length === 1
          ? t('files.workspace.status.processCompleted_one')
          : t('files.workspace.status.processCompleted_other', {
              count: processedResults.length,
            }),
      )
      setStatus({
        tone: failures.length > 0 ? 'error' : 'success',
        message:
          mode === 'encrypt'
            ? failures.length > 0
              ? t('files.workspace.status.encryptedWithFailures', {
                  processed: processedResults.length,
                  failures: failures.length,
                })
              : t('files.workspace.status.encryptedSuccess', {
                  count: processedResults.length,
                })
            : failures.length > 0
              ? t('files.workspace.status.decryptedWithFailures', {
                  processed: processedResults.length,
                  failures: failures.length,
                })
              : previewableResults.length > 0
                ? t('files.workspace.status.decryptedWithPreviews', {
                    processed: processedResults.length,
                    previews: previewableResults.length,
                  })
                : t('files.workspace.status.decryptedSuccess', {
                    count: processedResults.length,
                  }),
      })
    } catch (error) {
      setProgress(0)
      setProgressLabel(t('files.workspace.status.processingFailed'))
      setStatus({
        tone: 'error',
        message:
          error instanceof CriptoveuError
            ? error.message
            : t('files.workspace.status.unexpectedProcessingError'),
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const StatusIcon = isProcessing
    ? LoaderCircle
    : status.tone === 'success'
      ? CheckCircle2
      : status.tone === 'error'
        ? AlertCircle
        : Sparkles

  return (
    <>
      <div className="grid min-w-0 gap-5 overflow-hidden pb-28 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:pb-0">
        <section className="panel-surface min-w-0 rounded-[32px] p-5 sm:p-6">
          <div className="space-y-5">
            <SegmentedMode
              label={t('common.mode')}
              value={mode}
              onChange={handleModeChange}
              options={[
                {
                  value: 'encrypt',
                  label: t('files.workspace.tabs.encrypt'),
                  icon: <Lock className="h-4 w-4" />,
                },
                {
                  value: 'decrypt',
                  label: t('files.workspace.tabs.decrypt'),
                  icon: <Unlock className="h-4 w-4" />,
                },
              ]}
            />

            <div className="surface-primary rounded-[28px] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/80">
                    {t(`files.workspace.activeEyebrow.${mode}`)}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {t(currentMode.title)}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-zinc-300">
                    {t(currentMode.description)}
                  </p>
                </div>
                <div className="icon-chip p-3">
                  {mode === 'encrypt' ? <Lock className="h-6 w-6" /> : <Unlock className="h-6 w-6" />}
                </div>
              </div>
            </div>

            <div className="surface-technical rounded-[24px] p-4 text-sm leading-7 text-zinc-300">
              <p>{t('files.workspace.localCopy.primary')}</p>
              <p className="mt-2 text-zinc-400">{t('files.workspace.localCopy.secondary')}</p>
            </div>

            <label
              htmlFor={fileInputId}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`group relative flex cursor-pointer flex-col gap-4 rounded-[28px] border border-dashed p-5 transition sm:p-6 ${
                isDragging
                  ? 'border-cyan-300 bg-cyan-300/10'
                  : 'border-white/15 bg-white/[0.035] hover:border-cyan-400/40 hover:bg-white/[0.06]'
              }`}
            >
              <input
                id={fileInputId}
                type="file"
                className="hidden"
                multiple
                accept={mode === 'decrypt' ? '.criptoveu,.cryptify' : undefined}
                onChange={handleFileInputChange}
              />

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="icon-chip p-3 transition group-hover:scale-105">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-white">
                      {t('files.workspace.upload.dropTitle')}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">{t(currentMode.hint)}</p>
                  </div>
                </div>

                <span className="btn-secondary">
                  {t('files.workspace.upload.choose')}
                </span>
              </div>

              <div className="surface-technical rounded-2xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-zinc-100">
                      <FileArchive className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                        {t('files.workspace.upload.selectedTitle')}
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {files.length > 0
                          ? files.length === 1
                            ? t('files.workspace.upload.filesReady_one')
                            : t('files.workspace.upload.filesReady_other')
                          : t('files.workspace.upload.noFiles')}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {t('files.workspace.upload.planLimit', { limit: fileLimitLabel })}
                      </p>

                      {files.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {files.slice(0, 4).map((selectedFile) => (
                            <div
                              key={`${selectedFile.name}-${selectedFile.size}-${selectedFile.lastModified}`}
                              className="flex items-center justify-between gap-3 text-xs text-zinc-400"
                            >
                              <span className="truncate">{selectedFile.name}</span>
                              <span className="shrink-0 font-mono uppercase tracking-[0.2em] text-zinc-500">
                                {formatFileSize(selectedFile.size)}
                              </span>
                            </div>
                          ))}

                          {files.length > 4 ? (
                            <p className="text-xs text-zinc-500">
                              {t('files.workspace.upload.additionalFiles', {
                                count: files.length - 4,
                              })}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <p className="shrink-0 font-mono text-xs uppercase tracking-[0.2em] text-zinc-400">
                    {files.length > 0 ? formatFileSize(totalSelectedSize) : '0 B'}
                  </p>
                </div>
              </div>
            </label>

            <div className="surface-primary rounded-[28px] p-5">
              <FieldBlock
                label={t('files.workspace.password.label')}
                htmlFor={passwordInputId}
                helper={t('files.workspace.password.helper')}
              >
                <div className="space-y-3">
                  <input
                    id={passwordInputId}
                    type="password"
                    value={password}
                    autoComplete="new-password"
                    spellCheck={false}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      mode === 'encrypt'
                        ? t('files.workspace.password.encryptPlaceholder')
                        : t('files.workspace.password.decryptPlaceholder')
                    }
                    className="tool-input w-full"
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleGenerateKey}
                      disabled={isProcessing}
                      className="btn-accent"
                    >
                      <Sparkles className="h-4 w-4" />
                      {t('files.workspace.password.generate')}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyKey}
                      disabled={!password || isProcessing || !hasClipboardSupport}
                      className="btn-secondary"
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? t('common.copied') : t('files.workspace.password.copy')}
                    </button>
                  </div>

                  <p className="text-xs leading-6 text-zinc-500">
                    {t('files.workspace.password.reuseHint')}
                  </p>
                </div>
              </FieldBlock>

              <div className="mt-5 surface-technical rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-zinc-300">{t('files.workspace.password.strength')}</span>
                  <span className={strength.textClass}>{strength.label}</span>
                </div>

                <div className="mt-3 grid grid-cols-5 gap-2">
                  {STRENGTH_SLOTS.map((slot) => (
                    <span
                      key={slot}
                      className={`h-2 rounded-full transition ${
                        slot <= strength.level ? strength.barClass : 'bg-zinc-800'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {mode === 'encrypt' ? (
              <AdvancedOptions
                title={t('files.workspace.advanced.title')}
                helper={t('files.workspace.advanced.helper', {
                  memory: securityProfile.memoryMb,
                  iterations: ARGON2_FILE_ITERATIONS,
                })}
              >
                <fieldset className="space-y-3">
                  <legend className="sr-only">{t('files.workspace.advanced.legend')}</legend>

                  {FILE_SECURITY_PROFILES.map((profile) => (
                    <label
                      key={profile.id}
                      className={`block cursor-pointer rounded-2xl border p-4 transition ${
                        securityProfileId === profile.id
                          ? 'border-cyan-400/45 bg-cyan-400/10'
                          : 'border-white/10 bg-white/[0.025] hover:border-white/20'
                      }`}
                    >
                      <span className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="file-security-profile"
                          value={profile.id}
                          checked={securityProfileId === profile.id}
                          disabled={isProcessing}
                          onChange={() => setSecurityProfileId(profile.id)}
                          className="mt-1 accent-cyan-400"
                        />

                        <span>
                          <span className="block text-sm font-medium text-white">
                            {t(`files.workspace.securityProfiles.${profile.id}.label`)}
                          </span>
                          <span className="mt-1 block font-mono text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                            {profile.memoryMb} MB RAM
                          </span>
                          <span className="mt-2 block text-xs leading-6 text-zinc-400">
                            {t(`files.workspace.securityProfiles.${profile.id}.description`)}
                          </span>
                        </span>
                      </span>
                    </label>
                  ))}

                  <p className="pt-2 text-xs leading-6 text-zinc-500">
                    {t('files.workspace.advanced.note')}
                  </p>
                </fieldset>
              </AdvancedOptions>
            ) : null}

            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={files.length === 0 || !password || isProcessing || !canUseSecureProcessing}
                  className="btn-primary hidden lg:inline-flex"
                >
                  {isProcessing ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : mode === 'encrypt' ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Unlock className="h-4 w-4" />
                  )}
                  {t(currentMode.action)}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadAll}
                  disabled={results.length === 0}
                  className="btn-secondary"
                >
                  <Download className="h-4 w-4" />
                  {t('common.downloadAll')}
                </button>
              </div>

              <div className="flex flex-col gap-2 text-xs leading-6 text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                <p>{t('files.workspace.password.keepPassword')}</p>
                <p>
                  {results.length === 0
                    ? t('files.workspace.results.downloadAllDisabledHint')
                    : t('files.workspace.results.downloadAllHint')}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="min-w-0 space-y-5 overflow-hidden">
          <section className="surface-secondary min-w-0 rounded-[28px] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
                  {t('files.workspace.quickGuide.eyebrow')}
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {t('files.workspace.quickGuide.title')}
                </p>
              </div>
              <div className="icon-chip p-2">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {quickFacts.map((item) => (
                <div key={item.label} className="surface-technical rounded-[20px] p-3.5">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">{item.label}</p>
                  <p className="mt-2 text-sm font-medium text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="surface-primary min-w-0 overflow-hidden rounded-[28px] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-zinc-300">{t('files.workspace.progress.title')}</span>
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-400">
                {progress}%
              </span>
            </div>

            <progress
              className="criptoveu-progress mt-3"
              value={progress}
              max={100}
              aria-label={t('files.workspace.progress.aria')}
            />

            <p className="mt-3 text-xs uppercase tracking-[0.28em] text-zinc-500">{progressLabel}</p>

            <div
              role="status"
              aria-live="polite"
              className={`mt-5 rounded-[24px] border p-4 text-sm ${STATUS_STYLES[status.tone]}`}
            >
              <div className="flex items-start gap-3">
                <StatusIcon className={`mt-0.5 h-5 w-5 shrink-0 ${isProcessing ? 'animate-spin' : ''}`} />
                <p className="leading-6">{status.message}</p>
              </div>
            </div>

            {!canUseSecureProcessing ? (
              <div className="mt-4 rounded-[24px] border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-100">
                {t('files.workspace.status.secureContextShort')}
              </div>
            ) : null}
          </section>
          <div ref={resultPanelRef} className="min-w-0 overflow-hidden">
            <ResultPanel
            title={t('files.workspace.results.title')}
            description={t('files.workspace.results.description')}
            actions={
              results.length > 1 ? (
                <button
                  type="button"
                  onClick={handleDownloadAll}
                  className="btn-secondary w-full sm:w-auto"
                >
                  <Download className="h-4 w-4" />
                  {t('common.downloadAll')}
                </button>
              ) : null
            }
          >
            {results.length === 0 ? (
              <div className="surface-secondary rounded-[24px] p-5 text-sm leading-7 text-zinc-400">
                {t('files.workspace.results.empty')}
              </div>
            ) : null}

            {results.length > 0 ? (
              <div
                className="min-w-0 space-y-4 overflow-hidden transition duration-300"
                style={{ filter: isInactive ? 'blur(15px)' : 'none' }}
              >
                {results.map((result) => (
                  <article
                    key={result.id}
                    className="surface-technical min-w-0 overflow-hidden rounded-[24px] p-4"
                  >
                    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="break-words text-xs uppercase tracking-[0.2em] text-zinc-500 sm:tracking-[0.28em]">
                          {mode === 'encrypt'
                            ? t('files.workspace.results.packageGenerated')
                            : result.preview.kind !== 'none'
                              ? t('files.workspace.results.readyToReview', {
                                  label: t(`files.previewKinds.${result.preview.kind}`),
                                })
                              : t('files.workspace.results.fileReady')}
                        </p>
                        <p className="mt-2 break-words text-sm font-semibold text-white">{result.name}</p>
                        <p className="mt-1 break-words text-xs text-zinc-400">
                          {t('files.workspace.results.source', { name: result.sourceName })}
                        </p>
                      </div>

                      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-none lg:auto-cols-max lg:grid-flow-col">
                        {mode === 'decrypt' && result.preview.kind !== 'none' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(result)}
                            className="btn-secondary w-full"
                          >
                            <Maximize2 className="h-4 w-4" />
                            {t('common.preview')}
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleDownloadResult(result)}
                          className="btn-secondary w-full"
                        >
                          <Download className="h-4 w-4" />
                          {t('common.download')}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex min-w-0 flex-col gap-2 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                      <span>{formatFileSize(result.size)}</span>
                      {mode === 'decrypt' && result.preview.kind !== 'none' ? (
                        <span>{t('files.workspace.results.localPreview')}</span>
                      ) : null}
                    </div>

                    {mode === 'decrypt' && result.preview.kind !== 'none' ? (
                      <div className="mt-4 surface-primary min-w-0 overflow-hidden rounded-[24px] p-3 sm:p-4">
                        <UniversalPreview
                          url={result.url}
                          blob={result.blob}
                          fileName={result.name}
                          isInactive={isInactive}
                          onOpen={() => handleOpenPreview(result)}
                          onDownload={() => handleDownloadResult(result)}
                        />
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : null}
            </ResultPanel>
          </div>
        </div>
      </div>

      <MobileStickyCTA
        label={t(currentMode.action)}
        icon={mode === 'encrypt' ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
        onClick={handleProcess}
        disabled={files.length === 0 || !password || isProcessing || !canUseSecureProcessing}
        loading={isProcessing}
      />

      {isPreviewOpen && activePreviewItem && resultUrl && preview.kind !== 'none' ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={t('files.workspace.preview.expandedAria')}
        >
          <button
            type="button"
            onClick={handleClosePreview}
            className="absolute inset-0"
            aria-label={t('files.workspace.preview.closeExpandedAria')}
          />

          <div className="relative z-10 w-full max-w-6xl rounded-[32px] border border-white/10 bg-zinc-950/95 p-4 shadow-2xl shadow-black/40 sm:p-6">
            <UniversalPreview
              url={activePreviewItem.url}
              blob={activePreviewItem.blob}
              fileName={resultName}
              expanded
              isInactive={isInactive}
              onClose={handleClosePreview}
              onDownload={handleDownload}
            />
          </div>
        </div>
      ) : null}
    </>
  )
}












