const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const { initAutoUpdater } = require('./auto-updater.cjs')
const { createStaticUiServerWithFallback } = require('./static-ui-server.cjs')

const isDev = !app.isPackaged
const API_PORT = process.env.ADMIN_API_PORT || '3099'
const HEALTH_URL = `http://127.0.0.1:${API_PORT}/health`
/** Set by `npm run dev` — API is started via `dev:api`; do not spawn a second Nest process. */
const SKIP_API_SPAWN =
  process.env.JOBBIE_ADMIN_SKIP_API_SPAWN === '1' ||
  process.env.JOBBIE_ADMIN_API_EXTERNAL === '1'

let apiProcess = null
/** @type {BrowserWindow | null} */
let mainWindow = null
/** @type {import('node:http').Server | null} */
let uiStaticServer = null
let apiBootstrapStarted = false

const ADMIN_UI_PORT = Number(process.env.ADMIN_UI_PORT || '5198')

function apiRootDir() {
  if (isDev) {
    return path.join(__dirname, '..', 'api')
  }
  const candidates = [
    path.join(process.resourcesPath, 'app.asar.unpacked', 'api'),
    path.join(app.getAppPath() + '.unpacked', 'api'),
    path.join(__dirname, '..', 'api'),
  ]
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'dist', 'main.js'))) {
      return dir
    }
  }
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
    const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined
    dialog.showMessageBox(parent, {
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
    INFRA_METRICS_HISTORY_PATH: path.join(
      app.getPath('userData'),
      'infrastructure-history.json',
    ),
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
      const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined
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
      stdio: 'pipe',
    })
    apiProcess.stdout?.on('data', (chunk) => {
      process.stdout.write(`[admin-api] ${chunk}`)
    })
    apiProcess.stderr?.on('data', (chunk) => {
      process.stderr.write(`[admin-api] ${chunk}`)
    })
  }

  apiProcess.on('error', (err) => {
    console.error('[admin-api] spawn failed:', err)
    const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined
    dialog.showErrorBox(
      'JOBBIE Admin — API failed to start',
      `Could not start the local admin API.\n\n${err.message}`,
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
 * Start Nest API without blocking the Electron window (UI polls /health).
 */
async function bootstrapApiInBackground() {
  if (apiBootstrapStarted || SKIP_API_SPAWN) {
    return
  }
  apiBootstrapStarted = true

  if (await probeHealth()) {
    console.log('[admin] API already running')
    return
  }

  console.log('[admin] Starting local admin API in background…')
  if (startApi() === false) {
    return
  }

  const deadline = Date.now() + (isDev ? 120_000 : 90_000)
  while (Date.now() < deadline) {
    if (await probeHealth()) {
      console.log(`[admin] API healthy at ${HEALTH_URL}`)
      return
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  console.error('[admin] API did not become healthy in background bootstrap')
}

function windowIconPath() {
  const devBuildDir = path.join(__dirname, '..', 'build')
  const packagedIconsDir = path.join(process.resourcesPath, 'icons')
  const baseDir = app.isPackaged ? packagedIconsDir : devBuildDir

  if (process.platform === 'win32') {
    return path.join(baseDir, 'icon.ico')
  }
  if (process.platform === 'darwin') {
    return path.join(baseDir, 'icon.icns')
  }
  return path.join(baseDir, 'icon.png')
}

function createWindow() {
  const icon = windowIconPath()
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    ...(fs.existsSync(icon) ? { icon } : {}),
    title: 'JOBBIE Admin',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  mainWindow = win
  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null
    }
  })
  win.once('ready-to-show', () => {
    win.show()
  })
  return win
}

async function loadWindowContent(win) {
  if (isDev) {
    await win.loadURL('http://127.0.0.1:5199')
    win.webContents.openDevTools({ mode: 'detach' })
    return
  }

  const distDir = path.join(__dirname, '..', 'app', 'dist')
  const indexHtml = path.join(distDir, 'index.html')
  if (!fs.existsSync(indexHtml)) {
    dialog.showErrorBox(
      'JOBBIE Admin',
      'UI build missing from installation. Reinstall the app.',
    )
    return
  }

  try {
    if (uiStaticServer) {
      uiStaticServer.close()
      uiStaticServer = null
    }
    const { server, url } = await createStaticUiServerWithFallback(distDir, ADMIN_UI_PORT)
    uiStaticServer = server
    console.log(`[admin] UI static server at ${url}`)
    await win.loadURL(url)
  } catch (err) {
    console.error('[admin] UI static server failed, falling back to file://', err)
    await win.loadFile(indexHtml)
  }
}

app.whenReady().then(async () => {
  const win = createWindow()
  try {
    await loadWindowContent(win)
  } catch (err) {
    console.error('[admin] Failed to load UI', err)
    dialog.showErrorBox(
      'JOBBIE Admin',
      `Failed to open the admin UI.\n\n${err instanceof Error ? err.message : String(err)}`,
    )
  }
  initAutoUpdater(() => mainWindow)
  void bootstrapApiInBackground()
})

process.on('uncaughtException', (err) => {
  console.error('[admin] uncaughtException', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('[admin] unhandledRejection', reason)
})

app.on('window-all-closed', () => {
  if (uiStaticServer) {
    uiStaticServer.close()
    uiStaticServer = null
  }
  if (apiProcess) {
    apiProcess.kill('SIGTERM')
    setTimeout(() => {
      if (apiProcess && !apiProcess.killed) {
        apiProcess.kill()
      }
      if (process.platform !== 'darwin') {
        app.quit()
      }
    }, 500)
    return
  }
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const win = createWindow()
    try {
      await loadWindowContent(win)
    } catch (err) {
      console.error('[admin] Failed to load UI on activate', err)
    }
    void bootstrapApiInBackground()
  }
})
