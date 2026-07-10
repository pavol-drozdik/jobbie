const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('jobbieAdmin', {
  platform: process.platform,
  getApiBootstrapStatus: () => ipcRenderer.invoke('admin:getApiBootstrapStatus'),
  openUserDataFolder: () => ipcRenderer.invoke('admin:openUserDataFolder'),
})
