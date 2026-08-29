import {
  Download,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Pause,
  ShieldOff,
  Video,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getUniversalPreviewMetadata } from './preview-metadata'

type UniversalPreviewProps = {
  url: string
  blob: Blob
  fileName: string
  expanded?: boolean
  isInactive?: boolean
  onOpen?: () => void
  onClose?: () => void
  onDownload?: () => void
}

export default function UniversalPreview({
  url,
  blob,
  fileName,
  expanded = false,
  isInactive = false,
  onOpen,
  onClose,
  onDownload,
}: UniversalPreviewProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [textContent, setTextContent] = useState('')
  const metadata = getUniversalPreviewMetadata(blob.type, fileName, blob.size)
  const canExpand = !expanded && metadata.kind !== 'none'
  const previewKindLabel = t(`files.previewKinds.${metadata.kind}`)

  useEffect(() => {
    if (metadata.kind !== 'text') {
      return
    }

    let isMounted = true

    blob.text().then((content) => {
      if (isMounted) {
        setTextContent(
          content.length > 100_000
            ? `${content.slice(0, 100_000)}\n\n[Preview truncated for safety]`
            : content,
        )
      }
    })

    return () => {
      isMounted = false
    }
  }, [blob, metadata.kind])

  useEffect(() => {
    if (!isInactive) {
      return
    }

    const mediaElements = containerRef.current?.querySelectorAll('video, audio') ?? []

    for (const mediaElement of mediaElements) {
      if (!(mediaElement instanceof HTMLMediaElement)) {
        continue
      }

      mediaElement.pause()
    }
  }, [isInactive])

  function renderPreview() {
    if (metadata.kind === 'image') {
      return (
        <img
          src={url}
          alt={t('files.preview.imageAlt', { fileName })}
          className={`w-full rounded-2xl object-contain ${
            expanded ? 'max-h-[76vh]' : 'max-h-[420px]'
          }`}
        />
      )
    }

    if (metadata.kind === 'video') {
      return (
        <video
          src={url}
          controls
          playsInline
          className={`w-full rounded-2xl bg-black ${
            expanded ? 'max-h-[76vh]' : 'max-h-[420px]'
          }`}
          aria-label={t('files.preview.videoAria', { fileName })}
        >
          <track kind="captions" label={t('files.preview.noCaptions')} />
        </video>
      )
    }

    if (metadata.kind === 'audio') {
      return (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <audio
            src={url}
            controls
            className="w-full"
            aria-label={t('files.preview.audioAria', { fileName })}
          />
        </div>
      )
    }

    if (metadata.kind === 'pdf') {
      return (
        <iframe
          src={url}
          title={t('files.preview.pdfTitle', { fileName })}
          sandbox=""
          className={`w-full rounded-2xl border border-white/10 bg-white ${
            expanded ? 'h-[76vh]' : 'h-[420px]'
          }`}
        />
      )
    }

    if (metadata.kind === 'text') {
      return (
        <pre
          className={`overflow-auto rounded-2xl border border-white/10 bg-black/50 p-4 text-left text-sm leading-7 text-zinc-100 ${
            expanded ? 'max-h-[76vh]' : 'max-h-[420px]'
          }`}
        >
          {textContent}
        </pre>
      )
    }

    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-zinc-400">
        {t('files.preview.unsupported')}
      </div>
    )
  }

  const PreviewIcon =
    metadata.kind === 'image'
      ? ImageIcon
      : metadata.kind === 'video' || metadata.kind === 'audio'
        ? Video
        : metadata.kind === 'text' || metadata.kind === 'pdf'
          ? FileText
          : ShieldOff
  const previewContainerClassName = `surface-technical min-w-0 overflow-hidden rounded-[24px] p-3 transition duration-300 sm:p-4 ${
    isInactive ? 'cv-privacy-blur' : ''
  }`

  return (
    <div ref={containerRef} className="min-w-0 space-y-4 overflow-hidden">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="icon-chip p-2">
            <PreviewIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="break-words text-xs uppercase tracking-[0.18em] text-cyan-100/80 sm:tracking-[0.28em]">
              {t('files.preview.safePreview', { label: previewKindLabel })}
            </p>
            <p className="mt-2 break-words text-sm font-semibold text-white">{fileName}</p>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 sm:w-auto sm:grid-flow-col sm:auto-cols-max">
          {canExpand ? (
            <button type="button" onClick={onOpen} className="btn-secondary w-full">
              <Maximize2 className="h-4 w-4" />
              {t('common.expand')}
            </button>
          ) : null}

          {onDownload ? (
            <button type="button" onClick={onDownload} className="btn-secondary w-full">
              <Download className="h-4 w-4" />
              {t('common.download')}
            </button>
          ) : null}

          {onClose ? (
            <button type="button" onClick={onClose} className="btn-secondary w-full">
              <X className="h-4 w-4" />
              {t('common.close')}
            </button>
          ) : null}
        </div>
      </div>

      {isInactive ? (
        <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-50">
          <Pause className="h-4 w-4" />
          {t('files.preview.hiddenByInactivity')}
        </div>
      ) : null}

      <p className="text-xs leading-6 text-zinc-500">{t('files.preview.localPreviewNote')}</p>

      {isInactive ? (
        <div className={previewContainerClassName} aria-hidden="true">
          {renderPreview()}
        </div>
      ) : (
        <div className={previewContainerClassName}>{renderPreview()}</div>
      )}
    </div>
  )
}
