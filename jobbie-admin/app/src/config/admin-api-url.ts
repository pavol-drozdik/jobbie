/** Local Nest admin API (packaged Electron always uses localhost). */
export const ADMIN_API_BASE_URL = (
  import.meta.env.VITE_ADMIN_API_URL?.replace(/\/$/, '') ||
  'http://127.0.0.1:3099'
).trim()
