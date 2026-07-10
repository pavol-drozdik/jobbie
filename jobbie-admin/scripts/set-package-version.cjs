/**
 * Sets jobbie-admin/package.json version from RELEASE_VERSION (e.g. v1.0.1 or 1.0.1).
 * Used by CI so installer names and electron-updater metadata match the GitHub release tag.
 */
const fs = require('node:fs')
const path = require('node:path')

const raw = (process.env.RELEASE_VERSION || process.argv[2] || '').trim()
if (!raw) {
  console.error('Usage: RELEASE_VERSION=v1.0.1 node scripts/set-package-version.cjs')
  process.exit(1)
}

const version = raw.replace(/^v/i, '')
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error(`Invalid semver: ${version}`)
  process.exit(1)
}

const pkgPath = path.join(__dirname, '..', 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
pkg.version = version
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
console.log(`[version] package.json → ${version}`)
