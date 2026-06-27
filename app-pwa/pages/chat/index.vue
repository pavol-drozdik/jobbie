<template>
  <div :class="chatPageRootClass">
    <div :class="chatShellCardClass">
      <ChatRoomsSidebar
        class="min-h-0 w-full flex-1 min-[701px]:h-full min-[701px]:max-h-[calc(100dvh-6rem)] min-[701px]:w-[360px] min-[701px]:min-w-[360px] min-[701px]:max-w-[360px] min-[701px]:flex-none"
        :rooms="rooms"
        :loading="roomsLoading"
        :active-room-id="null"
      />
      <div
        class="hidden min-h-[20rem] flex-1 flex-col items-center justify-center border-l border-black/[0.07] bg-[#ffffff] px-8 text-center min-[701px]:flex"
      >
        <AppIcon name="chat" :size="56" class="mb-4 text-black/20" />
        <span class="text-xl font-medium text-black/25">{{ S.chatSelectConversation }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import { chatPageRootClass, chatShellCardClass } from '~/utils/marketing-ui'

definePageMeta({
  layout: 'app',
  middleware: ['auth'],
  ssr: false,
})

const { rooms, loading: roomsLoading, refresh } = useChatRooms()

onMounted(() => {
  void refresh({ quiet: rooms.value.length > 0 })
})
</script>
