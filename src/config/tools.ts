export type ToolDefinition = {
  id: 'files' | 'qr' | 'link' | 'steganography' | 'notes'
  path:
    | '/arquivos'
    | '/qr-secreto'
    | '/link-secreto'
    | '/esteganografia'
    | '/veu-notes'
}

export type BetaResourceDefinition = {
  id: 'diagnostics'
  path: '/diagnostico-navegador'
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
]

export const betaResourceDefinitions: BetaResourceDefinition[] = [
  {
    id: 'diagnostics',
    path: '/diagnostico-navegador',
  },
]
