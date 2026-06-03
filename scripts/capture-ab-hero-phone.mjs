import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const outDir = path.join('app-pwa', 'public', 'img')
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
})
await page.goto('http://localhost:8765/A_B%20_%20Desktop.html', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

await page.screenshot({
  path: path.join(outDir, 'home-hero-ab-phone.png'),
  clip: { x: 680, y: 72, width: 720, height: 820 },
})
await page.screenshot({
  path: path.join(outDir, 'home-hero-ab-full.png'),
  clip: { x: 0, y: 72, width: 1440, height: 820 },
})

await browser.close()
console.log('saved hero screenshots to', outDir)
