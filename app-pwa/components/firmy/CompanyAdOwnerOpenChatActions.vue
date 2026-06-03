<template>
  <div class="flex w-full flex-col gap-2" :class="wrapperClass">
    <button
      type="button"
      :class="buttonClass"
      :disabled="chatLoading"
      @click="onMessageClick"
    >
      <AppIcon name="chat" :size="18" class="shrink-0" :class="iconClass" />
      {{ chatLoading ? S.loading : S.profilePublicCtaMessage }}
    </button>
    <div
      v-if="chatPickerApps.length"
      class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3"
    >
      <p class="m-0 mb-2 text-sm font-semibold text-amber-950">
        {{ S.profilePublicChatPickApplication }}
      </p>
      <div class="flex flex-col gap-2">
        <button
          v-for="a in chatPickerApps"
          :key="a.id"
          type="button"
          class="rounded-lg border border-amber-200 bg-white px-3 py-2 text-left text-sm font-medium text-black hover:bg-amber-100/80"
          :disabled="chatLoading"
          @click="selectApplicationAndOpenChat(a.id)"
        >
          {{ a.job_title || 'Ponuka' }}
          <span class="text-black/45">({{ a.status }})</span>
        </button>
      </div>
    </div>
    <p v-if="chatError" class="m-0 text-center text-sm text-red-600">{{ chatError }}</p>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

const props = withDefaults(
  defineProps<{
    ownerId: string
    variant?: 'primary' | 'outline'
    wrapperClass?: string
  }>(),
  { variant: 'primary', wrapperClass: '' },
)

const route = useRoute()
const { user } = useAuth()
const { postOpenChat, navigateToChatRoom } = useProfileOpenChat()

const chatLoading = ref(false)
const chatError = ref<string | null>(null)
const chatPickerApps = ref<Array<{ id: string; job_title: string | null; status: string }>>([])

const buttonClass = computed(() => {
  if (props.variant === 'outline') {
    return 'inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full border-[1.5px] border-gray-200 bg-marketing-soft px-5 text-[15px] font-semibold text-black transition-colors hover:border-marketing-green hover:text-marketing-green disabled:cursor-wait disabled:opacity-70'
  }
  return 'flex h-14 w-full items-center justify-center gap-2 rounded-full border-none bg-marketing-green text-lg font-bold text-white transition-opacity hover:opacity-[0.88] disabled:cursor-wait disabled:opacity-70'
})

const iconClass = computed(() => (props.variant === 'outline' ? '' : 'text-white'))

const loginChatHref = computed(
  () => `/auth/login?redirect=${encodeURIComponent(route.fullPath)}`,
)

async function onMessageClick(): Promise<void> {
  const ownerId = props.ownerId.trim()
  if (!ownerId) return
  if (!user.value?.id) {
    await navigateTo(loginChatHref.value)
    return
  }
  chatError.value = null
  chatPickerApps.value = []
  chatLoading.value = true
  const res = await postOpenChat(ownerId)
  chatLoading.value = false
  if (!res.ok) {
    chatError.value = res.error ?? 'Chyba'
    return
  }
  if (!res.data) {
    chatError.value = 'Prázdna odpoveď'
    return
  }
  if ('room_id' in res.data) {
    await navigateToChatRoom(res.data.room_id)
    return
  }
  chatPickerApps.value = res.data.applications ?? []
}

async function selectApplicationAndOpenChat(applicationId: string): Promise<void> {
  const ownerId = props.ownerId.trim()
  if (!ownerId) return
  chatError.value = null
  chatLoading.value = true
  const res = await postOpenChat(ownerId, { application_id: applicationId })
  chatLoading.value = false
  if (!res.ok) {
    chatError.value = res.error ?? 'Chyba'
    return
  }
  if (res.data && 'room_id' in res.data) {
    chatPickerApps.value = []
    await navigateToChatRoom(res.data.room_id)
  }
}
</script>
