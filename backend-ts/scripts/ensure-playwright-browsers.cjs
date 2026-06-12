/**
 * CI-only: install chromium-headless-shell before Jest (Playwright 1.51+ headless default).
 * Skips locally so `npm test` stays fast when browsers are already installed.
 */
const { execSync } = require('node:child_process')

const isCi = process.env.CI === 'true' || process.env.CI === '1'
if (!isCi) {
  process.exit(0)
}

async function canLaunchHeadlessChromium() {
  try {
    const { chromium } = require('playwright')
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    await browser.close()
    return true
  } catch {
    return false
  }
}

function installHeadlessShell() {
  console.log('CI: installing Playwright chromium-headless-shell…')
  try {
    execSync('npx playwright install --with-deps chromium-headless-shell', {
      stdio: 'inherit',
    })
  } catch {
    execSync('npx playwright install chromium-headless-shell', { stdio: 'inherit' })
    execSync('npx playwright install-deps chromium-headless-shell', { stdio: 'inherit' })
  }
}

async function main() {
  if (await canLaunchHeadlessChromium()) {
    return
  }

  installHeadlessShell()

  if (!(await canLaunchHeadlessChromium())) {
    console.error(
      'Playwright headless Chromium failed to launch after install (expected chromium-headless-shell).',
    )
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
