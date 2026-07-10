const fs = require('node:fs')
const path = require('node:path')

const REQUIRED_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_JWT_SECRET',
]

const PRODUCTION_EXTRA_KEYS = ['AUDIT_CHAIN_SECRET']

function escapeEnvValue(value) {
  const s = String(value)
  if (/[\s#"'\\]/.test(s)) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return s
}

/**
 * @param {string} content
 * @returns {Record<string, string>}
 */
function parseEnvFile(content) {
  /** @type {Record<string, string>} */
  const result = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
      if (value.includes('"')) {
        value = value.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      }
    }
    if (value) {
      result[key] = value
    }
  }
  return result
}

/**
 * Later paths override earlier ones (only non-empty values).
 * @param {string[]} layerPaths
 */
function mergeEnvLayers(layerPaths) {
  /** @type {Record<string, string>} */
  const merged = {}
  for (const layerPath of layerPaths) {
    if (!layerPath || !fs.existsSync(layerPath)) continue
    const parsed = parseEnvFile(fs.readFileSync(layerPath, 'utf8'))
    for (const [key, value] of Object.entries(parsed)) {
      if (value?.trim()) {
        merged[key] = value.trim()
      }
    }
  }
  return merged
}

/**
 * @param {Record<string, string>} merged
 */
function formatEnvFile(merged) {
  const lines = ['# Merged by JOBBIE Admin (do not edit — overrides in userData/.env)']
  for (const key of Object.keys(merged).sort()) {
    lines.push(`${key}=${escapeEnvValue(merged[key])}`)
  }
  return `${lines.join('\n')}\n`
}

/**
 * @param {object} opts
 * @param {boolean} opts.isProduction
 * @param {string} opts.resourcesPath
 * @param {string} opts.userDataPath
 * @param {string} opts.exeDir
 */
function resolvePackagedApiEnv(opts) {
  const bundledPath = path.join(opts.resourcesPath, 'api.env')
  const userDataOverridePath = path.join(opts.userDataPath, '.env')
  const exeOverridePath = path.join(opts.exeDir, '.env')
  const runtimePath = path.join(opts.userDataPath, 'api.runtime.env')

  const merged = mergeEnvLayers([
    bundledPath,
    userDataOverridePath,
    exeOverridePath,
  ])

  const requiredKeys = opts.isProduction
    ? [...REQUIRED_KEYS, ...PRODUCTION_EXTRA_KEYS]
    : [...REQUIRED_KEYS]

  const missingKeys = requiredKeys.filter((key) => !merged[key]?.trim())

  fs.mkdirSync(opts.userDataPath, { recursive: true })
  fs.writeFileSync(runtimePath, formatEnvFile(merged), 'utf8')

  return {
    runtimePath,
    merged,
    missingKeys,
    bundledPath,
    userDataOverridePath,
    exeOverridePath,
    hasBundledEnv: fs.existsSync(bundledPath),
  }
}

/**
 * @param {Record<string, string>} merged
 * @param {boolean} isProduction
 */
function isEnvComplete(merged, isProduction) {
  const requiredKeys = isProduction
    ? [...REQUIRED_KEYS, ...PRODUCTION_EXTRA_KEYS]
    : [...REQUIRED_KEYS]
  return requiredKeys.every((key) => merged[key]?.trim())
}

module.exports = {
  REQUIRED_KEYS,
  PRODUCTION_EXTRA_KEYS,
  parseEnvFile,
  mergeEnvLayers,
  formatEnvFile,
  resolvePackagedApiEnv,
  isEnvComplete,
}
