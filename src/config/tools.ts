export type ToolDefinition = {
  id: 'files' | 'qr' | 'link' | 'steganography' | 'notes' | 'diagnostics'
  path:
    | '/arquivos'
    | '/qr-secreto'
    | '/link-secreto'
    | '/esteganografia'
    | '/veu-notes'
    | '/diagnostico-navegador'
}

export const toolDefinitions: ToolDefinition[] = [
  {
    id: 'files',
    path: '/arquivos',
  },
  {
    id: 'qr',
    path: '/qr-secreto',
  },
  {
    id: 'link',
    path: '/link-secreto',
  },
  {
    id: 'steganography',
    path: '/esteganografia',
  },
  {
    id: 'notes',
    path: '/veu-notes',
  },
  {
    id: 'diagnostics',
    path: '/diagnostico-navegador',
  },
]
