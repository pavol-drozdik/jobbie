/**
 * Resizes homepage marketing WebPs for mobile (Cloudflare Pages has no runtime IPX).
 * Run from app-pwa: node ./scripts/optimize-home-marketing-images.mjs
 */
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const imgDir = join(scriptDir, '..', 'public', 'img')

const require = createRequire(import.meta.url)
const sharpPath = join(scriptDir, '..', '..', 'backend-ts', 'node_modules', 'sharp')
if (!existsSync(sharpPath)) {
  console.error('sharp not found — run npm install in backend-ts first')
  process.exit(1)
}
const sharp = require(sharpPath)

const MOBILE_WIDTH = 400
const HERO_MOBILE_WIDTH = 760
const WEBP_QUALITY = 82

const heroIn = join(imgDir, 'jobbie-mobile-hero.webp')
const heroOut = join(imgDir, 'jobbie-mobile-hero-760.webp')
const heroMeta = await sharp(heroIn).metadata()
const heroHeight =
  heroMeta.width && heroMeta.height
    ? Math.round((HERO_MOBILE_WIDTH * heroMeta.height) / heroMeta.width)
    : undefined
await sharp(heroIn)
  .resize(HERO_MOBILE_WIDTH, heroHeight, { fit: 'inside', withoutEnlargement: true })
  .webp({ quality: WEBP_QUALITY })
  .toFile(heroOut)
const heroOutMeta = await sharp(heroOut).metadata()
console.info(`Wrote ${heroOut} (${heroOutMeta.width}x${heroOutMeta.height})`)

const jobs = [
  { input: 'phone-image.webp', output: 'phone-image-400.webp' },
  { input: 'spotlight.webp', output: 'spotlight-400.webp' },
]

for (const { input, output } of jobs) {
  const inPath = join(imgDir, input)
  const outPath = join(imgDir, output)
  const meta = await sharp(inPath).metadata()
  const height =
    meta.width && meta.height
      ? Math.round((MOBILE_WIDTH * meta.height) / meta.width)
      : undefined
  await sharp(inPath)
    .resize(MOBILE_WIDTH, height, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(outPath)
  const outMeta = await sharp(outPath).metadata()
  console.info(`Wrote ${outPath} (${outMeta.width}x${outMeta.height})`)
}
