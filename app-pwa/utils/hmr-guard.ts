/** True while Vite is applying an HMR update (avoid auth storms mid-reload). */
export function isAppHmrUpdating(): boolean {
  if (!import.meta.client || !import.meta.hot) {
    return false
  }
  return import.meta.hot.data.jbHmrUpdating === true
}

export function registerAppHmrGuard(): void {
  if (!import.meta.hot) {
    return
  }
  import.meta.hot.on('vite:beforeUpdate', () => {
    import.meta.hot!.data.jbHmrUpdating = true
  })
  import.meta.hot.on('vite:afterUpdate', () => {
    import.meta.hot!.data.jbHmrUpdating = false
  })
}
