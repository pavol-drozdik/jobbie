/**
 * Renders build/icon.svg → PNG, .ico (Windows), .icns (macOS).
 * Run: node scripts/generate-icons.mjs
 * Requires devDependencies: sharp, png-to-ico, png2icons
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import png2icons from 'png2icons'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const buildDir = path.join(__dirname, '..', 'build')
const svgPath = path.join(buildDir, 'icon.svg')
const png1024 = path.join(buildDir, 'icon-1024.png')

if (!fs.existsSync(svgPath)) {
  console.error('Missing', svgPath)
  process.exit(1)
}

const svg = fs.readFileSync(svgPath)

await sharp(svg, { density: 384 })
  .resize(1024, 1024)
  .png()
  .toFile(png1024)

const sizes = [16, 24, 32, 48, 64, 128, 256]
const pngBuffers = await Promise.all(
  sizes.map((size) =>
    sharp(svg, { density: 384 })
      .resize(size, size)
      .png()
      .toBuffer(),
  ),
)

const icoPath = path.join(buildDir, 'icon.ico')
fs.writeFileSync(icoPath, await pngToIco(pngBuffers))

const icnsBuffer = png2icons.createICNS(fs.readFileSync(png1024), png2icons.BILINEAR, 0)
if (!icnsBuffer) {
  console.error('png2icons failed to create .icns')
  process.exit(1)
}
fs.writeFileSync(path.join(buildDir, 'icon.icns'), icnsBuffer)

console.log('Wrote:', path.relative(process.cwd(), png1024))
console.log('Wrote:', path.relative(process.cwd(), icoPath))
console.log('Wrote:', path.relative(process.cwd(), path.join(buildDir, 'icon.icns')))
