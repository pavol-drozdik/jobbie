const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const { initAutoUpdater } = require('./auto-updater.cjs')
const { createStaticUiServerWithFallback } = require('./static-ui-server.cjs')
const { resolvePackagedApiEnv } = require('./resolve-api-env.cjs')

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
const LOG_BUFFER_MAX = 8192

/** @type {{ state: string, logTail: string, missingEnvKeys: string[], exitCode: number | null, envPath: string | null }} */
let apiBootstrapStatus = {
  state: 'idle',
  logTail: '',
  missingEnvKeys: [],
  exitCode: null,
  envPath: null,
}

function setApiBootstrapStatus(patch) {
  apiBootstrapStatus = { ...apiBootstrapStatus, ...patch }
}

function appendApiLog(chunk) {
  const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8')
  setApiBootstrapStatus({
    logTail: (apiBootstrapStatus.logTail + text).slice(-LOG_BUFFER_MAX),
  })
}

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

function packagedEnvExamplePath() {
  return path.join(process.resourcesPath, 'api.env.example')
}

/**
 * Resolves the .env file for the Nest admin API.
 * Dev: jobbie-admin/api/.env
 * Packaged: merge resources/api.env + userData/.env + exeDir/.env → userData/api.runtime.env
 */
function resolveEnvFile() {
  if (isDev) {
    const envPath = devEnvPath()
    if (!fs.existsSync(envPath)) {
      console.warn(
        `[admin] Missing ${envPath} — copy api/.env.example and fill Supabase credentials.`,
      )
    }
    return { envPath, missingKeys: [] }
  }

  const bundledPath = path.join(process.resourcesPath, 'api.env')
  const userDataPath = app.getPath('userData')
  const exeDir = path.dirname(process.execPath)

  if (!fs.existsSync(bundledPath)) {
    const userDataEnv = path.join(userDataPath, '.env')
    if (!fs.existsSync(userDataEnv)) {
      const exampleSrc = packagedEnvExamplePath()
      try {
        fs.mkdirSync(userDataPath, { recursive: true })
        if (fs.existsSync(exampleSrc)) {
          fs.copyFileSync(exampleSrc, userDataEnv)
          console.log(`[admin] Created template env at ${userDataEnv}`)
        } else {
          fs.writeFileSync(
            userDataEnv,
            '# JOBBIE Admin API — fill Supabase credentials\nADMIN_API_PORT=3099\nSUPABASE_URL=\nSUPABASE_SERVICE_ROLE_KEY=\nSUPABASE_ANON_KEY=\nSUPABASE_JWT_SECRET=\nAUDIT_CHAIN_SECRET=\n',
            'utf8',
          )
          console.log(`[admin] Created empty env at ${userDataEnv}`)
        }
        const parent =
          mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined
        dialog.showMessageBox(parent, {
          type: 'warning',
          title: 'JOBBIE Admin — configuration',
          message: 'Environment file required',
          detail: `Edit the API environment file, then restart the app:\n\n${userDataEnv}\n\nCopy values from your main backend-ts .env (Supabase URL, service role, anon key, JWT secret, audit chain secret).`,
        })
      } catch (err) {
        console.error('[admin] Failed to seed .env', err)
        return { envPath: null, missingKeys: ['SUPABASE_URL'] }
      }
    }
  }

  const resolved = resolvePackagedApiEnv({
    isProduction: true,
    resourcesPath: process.resourcesPath,
    userDataPath,
    exeDir,
  })

  if (resolved.missingKeys.length > 0) {
    const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined
    dialog.showMessageBox(parent, {
      type: 'error',
      title: 'JOBBIE Admin — incomplete configuration',
      message: 'Admin API environment is incomplete',
      detail: `Missing keys: ${resolved.missingKeys.join(', ')}\n\nBundled: ${resolved.bundledPath}\nOverride: ${resolved.userDataOverridePath}\n\nDelete an empty override at ${resolved.userDataOverridePath} if you use a GitHub Release build with bundled credentials, then restart.`,
    })
  }

  return {
    envPath: resolved.runtimePath,
    missingKeys: resolved.missingKeys,
  }
}

function startApi() {
  const apiDir = apiRootDir()
  const { envPath, missingKeys } = resolveEnvFile()
  setApiBootstrapStatus({
    state: 'starting',
    missingEnvKeys: missingKeys,
    envPath,
    exitCode: null,
    logTail: '',
  })

  if (!envPath) {
    setApiBootstrapStatus({ state: 'failed' })
    return false
  }

  if (missingKeys.length > 0) {
    setApiBootstrapStatus({ state: 'failed' })
    return false
  }

  const apiEnv = {
    ...process.env,
    NODE_ENV: isDev ? 'development' : 'production',
    ADMIN_API_PORT: API_PORT,
    PORT: API_PORT,
    DOTENV_CONFIG_PATH: envPath,
    INFRA_METRICS_HISTORY_PATH: path.join(
      app.getPath('userData'),
      'infrastructure-history.json',
    ),
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
      setApiBootstrapStatus({ state: 'failed' })
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
      appendApiLog(chunk)
      process.stdout.write(`[admin-api] ${chunk}`)
    })
    apiProcess.stderr?.on('data', (chunk) => {
      appendApiLog(chunk)
      process.stderr.write(`[admin-api] ${chunk}`)
    })
  }

  apiProcess.on('error', (err) => {
    console.error('[admin-api] spawn failed:', err)
    appendApiLog(`\n[spawn error] ${err.message}\n`)
    setApiBootstrapStatus({ state: 'failed' })
    const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined
    dialog.showErrorBox(
      'JOBBIE Admin — API failed to start',
      `Could not start the local admin API.\n\n${err.message}`,
    )
  })
  apiProcess.on('exit', (code, signal) => {
    if (code && code !== 0) {
      console.error(
        `[admin-api] exited with code ${code}${signal ? ` signal ${signal}` : ''}`,
      )
      appendApiLog(`\n[exit] code=${code}${signal ? ` signal=${signal}` : ''}\n`)
      setApiBootstrapStatus({ state: 'failed', exitCode: code ?? null })
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
    setApiBootstrapStatus({ state: 'healthy' })
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
      setApiBootstrapStatus({ state: 'healthy' })
      return
    }
    if (apiBootstrapStatus.state === 'failed') {
      return
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  console.error('[admin] API did not become healthy in background bootstrap')
  setApiBootstrapStatus({ state: 'failed' })
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
    const { server, url } = await createStaticUiServerWithFallback(
      distDir,
      ADMIN_UI_PORT,
    )
    uiStaticServer = server
    console.log(`[admin] UI static server at ${url}`)
    await win.loadURL(url)
  } catch (err) {
    console.error('[admin] UI static server failed, falling back to file://', err)
    await win.loadFile(indexHtml)
  }
}

ipcMain.handle('admin:getApiBootstrapStatus', () => ({
  ...apiBootstrapStatus,
  userDataPath: app.getPath('userData'),
  isPackaged: app.isPackaged,
}))

ipcMain.handle('admin:openUserDataFolder', async () => {
  const folder = app.getPath('userData')
  await shell.openPath(folder)
  return folder
})

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
