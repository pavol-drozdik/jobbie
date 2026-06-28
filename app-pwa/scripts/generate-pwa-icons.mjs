/**
 * Generates PNG PWA / touch icons from public/favicon.svg.
 * Run from repo root: node app-pwa/scripts/generate-pwa-icons.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const publicDir = join(scriptDir, '..', 'public')
const faviconPath = join(publicDir, 'favicon.svg')

const require = createRequire(import.meta.url)
const sharpPath = join(scriptDir, '..', '..', 'backend-ts', 'node_modules', 'sharp')
if (!existsSync(sharpPath)) {
  console.error('sharp not found — run npm install in backend-ts first')
  process.exit(1)
}
const sharp = require(sharpPath)

const svg = readFileSync(faviconPath)

const outputs = [
  { file: 'favicon-48.png', size: 48 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

for (const { file, size } of outputs) {
  const outPath = join(publicDir, file)
  await sharp(svg).resize(size, size).png().toFile(outPath)
  console.info(`Wrote ${outPath}`)
}

// Google Search and legacy browsers probe /favicon.ico — serve 48×48 PNG bytes (valid ICO substitute).
const faviconIcoPath = join(publicDir, 'favicon.ico')
await sharp(svg).resize(48, 48).png().toFile(faviconIcoPath)
console.info(`Wrote ${faviconIcoPath}`)
