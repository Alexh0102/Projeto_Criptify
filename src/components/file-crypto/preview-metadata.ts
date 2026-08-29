export type PreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'none'

export type PreviewMetadata = {
  kind: PreviewKind
  label: string
  reason?: 'unsupported' | 'too-large'
}

export const MAX_AUTO_PREVIEW_SIZE_BYTES = 100 * 1024 * 1024
export const MAX_TEXT_PREVIEW_SIZE_BYTES = 5 * 1024 * 1024

export function getPreviewKind(
  _fileName: string,
  mimeType: string,
  size: number,
): PreviewKind {
  const kind = getUniversalPreviewMetadata(mimeType).kind

  if (
    kind === 'none' ||
    size > MAX_AUTO_PREVIEW_SIZE_BYTES ||
    (kind === 'text' && size > MAX_TEXT_PREVIEW_SIZE_BYTES)
  ) {
    return 'none'
  }

  return kind
}

export function getUniversalPreviewMetadata(
  mimeType: string,
  _fileName = '',
  size = 0,
): PreviewMetadata {
  void _fileName
  const preview = mimeType.startsWith('image/')
    ? { kind: 'image' as const, label: 'Imagem' }
    : mimeType.startsWith('video/')
      ? { kind: 'video' as const, label: 'Vídeo' }
      : mimeType.startsWith('audio/')
        ? { kind: 'audio' as const, label: 'Áudio' }
        : mimeType === 'application/pdf'
          ? { kind: 'pdf' as const, label: 'PDF' }
          : mimeType === 'text/plain' || mimeType === 'text/markdown'
            ? { kind: 'text' as const, label: 'Texto' }
            : { kind: 'none' as const, label: 'Arquivo', reason: 'unsupported' as const }

  if (preview.kind === 'none') {
    return preview
  }

  if (
    size > MAX_AUTO_PREVIEW_SIZE_BYTES ||
    (preview.kind === 'text' && size > MAX_TEXT_PREVIEW_SIZE_BYTES)
  ) {
    return { kind: 'none', label: preview.label, reason: 'too-large' }
  }

  return preview
}
