<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Button from 'primevue/button'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'
import { useAdminAuth } from '../composables/adminAuth'
import { adminApi } from '../composables/adminApi'
import { formatAdminApiError } from '../utils/format-admin-api-error'
import {
  BRAND_FAVICON_PATH,
  BRAND_LOGO_WHITE_PATH,
} from '../utils/brand-assets'

const email = ref('')
const password = ref('')

const { signIn, signOut, loading, authError } = useAdminAuth()
const router = useRouter()
const route = useRoute()

const highlights = [
  {
    icon: 'pi pi-shield',
    title: 'Operátorský prístup',
    text: 'Len účty s oprávnením administrátora platformy.',
  },
  {
    icon: 'pi pi-chart-line',
    title: 'Prehľad a analytika',
    text: 'Moderácia, podpora, fakturácia a infraštruktúra na jednom mieste.',
  },
  {
    icon: 'pi pi-lock',
    title: 'Zabezpečené prihlásenie',
    text: 'Lokálna desktop aplikácia s overením cez Supabase.',
  },
]

async function verifyAdminOperator(): Promise<boolean> {
  const res = await adminApi('/admin/overview')
  if (res.ok) {
    return true
  }
  const { message } = formatAdminApiError(res.status, res.body)
  authError.value = message
  await signOut()
  return false
}

async function submitLogin() {
  const ok = await signIn(email.value, password.value)
  if (!ok) return
  const verified = await verifyAdminOperator()
  if (!verified) return
  await router.replace((route.query.redirect as string) || '/overview')
}
</script>

<template>
  <div class="login-page flex min-h-screen flex-col lg:flex-row">
    <!-- Brand panel -->
    <aside
      class="relative flex shrink-0 flex-col justify-between overflow-hidden bg-slate-900 px-6 py-8 text-white sm:px-10 sm:py-10 lg:w-[min(44%,28rem)] lg:min-h-screen lg:px-12 lg:py-12 xl:w-[min(46%,32rem)]"
      aria-hidden="true"
    >
      <div
        class="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-500/20 blur-3xl"
      />
      <div
        class="pointer-events-none absolute -bottom-16 right-0 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl"
      />
      <div
        class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(46,204,64,0.12),transparent_55%)]"
      />

      <div class="relative z-10">
        <div class="mb-10 hidden lg:block">
          <img
            :src="BRAND_LOGO_WHITE_PATH"
            alt="JOBBIE"
            width="148"
            height="44"
            class="h-9 w-auto max-w-[11rem]"
            decoding="async"
            fetchpriority="high"
          />
          <p class="mt-3 text-sm font-medium text-primary-300">Operátorský panel</p>
        </div>

        <div class="mb-8 flex items-center gap-3 lg:hidden">
          <img
            :src="BRAND_FAVICON_PATH"
            alt=""
            width="40"
            height="40"
            class="size-10 shrink-0 rounded-[10px] shadow-lg shadow-primary-900/40"
            decoding="async"
          />
          <div>
            <p class="m-0 text-base font-bold tracking-tight">JOBBIE Admin</p>
            <p class="m-0 text-xs text-slate-400">Operátorský panel</p>
          </div>
        </div>

        <h1 class="m-0 max-w-sm text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
          Správa platformy na jednom mieste
        </h1>
        <p class="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
          Prihláste sa do lokálnej desktop aplikácie. Vyžaduje účet s
          <code class="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-primary-200">app_role = admin</code>.
        </p>

        <ul class="mt-8 hidden space-y-4 lg:block">
          <li
            v-for="item in highlights"
            :key="item.title"
            class="flex gap-3"
          >
            <span
              class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-800/80 text-primary-400"
            >
              <i :class="item.icon" class="text-sm" />
            </span>
            <div>
              <p class="m-0 text-sm font-semibold text-white">{{ item.title }}</p>
              <p class="m-0 mt-0.5 text-xs leading-relaxed text-slate-400">{{ item.text }}</p>
            </div>
          </li>
        </ul>
      </div>

      <p class="relative z-10 m-0 hidden text-xs text-slate-500 lg:block">
        © {{ new Date().getFullYear() }} JOBBIE · Interný nástroj
      </p>
    </aside>

    <!-- Form panel -->
    <main
      class="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-6 py-10 sm:px-10"
    >
      <div class="w-full max-w-md">
        <header class="mb-8">
          <div class="mb-4 hidden items-center gap-2 lg:flex">
            <img
              :src="BRAND_FAVICON_PATH"
              alt=""
              width="32"
              height="32"
              class="size-8 rounded-lg"
              decoding="async"
            />
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Admin
            </span>
          </div>
          <h2 class="m-0 text-2xl font-bold tracking-tight text-slate-900">Prihlásenie</h2>
          <p class="mt-2 m-0 text-sm text-slate-500">
            Zadajte prihlasovacie údaje operátorského účtu.
          </p>
        </header>

        <form
          class="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/60 sm:p-8"
          @submit.prevent="submitLogin"
        >
          <div class="space-y-5">
            <div class="flex flex-col gap-2">
              <label for="login-email" class="text-sm font-medium text-slate-700">
                E-mail
              </label>
              <IconField class="w-full">
                <InputIcon class="pi pi-envelope" />
                <InputText
                  id="login-email"
                  v-model="email"
                  type="email"
                  class="w-full"
                  autocomplete="username"
                  placeholder="operator@example.sk"
                />
              </IconField>
            </div>

            <div class="flex flex-col gap-2">
              <label for="login-password" class="text-sm font-medium text-slate-700">
                Heslo
              </label>
              <IconField class="w-full">
                <InputIcon class="pi pi-lock" />
                <Password
                  id="login-password"
                  v-model="password"
                  class="w-full login-password"
                  input-class="w-full"
                  :feedback="false"
                  toggle-mask
                  autocomplete="current-password"
                  @keyup.enter="submitLogin"
                />
              </IconField>
            </div>

            <Button
              type="submit"
              label="Prihlásiť sa"
              icon="pi pi-sign-in"
              class="w-full !py-2.5"
              :loading="loading"
            />

            <Message v-if="authError" severity="error" :closable="false">
              {{ authError }}
            </Message>
          </div>
        </form>

        <p class="mt-6 text-center text-xs text-slate-400 lg:hidden">
          © {{ new Date().getFullYear() }} JOBBIE · Interný nástroj
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.login-page :deep(.login-password) {
  width: 100%;
}

.login-page :deep(.login-password .p-password-input),
.login-page :deep(.p-inputtext) {
  border-radius: 0.5rem;
}

.login-page :deep(.p-button) {
  border-radius: 0.5rem;
  font-weight: 600;
}
</style>
