export interface AdminApiBootstrapStatus {
  state: 'idle' | 'starting' | 'healthy' | 'failed'
  logTail: string
  missingEnvKeys: string[]
  exitCode: number | null
  envPath: string | null
  userDataPath?: string
  isPackaged?: boolean
}

export interface JobbieAdminBridge {
  platform: string
  getApiBootstrapStatus: () => Promise<AdminApiBootstrapStatus>
  openUserDataFolder: () => Promise<string>
}

declare global {
  interface Window {
    jobbieAdmin?: JobbieAdminBridge
  }
}

export {}
