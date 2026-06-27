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
    <p v-if="chatError" class="m-0 text-center text-sm text-red-600">{{ chatError }}</p>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

const props = withDefaults(
  defineProps<{
    companyAdId: string
    variant?: 'primary' | 'outline'
    wrapperClass?: string
  }>(),
  { variant: 'primary', wrapperClass: '' },
)

const route = useRoute()
const { user } = useAuth()
const { postOpenChat, navigateToChatRoom } = useCompanyAdOpenChat()

const chatLoading = ref(false)
const chatError = ref<string | null>(null)

const buttonClass = computed(() => {
  if (props.variant === 'outline') {
    return 'inline-flex h-11 shrink-0 is-clickable items-center justify-center gap-2 whitespace-nowrap rounded-full border-[1.5px] border-gray-200 bg-marketing-soft px-5 text-[15px] font-semibold text-black transition-colors hover:border-marketing-green hover:text-marketing-green disabled:cursor-wait disabled:opacity-70'
  }
  return 'flex h-14 w-full items-center justify-center gap-2 rounded-full border-none bg-marketing-green text-lg font-bold text-white transition-opacity hover:opacity-[0.88] disabled:cursor-wait disabled:opacity-70'
})

const iconClass = computed(() => (props.variant === 'outline' ? '' : 'text-white'))

const loginChatHref = computed(
  () => `/auth/login?redirect=${encodeURIComponent(route.fullPath)}`,
)

async function onMessageClick(): Promise<void> {
  const companyAdId = props.companyAdId.trim()
  if (!companyAdId) return
  if (!user.value?.id) {
    await navigateTo(loginChatHref.value)
    return
  }
  chatError.value = null
  chatLoading.value = true
  const res = await postOpenChat(companyAdId)
  chatLoading.value = false
  if (!res.ok) {
    chatError.value = res.error ?? 'Chyba'
    return
  }
  if (res.data?.room_id) {
    await navigateToChatRoom(res.data.room_id)
  }
}
</script>
