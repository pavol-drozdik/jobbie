/**
 * Writes build/github-update-token for electron-builder extraResources.
 * CI: set ADMIN_GITHUB_UPDATE_TOKEN (read-only PAT for private GitHub Releases).
 * Local unsigned builds: creates an empty file so packaging succeeds; auto-update stays disabled.
 */
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const buildDir = path.join(root, 'build')
const outPath = path.join(buildDir, 'github-update-token')

const token = (process.env.ADMIN_GITHUB_UPDATE_TOKEN || process.env.GITHUB_UPDATE_TOKEN || '').trim()

fs.mkdirSync(buildDir, { recursive: true })

if (!token) {
  fs.writeFileSync(outPath, '', 'utf8')
  console.warn(
    '[update-token] No ADMIN_GITHUB_UPDATE_TOKEN — packaged app will not auto-update.',
  )
  process.exit(0)
}

fs.writeFileSync(outPath, token, 'utf8')
console.log('[update-token] Wrote build/github-update-token for auto-updater.')
