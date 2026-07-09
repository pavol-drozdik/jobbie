import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import App from './App.vue'
import { router } from './router'
import AdminPreset from './theme/admin-preset'
import './assets/main.css'

const app = createApp(App)

app.use(PrimeVue, {
  theme: {
    preset: AdminPreset,
    options: {
      darkModeSelector: false,
    },
  },
})
app.use(ConfirmationService)
app.use(ToastService)
app.use(router)
app.mount('#app')
