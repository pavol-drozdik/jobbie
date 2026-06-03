import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const outDir = path.join(root, 'app-pwa', 'public', 'img')
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
})
await page.goto('http://localhost:8765/A_B%20_%20Desktop.html', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

await page.screenshot({
  path: path.join(outDir, 'home-hero-ab-phone.png'),
  clip: { x: 700, y: 70, width: 700, height: 830 },
})

await browser.close()
console.log('wrote', path.join(outDir, 'home-hero-ab-phone.png'))
