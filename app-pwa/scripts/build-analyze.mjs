import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))
process.env.ANALYZE = '1'

const result = spawnSync(
  process.execPath,
  ['--max-old-space-size=8192', join(root, '../node_modules/nuxt/bin/nuxt.mjs'), 'build'],
  { stdio: 'inherit', env: process.env, cwd: join(root, '..') },
)

process.exit(result.status ?? 1)
