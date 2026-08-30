export const MAX_AUTO_PREVIEW_SIZE_BYTES = 100 * 1024 * 1024
export const MAX_NATIVE_PREVIEW_SIZE_BYTES = 50 * 1024 * 1024
export const MAX_TEXT_PREVIEW_SIZE_BYTES = 5 * 1024 * 1024

const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  txt: 'text/plain',
  json: 'application/json',
  csv: 'text/csv',
  md: 'text/markdown',
}

export function resolvePreviewMimeType(
  fileName: string,
  manifestMimeType?: string,
): string {
  const declared = manifestMimeType?.trim().toLowerCase()
  if (declared && declared !== 'application/octet-stream') {
    return declared === 'image/jpg' ? 'image/jpeg' : declared
  }

  const extension = fileName.split('.').pop()?.toLowerCase()
  return (extension && MIME_BY_EXTENSION[extension]) || 'application/octet-stream'
}

export type FilePreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'unsupported'

export function getPreviewKind(
  fileName: string,
  resolvedMimeType: string,
  size: number,
  maxPreviewSizeBytes = MAX_AUTO_PREVIEW_SIZE_BYTES,
): FilePreviewKind {
  const mimeType = resolvePreviewMimeType(fileName, resolvedMimeType)
  const kind = mimeType.startsWith('image/')
    ? 'image'
    : mimeType.startsWith('video/')
      ? 'video'
      : mimeType.startsWith('audio/')
        ? 'audio'
        : mimeType === 'application/pdf'
          ? 'pdf'
          : mimeType === 'text/plain' ||
              mimeType === 'text/markdown' ||
              mimeType === 'application/json' ||
              mimeType === 'text/csv'
            ? 'text'
            : 'unsupported'

  if (
    kind === 'unsupported' ||
    size > maxPreviewSizeBytes ||
    (kind === 'text' && size > MAX_TEXT_PREVIEW_SIZE_BYTES)
  ) {
    return 'unsupported'
  }

  return kind
}
