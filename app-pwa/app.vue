<template>
  <div class="relative min-h-0 min-w-0">
    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="pwa && pwa.needRefresh"
          class="safe-pwa-banner fixed bottom-0 left-0 right-0 z-[200] flex flex-wrap items-center justify-center gap-3 border-t border-black/10 bg-white px-4 py-3 text-center shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
          role="status"
        >
          <p class="m-0 max-w-[min(40rem,calc(100vw-2rem))] text-sm font-semibold text-black/85">
            {{ S.pwaUpdateAvailable }}
          </p>
          <div class="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              class="is-clickable rounded-full border-none bg-marketing-green px-4 py-2 text-sm font-bold text-white outline-none ring-marketing-green transition-opacity hover:opacity-90 focus-visible:ring-2"
              @click="onPwaRefresh"
            >
              {{ S.pwaUpdateRefresh }}
            </button>
            <button
              type="button"
              class="is-clickable rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black/80 outline-none ring-marketing-green transition-colors hover:bg-black/[0.04] focus-visible:ring-2"
              @click="onPwaDismiss"
            >
              {{ S.pwaUpdateLater }}
            </button>
          </div>
        </div>
      </Teleport>
    </ClientOnly>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ClientOnly>
      <AppConfirmHost />
      <AppSquareImageCropHost />
    </ClientOnly>
    <ClientOnly>
      <AppCookieConsentHost />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

const pwa = usePWA()
const { syncIfGranted: syncWebPushIfGranted } = useWebPushRegistration()

async function onPwaRefresh(): Promise<void> {
  if (!pwa) return
  try {
    await pwa.updateServiceWorker(true)
  } catch {
    window.location.reload()
    return
  }
  // vite-pwa reloads on `controlling`; hard-reload if the SW never activates.
  window.setTimeout(() => {
    if (pwa?.needRefresh) {
      window.location.reload()
    }
  }, 1200)
  void syncWebPushIfGranted()
}

function onPwaDismiss(): void {
  if (!pwa) return
  void pwa.cancelPrompt()
}
</script>

<style scoped>
.safe-pwa-banner {
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0px));
}
</style>
