/**
 * Regenerates default listing thumbnails (SVG + WebP) from jobbielogowhite.svg.
 * Run from repo root: node app-pwa/scripts/generate-default-thumb.mjs
 */
import fs, { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const sharpPath = path.join(scriptDir, '..', '..', 'backend-ts', 'node_modules', 'sharp')
if (!existsSync(sharpPath)) {
  console.error('sharp not found — run npm install in backend-ts first')
  process.exit(1)
}
const sharp = require(sharpPath)
const publicDir = path.resolve(scriptDir, '../public')
const logoPath = path.join(publicDir, 'jobbielogowhite.svg')
const thumbBg = '#22c55e'
const width = 800
const height = 600
const logoScale = 0.094
const logoCenterX = 3411.5
const logoCenterY = 1005

function extractLogoInnerMarkup(svgSource) {
  const withoutProlog = svgSource
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .trim()
  const match = withoutProlog.match(/<svg[\s\S]*?>([\s\S]*)<\/svg>/i)
  if (!match?.[1]) {
    throw new Error('Could not parse jobbielogowhite.svg')
  }
  return match[1].trim()
}

function buildThumbSvg(logoInner) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${thumbBg}"/>
  <g transform="translate(${width / 2} ${height / 2}) scale(${logoScale}) translate(-${logoCenterX} -${logoCenterY})">
    ${logoInner}
  </g>
</svg>
`
}

const logoSource = fs.readFileSync(logoPath, 'utf8')
const thumbSvg = buildThumbSvg(extractLogoInnerMarkup(logoSource))
const svgOutPaths = [
  path.join(publicDir, 'jobbie-default-thumb.svg'),
  path.join(publicDir, 'job-card-placeholder.svg'),
]
for (const outPath of svgOutPaths) {
  fs.writeFileSync(outPath, thumbSvg, 'utf8')
}
const webpOut = path.join(publicDir, 'img', 'jobbie-def-thumb.webp')
await sharp(Buffer.from(thumbSvg)).webp({ quality: 88 }).toFile(webpOut)
console.log('Wrote:', [...svgOutPaths, webpOut].join('\n       '))
