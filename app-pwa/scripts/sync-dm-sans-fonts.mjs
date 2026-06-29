/**
 * Copy self-hosted DM Sans WOFF2 subsets from @fontsource-variable/dm-sans into public/fonts/.
 * Latin-ext is required for Slovak (Š, Č, Ž, Ť, Ľ, …).
 */
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'node_modules/@fontsource-variable/dm-sans/files')
const destDir = join(root, 'public/fonts')

const files = [
  'dm-sans-latin-wght-normal.woff2',
  'dm-sans-latin-ext-wght-normal.woff2',
]

mkdirSync(destDir, { recursive: true })
for (const name of files) {
  copyFileSync(join(srcDir, name), join(destDir, name))
}

console.log(`Synced ${files.length} DM Sans WOFF2 files → public/fonts/`)
