import { readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import JavaScriptObfuscator from 'javascript-obfuscator'

const scriptDir = fileURLToPath(new URL('.', import.meta.url))
const assetsDir = resolve(scriptDir, '..', 'dist', 'assets')

const OBFUSCATION_OPTIONS = {
  compact: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  rotateStringArray: true,
  selfDefending: false,
  splitStrings: true,
  splitStringsChunkLength: 8,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayThreshold: 0.75,
  target: 'browser',
  transformObjectKeys: true,
}

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectJavaScriptFiles(entryPath)))
      continue
    }

    if (extname(entry.name) === '.js') {
      files.push(entryPath)
    }
  }

  return files
}

async function main() {
  const files = await collectJavaScriptFiles(assetsDir)

  if (files.length === 0) {
    throw new Error('Nenhum arquivo JavaScript encontrado em dist/assets para ofuscacao.')
  }

  for (const filePath of files) {
    const source = await readFile(filePath, 'utf8')
    const result = JavaScriptObfuscator.obfuscate(source, OBFUSCATION_OPTIONS)
    await writeFile(filePath, result.getObfuscatedCode(), 'utf8')
    process.stdout.write(`[obfuscate] ${basename(filePath)}\n`)
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
