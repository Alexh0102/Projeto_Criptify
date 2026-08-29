import {
  getPreviewKind,
  MAX_AUTO_PREVIEW_SIZE_BYTES,
  MAX_TEXT_PREVIEW_SIZE_BYTES,
  resolvePreviewMimeType,
} from '../../lib/file-preview'

export { getPreviewKind, MAX_AUTO_PREVIEW_SIZE_BYTES, MAX_TEXT_PREVIEW_SIZE_BYTES, resolvePreviewMimeType }

export type PreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'none'

export type PreviewMetadata = {
  kind: PreviewKind
  label: string
  reason?: 'unsupported' | 'too-large'
}

export function getUniversalPreviewMetadata(
  mimeType: string,
  fileName = '',
  size = 0,
): PreviewMetadata {
  const resolvedMimeType = resolvePreviewMimeType(fileName, mimeType)
  const kind = getPreviewKind(fileName, resolvedMimeType, size)
  const baseKind = getPreviewKind(fileName, resolvedMimeType, 0)
  const labels: Record<Exclude<PreviewKind, 'none'>, string> = {
    image: 'Imagem',
    video: 'Vídeo',
    audio: 'Áudio',
    pdf: 'PDF',
    text: 'Texto',
  }

  if (kind === 'unsupported') {
    return {
      kind: 'none',
      label: baseKind === 'unsupported' ? 'Arquivo' : labels[baseKind],
      reason: baseKind === 'unsupported' ? 'unsupported' : 'too-large',
    }
  }

  return { kind, label: labels[kind] }
}
