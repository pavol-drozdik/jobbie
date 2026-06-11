import {
  parseSettingsProfilDeniedKey,
  SETTINGS_PROFIL_PATH,
} from '~/utils/dashboard-role-denied'

export default defineNuxtRouteMiddleware((to) => {
  const key = parseSettingsProfilDeniedKey(to.query.dashboardDenied)
  if (!key) {
    return
  }
  if (to.path === SETTINGS_PROFIL_PATH) {
    return
  }
  return navigateTo({
    path: SETTINGS_PROFIL_PATH,
    query: { dashboardDenied: key },
    replace: true,
  })
})
