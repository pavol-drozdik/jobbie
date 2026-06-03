<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-x-0 bottom-0 z-[250] flex justify-start p-0 font-dmSans antialiased sm:inset-auto sm:bottom-5 sm:left-5 sm:max-w-md sm:p-0"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="descId"
    >
      <div
        class="w-full rounded-t-2xl border border-black/10 bg-white px-5 py-6 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] sm:rounded-2xl sm:px-6 sm:py-7"
        :class="safeAreaClass"
      >
        <h2
          :id="titleId"
          class="m-0 text-lg font-extrabold leading-snug text-black sm:text-xl"
        >
          {{ S.cookieBannerTitle }}
        </h2>
        <p
          :id="descId"
          class="m-0 mt-3 text-[15px] leading-relaxed text-black/70"
        >
          {{ S.cookieBannerDescription }}
        </p>
        <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <AppButton variant="primary" block class="sm:flex-1" @click="emit('accept-all')">
            {{ S.cookieBannerAcceptAll }}
          </AppButton>
          <AppButton variant="outline" block class="sm:flex-1" @click="emit('reject-all')">
            {{ S.cookieBannerRejectAll }}
          </AppButton>
          <AppButton variant="ghost" block class="sm:w-full" @click="emit('open-preferences')">
            {{ S.cookieBannerSettings }}
          </AppButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import { S } from '~/utils/strings'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'accept-all': []
  'reject-all': []
  'open-preferences': []
}>()

const titleId = useId()
const descId = useId()

const safeAreaClass = 'pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-7'
</script>
