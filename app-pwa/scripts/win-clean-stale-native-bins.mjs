/**
 * Removes leftover npm native-binary temp folders on Windows (e.g. @esbuild\.win32-x64-*).
 * Run before `npm ci` when EPERM unlink errors appear after a partial install.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const nodeModules = path.join(appRoot, 'node_modules')

function isStaleNativeDir(name) {
  return (
    /^\.win32-x64-/i.test(name) ||
    /^\.binding-win32-/i.test(name) ||
    /^\.rollup-win32-/i.test(name)
  )
}

function cleanDir(parentDir) {
  if (!fs.existsSync(parentDir)) {
    return 0
  }
  let removed = 0
  for (const entry of fs.readdirSync(parentDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !isStaleNativeDir(entry.name)) {
      continue
    }
    const full = path.join(parentDir, entry.name)
    try {
      fs.rmSync(full, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
      removed += 1
      console.info(`[win-clean] removed ${path.relative(appRoot, full)}`)
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? err.code : ''
      console.warn(`[win-clean] skip ${path.relative(appRoot, full)} (${code || err})`)
    }
  }
  return removed
}

function quarantineNodeModules() {
  if (!fs.existsSync(nodeModules)) {
    return false
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const quarantine = path.join(appRoot, `node_modules.__quarantine_${stamp}`)
  fs.renameSync(nodeModules, quarantine)
  console.info(
    `[win-clean] quarantined node_modules → ${path.basename(quarantine)} (delete that folder later if EPERM blocked removal)`,
  )
  return true
}

function main() {
  if (process.platform !== 'win32') {
    console.info('[win-clean] not Windows — nothing to do')
    return
  }
  if (!fs.existsSync(nodeModules)) {
    console.info('[win-clean] no node_modules — nothing to do')
    return
  }
  let removed = 0
  for (const scope of ['@esbuild', '@oxc-minify', '@oxc-parser', '@oxc-transform', '@rollup']) {
    removed += cleanDir(path.join(nodeModules, scope))
  }
  console.info(`[win-clean] done (${removed} stale folder(s) removed)`)
  const forceQuarantine = process.argv.includes('--quarantine-node-modules')
  if (forceQuarantine) {
    quarantineNodeModules()
    return
  }
  if (removed === 0) {
    console.info(
      '[win-clean] If npm ci still fails with EPERM, run: npm run ci:win:quarantine',
    )
  }
}

main()
