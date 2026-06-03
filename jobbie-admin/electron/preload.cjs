const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('jobbieAdmin', {
  platform: process.platform,
})
