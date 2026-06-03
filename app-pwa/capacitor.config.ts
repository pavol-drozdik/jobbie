import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.jobbie.app',
  appName: 'JOBBIE',
  webDir: '.output/public',
  server: {
    // Production: HTTPS only — do not enable cleartext (Android cleartextTrafficPermitted).
    cleartext: false,
    // For local dev with live reload, set url to your Nuxt dev server, e.g.:
    // url: 'http://192.168.1.x:3000',
    // cleartext: true,
  },
}

export default config
