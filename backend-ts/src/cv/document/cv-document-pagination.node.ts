import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

let cachedBootstrap: string | null = null

/** In-browser CV pagination v2 (DOM measurement). */
export function buildCvPaginationBootstrapScript(): string {
  if (!cachedBootstrap) {
    const path = join(dirname(__filename), 'cv-document-pagination.bootstrap.js')
    cachedBootstrap = readFileSync(path, 'utf8')
  }
  return cachedBootstrap
}
