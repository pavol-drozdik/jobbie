const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

const isDev = !app.isPackaged
const API_PORT = process.env.ADMIN_API_PORT || '3099'
const HEALTH_URL = `http://127.0.0.1:${API_PORT}/health`
/** Set by `npm run dev` — API is started via `dev:api`; do not spawn a second Nest process. */
const SKIP_API_SPAWN =
  process.env.JOBBIE_ADMIN_SKIP_API_SPAWN === '1' ||
  process.env.JOBBIE_ADMIN_API_EXTERNAL === '1'

let apiProcess = null

function apiRootDir() {
  return path.join(__dirname, '..', 'api')
}

function devEnvPath() {
  return path.join(apiRootDir(), '.env')
}

function packagedEnvCandidates() {
  const exeDir = path.dirname(process.execPath)
  const userDataEnv = path.join(app.getPath('userData'), '.env')
  return [
    path.join(exeDir, '.env'),
    userDataEnv,
    path.join(process.resourcesPath, 'api.env'),
  ]
}

function packagedEnvExamplePath() {
  return path.join(process.resourcesPath, 'api.env.example')
}

function findExistingEnv(candidates) {
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate
    }
  }
  return null
}

/**
 * Resolves the .env file for the Nest admin API.
 * Dev: jobbie-admin/api/.env
 * Packaged: next to executable, then userData/.env, then resources/api.env
 */
function resolveEnvFile() {
  if (isDev) {
    const envPath = devEnvPath()
    if (!fs.existsSync(envPath)) {
      console.warn(
        `[admin] Missing ${envPath} — copy api/.env.example and fill Supabase credentials.`,
      )
    }
    return envPath
  }

  const existing = findExistingEnv(packagedEnvCandidates())
  if (existing) {
    return existing
  }

  const userDataEnv = path.join(app.getPath('userData'), '.env')
  const exampleSrc = packagedEnvExamplePath()
  try {
    fs.mkdirSync(path.dirname(userDataEnv), { recursive: true })
    if (fs.existsSync(exampleSrc)) {
      fs.copyFileSync(exampleSrc, userDataEnv)
      console.log(`[admin] Created template env at ${userDataEnv}`)
    } else {
      fs.writeFileSync(
        userDataEnv,
        '# JOBBIE Admin API — fill Supabase credentials\nADMIN_API_PORT=3099\nSUPABASE_URL=\nSUPABASE_SERVICE_ROLE_KEY=\nSUPABASE_JWT_SECRET=\nAUDIT_CHAIN_SECRET=\n',
        'utf8',
      )
      console.log(`[admin] Created empty env at ${userDataEnv}`)
    }
    dialog.showMessageBoxSync({
      type: 'warning',
      title: 'JOBBIE Admin — configuration',
      message: 'Environment file required',
      detail: `Edit the API environment file, then restart the app:\n\n${userDataEnv}\n\nCopy values from your main backend-ts .env (Supabase URL, service role, JWT secret, audit chain secret).`,
    })
    return userDataEnv
  } catch (err) {
    console.error('[admin] Failed to seed .env', err)
    return null
  }
}

function startApi() {
  const apiDir = apiRootDir()
  const envPath = resolveEnvFile()
  const apiEnv = {
    ...process.env,
    NODE_ENV: isDev ? 'development' : 'production',
    ADMIN_API_PORT: API_PORT,
    PORT: API_PORT,
  }
  if (envPath) {
    apiEnv.DOTENV_CONFIG_PATH = envPath
  }

  if (isDev) {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
    apiProcess = spawn(npmCmd, ['run', 'start:dev'], {
      cwd: apiDir,
      env: apiEnv,
      stdio: 'inherit',
      shell: false,
    })
  } else {
    const mainScript = path.join(apiDir, 'dist', 'main.js')
    if (!fs.existsSync(mainScript)) {
      console.error(`[admin] Missing API bundle: ${mainScript}`)
      dialog.showErrorBox(
        'JOBBIE Admin',
        'Admin API files are missing from the installation. Reinstall the app.',
      )
      return false
    }
    apiProcess = spawn(process.execPath, [mainScript], {
      cwd: apiDir,
      env: {
        ...apiEnv,
        ELECTRON_RUN_AS_NODE: '1',
      },
      stdio: 'inherit',
    })
  }

  apiProcess.on('error', (err) => {
    console.error('[admin-api] spawn failed:', err)
    dialog.showErrorBox(
      'JOBBIE Admin — API failed to start',
      `Could not start the local admin API.\n\n${err.message}\n\nFrom jobbie-admin/, run: npm run dev:api`,
    )
  })
  apiProcess.on('exit', (code, signal) => {
    if (code && code !== 0) {
      console.error(`[admin-api] exited with code ${code}${signal ? ` signal ${signal}` : ''}`)
    }
  })
  return true
}

async function probeHealth() {
  try {
    const res = await fetch(HEALTH_URL, { cache: 'no-store' })
    if (!res.ok) return false
    const body = await res.json()
    return body?.ok === true
  } catch {
    return false
  }
}

/**
 * Poll /health until the Nest API is listening (nest start --watch can take 10–20s).
 */
async function waitForHealth(maxMs, intervalMs = 500) {
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    if (await probeHealth()) {
      console.log(`[admin] API healthy at ${HEALTH_URL}`)
      return true
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return false
}

async function ensureApiReady() {
  if (await probeHealth()) {
    console.log('[admin] API already running')
    return true
  }

  if (SKIP_API_SPAWN) {
    console.error(
      '[admin] API not reachable and spawn skipped (JOBBIE_ADMIN_SKIP_API_SPAWN). Start: npm run dev:api',
    )
    dialog.showMessageBoxSync({
      type: 'error',
      title: 'JOBBIE Admin — API not running',
      message: 'Local admin API is not reachable',
      detail: `Nothing is listening on http://127.0.0.1:${API_PORT}.\n\nFrom jobbie-admin/, run:\n  npm run dev:api\n\nOr the full dev stack:\n  npm run dev`,
    })
    return false
  }

  console.log('[admin] Starting local admin API…')
  if (startApi() === false) {
    return false
  }

  const maxWait = isDev ? 120_000 : 60_000
  const ok = await waitForHealth(maxWait)
  if (!ok) {
    console.error(`[admin] API did not become healthy within ${maxWait / 1000}s`)
    dialog.showMessageBoxSync({
      type: 'error',
      title: 'JOBBIE Admin — API timeout',
      message: 'Admin API did not start in time',
      detail: `Check api/.env (copy from api/.env.example) and the terminal for Nest errors.\n\nVerify manually:\n  curl http://127.0.0.1:${API_PORT}/health\n\nExpected: {"ok":true}`,
    })
  }
  return ok
}

function windowIconPath() {
  const buildDir = path.join(__dirname, '..', 'build')
  if (process.platform === 'win32') {
    return path.join(buildDir, 'icon.ico')
  }
  if (process.platform === 'darwin') {
    return path.join(buildDir, 'icon.icns')
  }
  return path.join(buildDir, 'icon-1024.png')
}

function createWindow() {
  const icon = windowIconPath()
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    ...(fs.existsSync(icon) ? { icon } : {}),
    title: 'JOBBIE Admin',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  if (isDev) {
    win.loadURL('http://127.0.0.1:5199')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '..', 'app', 'dist', 'index.html'))
  }
}

app.whenReady().then(async () => {
  await ensureApiReady()
  createWindow()
})

app.on('window-all-closed', () => {
  if (apiProcess) apiProcess.kill()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
