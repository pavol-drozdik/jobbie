/**
 * Production build for Cloudflare Pages using the project-local Nuxt CLI (not npx nuxi).
 * Sets NUXT_IGNORE_LOCK so a stray `npm run dev` does not block production builds.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const nuxtBin = path.join(appRoot, 'node_modules', 'nuxt', 'bin', 'nuxt.mjs')

process.env.NUXT_IGNORE_LOCK = '1'

const result = spawnSync(
  process.execPath,
  ['--max-old-space-size=8192', nuxtBin, 'build', '--preset=cloudflare_pages'],
  { cwd: appRoot, stdio: 'inherit', env: process.env },
)

process.exit(result.status ?? 1)
