const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const {
  mergeEnvLayers,
  parseEnvFile,
  resolvePackagedApiEnv,
  isEnvComplete,
  isPlaceholderValue,
} = require('./resolve-api-env.cjs')

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jb-admin-env-'))
  try {
    fn(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

// parseEnvFile
assert.equal(parseEnvFile('FOO=bar\n# comment\nBAZ="quoted value"').FOO, 'bar')
assert.equal(parseEnvFile('BAZ="quoted value"').BAZ, 'quoted value')

// merge: bundled base + incomplete user override keeps bundled secrets
withTempDir((dir) => {
  const bundled = path.join(dir, 'api.env')
  const user = path.join(dir, 'user.env')
  fs.writeFileSync(
    bundled,
    'SUPABASE_URL=https://bundled.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=sr_bundled\nSUPABASE_ANON_KEY=anon_bundled\nSUPABASE_JWT_SECRET=jwt_bundled\nAUDIT_CHAIN_SECRET=audit_bundled\n',
  )
  fs.writeFileSync(user, 'SUPABASE_URL=\nADMIN_API_PORT=3099\n')

  const merged = mergeEnvLayers([bundled, user])
  assert.equal(merged.SUPABASE_URL, 'https://bundled.supabase.co')
  assert.equal(merged.SUPABASE_SERVICE_ROLE_KEY, 'sr_bundled')
  assert.equal(merged.ADMIN_API_PORT, '3099')
})

// resolvePackagedApiEnv writes runtime file and reports missing keys
withTempDir((dir) => {
  const resources = path.join(dir, 'resources')
  const userData = path.join(dir, 'userData')
  fs.mkdirSync(resources)
  fs.mkdirSync(userData)
  fs.writeFileSync(
    path.join(resources, 'api.env'),
    'SUPABASE_URL=https://x.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=sr\nSUPABASE_ANON_KEY=anon\nSUPABASE_JWT_SECRET=jwt\nAUDIT_CHAIN_SECRET=audit\n',
  )
  fs.writeFileSync(
    path.join(userData, '.env'),
    '# stale empty override\nSUPABASE_URL=\n',
  )

  const result = resolvePackagedApiEnv({
    isProduction: true,
    resourcesPath: resources,
    userDataPath: userData,
    exeDir: path.join(dir, 'exe'),
  })

  assert.equal(result.missingKeys.length, 0)
  assert.ok(fs.existsSync(result.runtimePath))
  const runtime = parseEnvFile(fs.readFileSync(result.runtimePath, 'utf8'))
  assert.equal(runtime.SUPABASE_URL, 'https://x.supabase.co')
  assert.equal(runtime.AUDIT_CHAIN_SECRET, 'audit')
})

assert.equal(
  isEnvComplete(
    {
      SUPABASE_URL: 'u',
      SUPABASE_SERVICE_ROLE_KEY: 'sr',
      SUPABASE_ANON_KEY: 'a',
      SUPABASE_JWT_SECRET: 'j',
    },
    false,
  ),
  true,
)
assert.equal(
  isEnvComplete(
    {
      SUPABASE_URL: 'u',
      SUPABASE_SERVICE_ROLE_KEY: 'sr',
      SUPABASE_ANON_KEY: 'a',
      SUPABASE_JWT_SECRET: 'j',
    },
    true,
  ),
  false,
)

// stale example-seeded override (placeholder URL) must not shadow real bundled secret
withTempDir((dir) => {
  const bundled = path.join(dir, 'api.env')
  const user = path.join(dir, 'user.env')
  fs.writeFileSync(
    bundled,
    'SUPABASE_URL=https://real.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=sr_real\n',
  )
  fs.writeFileSync(user, 'SUPABASE_URL=https://your-project.supabase.co\n')

  const merged = mergeEnvLayers([bundled, user])
  assert.equal(merged.SUPABASE_URL, 'https://real.supabase.co')
})

// placeholder detection: example values count as missing, real values do not
assert.equal(isPlaceholderValue(''), true)
assert.equal(isPlaceholderValue('  '), true)
assert.equal(isPlaceholderValue('https://your-project.supabase.co'), true)
assert.equal(isPlaceholderValue('https://ctleiabsrsqxjlnuordj.supabase.co'), false)
assert.equal(isPlaceholderValue('sr_bundled'), false)

// a build that bundled api/.env.example is reported as incomplete (not spawned + crashed)
withTempDir((dir) => {
  const resources = path.join(dir, 'resources')
  const userData = path.join(dir, 'userData')
  fs.mkdirSync(resources)
  fs.mkdirSync(userData)
  fs.writeFileSync(
    path.join(resources, 'api.env'),
    'SUPABASE_URL=https://your-project.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=sr\nSUPABASE_ANON_KEY=anon\nSUPABASE_JWT_SECRET=jwt\nAUDIT_CHAIN_SECRET=audit\n',
  )

  const result = resolvePackagedApiEnv({
    isProduction: true,
    resourcesPath: resources,
    userDataPath: userData,
    exeDir: path.join(dir, 'exe'),
  })

  assert.ok(result.missingKeys.includes('SUPABASE_URL'))
})

console.log('resolve-api-env.spec.cjs: OK')
