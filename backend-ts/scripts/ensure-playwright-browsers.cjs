/**
 * CI-only: install chromium-headless-shell before Jest (Playwright 1.51+ headless default).
 * Skips locally so `npm test` stays fast when browsers are already installed.
 */
const { execSync } = require('node:child_process')
const { existsSync } = require('node:fs')

const isCi = process.env.CI === 'true' || process.env.CI === '1'
if (!isCi) {
  process.exit(0)
}

function browserMissing() {
  try {
    const { chromium } = require('playwright')
    const execPath = chromium.executablePath()
    return !existsSync(execPath)
  } catch {
    return true
  }
}

if (!browserMissing()) {
  process.exit(0)
}

console.log('CI: installing Playwright chromium-headless-shell…')
try {
  execSync('npx playwright install --with-deps chromium-headless-shell', {
    stdio: 'inherit',
  })
} catch {
  execSync('npx playwright install chromium-headless-shell', { stdio: 'inherit' })
  execSync('npx playwright install-deps chromium-headless-shell', { stdio: 'inherit' })
}

if (browserMissing()) {
  console.error('Playwright browser missing after install:', require('playwright').chromium.executablePath())
  process.exit(1)
}
