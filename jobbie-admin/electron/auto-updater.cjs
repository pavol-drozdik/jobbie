const { app, dialog } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const { autoUpdater } = require('electron-updater')

const GITHUB_OWNER = 'Pr3vestTheDuck'
const GITHUB_REPO = 'jobbie'

/** @returns {string | null} */
function readUpdateToken() {
  const tokenPath = path.join(process.resourcesPath, 'github-update-token')
  if (!fs.existsSync(tokenPath)) {
    return null
  }
  const token = fs.readFileSync(tokenPath, 'utf8').trim()
  return token || null
}

/**
 * @param {import('electron').BrowserWindow | null} getMainWindow
 */
function initAutoUpdater(getMainWindow) {
  if (!app.isPackaged) {
    return
  }

  const token = readUpdateToken()
  if (!token) {
    console.log('[admin] Auto-update disabled (no GitHub update token).')
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.setFeedURL({
    provider: 'github',
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    private: true,
    token,
  })

  autoUpdater.on('error', (err) => {
    console.error('[admin] Auto-update error:', err)
  })

  autoUpdater.on('update-available', async (info) => {
    const version = info?.version ?? 'nová'
    const { response } = await dialog.showMessageBox({
      type: 'info',
      title: 'JOBBIE Admin — aktualizácia',
      message: `Je k dispozícii verzia ${version}.`,
      detail: 'Stiahnuť a nainštalovať aktualizáciu?',
      buttons: ['Stiahnuť', 'Neskôr'],
      defaultId: 0,
      cancelId: 1,
    })
    if (response === 0) {
      autoUpdater.downloadUpdate()
    }
  })

  autoUpdater.on('update-not-available', () => {
    console.log('[admin] App is up to date.')
  })

  autoUpdater.on('download-progress', (progress) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      const pct = Math.round(progress.percent)
      win.setProgressBar(pct / 100)
    }
  })

  autoUpdater.on('update-downloaded', async (info) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.setProgressBar(-1)
    }
    const version = info?.version ?? ''
    const { response } = await dialog.showMessageBox({
      type: 'info',
      title: 'JOBBIE Admin — aktualizácia pripravená',
      message: version ? `Verzia ${version} je pripravená.` : 'Aktualizácia je pripravená.',
      detail: 'Reštartovať aplikáciu a dokončiť inštaláciu?',
      buttons: ['Reštartovať', 'Neskôr'],
      defaultId: 0,
      cancelId: 1,
    })
    if (response === 0) {
      autoUpdater.quitAndInstall(false, true)
    }
  })

  const check = () => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[admin] checkForUpdates failed:', err)
    })
  }

  // Delay so startup (API + UI) is not competing with the release check.
  setTimeout(check, 12_000)
}

module.exports = { initAutoUpdater, readUpdateToken }
