/**
 * Production build for Cloudflare Pages using the project-local Nuxt CLI (not npx nuxi).
 * Sets NUXT_IGNORE_LOCK so a stray `npm run dev` does not block production builds.
 *
 * Post-build: esbuild bundles dist/_worker.js/index.js (Rollup entry + its dynamic-import
 * chunks) into a single pre-bundled file. This is necessary because:
 *   - Nitro CF Pages preset generates separate Rollup chunks for each page component
 *   - Wrangler/CF Pages only follows *static* imports when bundling _worker.js/
 *   - Dynamic imports to page chunks therefore resolve to null at runtime → Vue Router
 *     throws "Couldn't resolve component"
 *   - Setting rollupConfig.output.inlineDynamicImports: true in Rollup causes circular-
 *     dependency reordering that crashes CF's validator ("Cannot read properties of
 *     undefined (reading 'bind')")
 *   - esbuild (used here post-Rollup) handles the same circular deps gracefully and
 *     produces a pre-bundled single file that Wrangler deploys without re-bundling
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, renameSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const nuxtBin = path.join(appRoot, 'node_modules', 'nuxt', 'bin', 'nuxt.mjs')

process.env.NUXT_IGNORE_LOCK = '1'

// ── Step 1: Nuxt build ────────────────────────────────────────────────────────
const buildResult = spawnSync(
  process.execPath,
  ['--max-old-space-size=8192', nuxtBin, 'build', '--preset=cloudflare_pages'],
  { cwd: appRoot, stdio: 'inherit', env: process.env },
)

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1)
}

// ── Step 2: esbuild post-bundle ───────────────────────────────────────────────
// Bundle dist/_worker.js/index.js + all its dynamic-import chunks into a single
// pre-bundled ESM file so Wrangler deploys it as-is without re-bundling by CF.

const workerDir = path.join(appRoot, 'dist', '_worker.js')
const entryFile = path.join(workerDir, 'index.js')

if (!existsSync(entryFile)) {
  console.error(`[post-build] ERROR: ${entryFile} not found — skipping esbuild step`)
  process.exit(1)
}

console.log('[post-build] Bundling _worker.js/index.js with esbuild...')

const esbuildBin = path.join(appRoot, 'node_modules', '.bin', 'esbuild')
const outFile = path.join(workerDir, 'index.bundled.js')

const esbuildResult = spawnSync(esbuildBin, [
  entryFile,
  '--bundle',
  '--format=esm',
  '--platform=browser',
  // CF Workers built-ins — do not try to resolve from node_modules
  '--external:cloudflare:*',
  // Node built-ins are already polyfilled by Nitro/unenv in the Rollup output;
  // mark external so esbuild does not double-process them.
  '--external:node:*',
  `--outfile=${outFile}`,
  '--log-level=info',
], {
  cwd: appRoot,
  stdio: 'inherit',
})

if (esbuildResult.status !== 0) {
  console.error('[post-build] esbuild failed')
  process.exit(esbuildResult.status ?? 1)
}

// Replace index.js with the bundled output and remove leftover chunk files
renameSync(outFile, entryFile)

for (const file of readdirSync(workerDir)) {
  if (file !== 'index.js') {
    rmSync(path.join(workerDir, file), { recursive: true, force: true })
    console.log(`[post-build] Removed: ${file}`)
  }
}

console.log('[post-build] Worker bundle ready.')
