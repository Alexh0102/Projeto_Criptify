import {
  AlertTriangle,
  Download,
  ExternalLink,
  FastForward,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  Maximize2,
  Pause,
  Play,
  Rewind,
  Share2,
  ShieldOff,
  Video,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, MouseEvent, SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'

import {
  getUniversalPreviewMetadata,
  isMobilePreviewEnvironment,
} from './preview-metadata'

type UniversalPreviewProps = {
  url: string
  blob: Blob
  fileName: string
  expanded?: boolean
  isInactive?: boolean
  onOpen?: () => void
  onClose?: () => void
  onDownload?: (event: MouseEvent<HTMLButtonElement>) => void
  onShare?: (event: MouseEvent<HTMLButtonElement>) => void
  onOpenExternal?: (event: MouseEvent<HTMLButtonElement>) => void
  previewUrlRevoked?: boolean
}

const VIDEO_PLAYBACK_RATES = [0.5, 1, 1.25, 1.5, 2] as const

function formatMediaTime(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return '00:00'
  }

  const totalSeconds = Math.floor(value)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60)
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
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
  onShare,
  onOpenExternal,
  previewUrlRevoked = false,
}: UniversalPreviewProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [textContent, setTextContent] = useState('')
  const [imageFailed, setImageFailed] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [videoCurrentTime, setVideoCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const metadata = getUniversalPreviewMetadata(blob.type, fileName, blob.size)
  const canExpand = !expanded && metadata.kind !== 'none'
  const previewKindLabel = t(`files.previewKinds.${metadata.kind}`)

  useEffect(() => {
    setImageFailed(false)
  }, [blob, url])

  useEffect(() => {
    setVideoReady(false)
    setVideoError(false)
    setVideoPlaying(false)
    setVideoCurrentTime(0)
    setVideoDuration(0)
    setPlaybackRate(1)
  }, [blob, url, metadata.kind])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  useEffect(() => {
    if (
      metadata.kind !== 'video' ||
      isInactive ||
      isMobilePreviewEnvironment()
    ) {
      return
    }

    function handleKeyboardShortcut(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      const video = videoRef.current
      if (!video) {
        return
      }

      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault()
        if (video.paused) {
          void video.play().catch(() => setVideoError(true))
        } else {
          video.pause()
        }
        return
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        const direction = event.key === 'ArrowLeft' ? -1 : 1
        const duration = Number.isFinite(video.duration) ? video.duration : 0
        video.currentTime = Math.min(
          duration,
          Math.max(0, video.currentTime + direction * 10),
        )
        setVideoCurrentTime(video.currentTime)
        return
      }

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        if (document.fullscreenElement) {
          void document.exitFullscreen()
        } else if (typeof video.requestFullscreen === 'function') {
          void video.requestFullscreen()
        }
      }
    }

    window.addEventListener('keydown', handleKeyboardShortcut)

    return () => window.removeEventListener('keydown', handleKeyboardShortcut)
  }, [isInactive, metadata.kind])

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

  useEffect(() => {
    const container = containerRef.current

    return () => {
      const mediaElements = container?.querySelectorAll('video, audio') ?? []

      for (const mediaElement of mediaElements) {
        if (!(mediaElement instanceof HTMLMediaElement)) {
          continue
        }

        mediaElement.pause()
        mediaElement.removeAttribute('src')
        mediaElement.load()
      }
    }
  }, [url])

  function renderPreview() {
    if (metadata.kind === 'image') {
      if (imageFailed) {
        return (
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-5 text-sm leading-7 text-amber-50">
            {t('files.preview.imageRenderFailed')}
          </div>
        )
      }

      if (!url || blob.size === 0) {
        return (
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-5 text-sm leading-7 text-amber-50">
            {t('files.preview.imageRenderFailed')}
          </div>
        )
      }

      return (
        <img
          src={url}
          alt={t('files.preview.imageAlt', { fileName })}
          onLoad={(event) => {
            if (import.meta.env.DEV) {
              console.debug('[CriptoVéu][preview-loaded]', {
                fileName,
                previewUrl: url,
                naturalWidth: event.currentTarget.naturalWidth,
                naturalHeight: event.currentTarget.naturalHeight,
              })
            }
          }}
          onError={(event) => {
            if (import.meta.env.DEV) {
              console.error('[CriptoVéu][preview-error]', {
                fileName,
                currentSrc: event.currentTarget.currentSrc,
                previewBlobSize: blob.size,
                previewBlobType: blob.type,
                previewUrlIsBlob: url.startsWith('blob:'),
                previewUrlRevoked,
                cause: event.nativeEvent.type,
              })
            }
            setImageFailed(true)
          }}
          className={`block h-auto w-auto max-w-full rounded-2xl object-contain ${
            expanded ? 'max-h-[76vh]' : 'max-h-[65dvh]'
          }`}
        />
      )
    }

    if (metadata.kind === 'video') {
      function handleVideoLoaded(event: SyntheticEvent<HTMLVideoElement>) {
        const duration = event.currentTarget.duration
        setVideoDuration(Number.isFinite(duration) ? duration : 0)
        setVideoReady(true)
      }

      function handleVideoTimeUpdate(
        event: SyntheticEvent<HTMLVideoElement>,
      ) {
        setVideoCurrentTime(event.currentTarget.currentTime)
      }

      function handleVideoSeek(event: ChangeEvent<HTMLInputElement>) {
        const nextTime = Number(event.target.value)
        const video = videoRef.current

        if (!video || !Number.isFinite(nextTime)) {
          return
        }

        video.currentTime = Math.min(
          Number.isFinite(video.duration) ? video.duration : nextTime,
          Math.max(0, nextTime),
        )
        setVideoCurrentTime(video.currentTime)
      }

      function handleVideoSkip(seconds: number) {
        const video = videoRef.current

        if (!video) {
          return
        }

        const duration = Number.isFinite(video.duration) ? video.duration : 0
        video.currentTime = Math.min(
          duration,
          Math.max(0, video.currentTime + seconds),
        )
        setVideoCurrentTime(video.currentTime)
      }

      function handleVideoPlayPause() {
        const video = videoRef.current

        if (!video) {
          return
        }

        if (video.paused) {
          void video.play().catch(() => setVideoError(true))
        } else {
          video.pause()
        }
      }

      function handleVideoFullscreen() {
        const video = videoRef.current

        if (document.fullscreenElement) {
          void document.exitFullscreen()
        } else if (video && typeof video.requestFullscreen === 'function') {
          void video.requestFullscreen()
        }
      }

      return (
        <div className="space-y-3">
          {!videoReady && !videoError ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm leading-6 text-cyan-50"
            >
              {t('files.preview.largeFileNotice')}
            </div>
          ) : null}
          {videoError ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-5 text-sm leading-7 text-amber-50"
            >
              <AlertTriangle className="mt-1 h-5 w-5 shrink-0" />
              <p>{t('files.preview.unsupportedCodec')}</p>
            </div>
          ) : (
            <>
              <div className="relative overflow-hidden rounded-2xl bg-black">
                <video
                  ref={videoRef}
                  src={url}
                  controls
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={handleVideoLoaded}
                  onCanPlay={() => setVideoReady(true)}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onPlay={() => setVideoPlaying(true)}
                  onPause={() => setVideoPlaying(false)}
                  onError={() => {
                    setVideoReady(false)
                    setVideoError(true)
                  }}
                  className={`w-full ${
                    expanded ? 'max-h-[76vh]' : 'max-h-[420px]'
                  }`}
                  aria-label={t('files.preview.videoAria', { fileName })}
                >
                  <track kind="captions" label={t('files.preview.noCaptions')} />
                </video>
                {!videoReady ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-zinc-950/85 px-4 py-3 text-sm text-zinc-100">
                      <LoaderCircle className="h-5 w-5 animate-spin text-cyan-300" />
                      {t('files.preview.loading')}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                <label htmlFor="preview-video-timeline" className="sr-only">
                  {t('files.preview.timeline')}
                </label>
                <input
                  id="preview-video-timeline"
                  type="range"
                  min="0"
                  max={videoDuration || 1}
                  step="0.1"
                  value={Math.min(videoCurrentTime, videoDuration || 1)}
                  disabled={!videoReady || videoDuration <= 0}
                  onChange={handleVideoSeek}
                  className="w-full accent-cyan-400"
                  aria-label={t('files.preview.timeline')}
                />
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-zinc-400">
                  <span>
                    {formatMediaTime(videoCurrentTime)} /{' '}
                    {formatMediaTime(videoDuration)}
                  </span>
                  <label className="flex items-center gap-2">
                    <span>{t('files.preview.speed')}</span>
                    <select
                      value={playbackRate}
                      onChange={(event) =>
                        setPlaybackRate(Number(event.target.value))
                      }
                      className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-white"
                      aria-label={t('files.preview.speed')}
                    >
                      {VIDEO_PLAYBACK_RATES.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate === 1 ? '1.0' : rate}x
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleVideoPlayPause}
                    disabled={!videoReady}
                    className="btn-secondary"
                    aria-label={
                      videoPlaying
                        ? t('files.preview.pause')
                        : t('files.preview.play')
                    }
                  >
                    {videoPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {videoPlaying
                      ? t('files.preview.pause')
                      : t('files.preview.play')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVideoSkip(-10)}
                    disabled={!videoReady}
                    className="btn-secondary"
                  >
                    <Rewind className="h-4 w-4" />
                    {t('files.preview.rewind10')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVideoSkip(10)}
                    disabled={!videoReady}
                    className="btn-secondary"
                  >
                    <FastForward className="h-4 w-4" />
                    {t('files.preview.forward10')}
                  </button>
                  <button
                    type="button"
                    onClick={handleVideoFullscreen}
                    disabled={!videoReady}
                    className="btn-secondary"
                  >
                    <Maximize2 className="h-4 w-4" />
                    {t('files.preview.fullscreen')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
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

  function handleDownloadClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    onDownload?.(event)
  }

  function handleShareClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    onShare?.(event)
  }

  function handleOpenExternalClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    onOpenExternal?.(event)
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
            <button type="button" onClick={handleDownloadClick} className="btn-secondary w-full">
              <Download className="h-4 w-4" />
              {t('common.download')}
            </button>
          ) : null}

          {onShare ? (
            <button type="button" onClick={handleShareClick} className="btn-secondary w-full">
              <Share2 className="h-4 w-4" />
              {t('files.workspace.results.share')}
            </button>
          ) : null}

          {onOpenExternal ? (
            <button type="button" onClick={handleOpenExternalClick} className="btn-secondary w-full">
              <ExternalLink className="h-4 w-4" />
              {t('files.workspace.results.openExternal')}
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
