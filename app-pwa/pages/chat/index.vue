<template>
  <div class="chat-page-root mt-[30px] flex min-h-0 flex-col bg-marketing-mint px-0 pb-3 pt-0 max-[700px]:min-h-0 max-[700px]:flex-none max-[700px]:px-[10px] min-[701px]:-mx-3 min-[701px]:mt-0 min-[701px]:flex-1 min-[701px]:min-h-[calc(100dvh-5.5rem)]">
    <div
      class="relative flex w-full min-h-0 flex-col overflow-hidden bg-white max-[700px]:mt-0 max-[700px]:h-[calc(100dvh-0.625rem-3.5rem-max(0.25rem,env(safe-area-inset-top,0px)))] max-[700px]:max-h-[calc(100dvh-0.625rem-3.5rem-max(0.25rem,env(safe-area-inset-top,0px)))] max-[700px]:shrink-0 max-[700px]:flex-none max-[700px]:rounded-[20px] min-[701px]:mx-auto min-[701px]:mt-[30px] min-[701px]:flex-1 min-[701px]:max-h-[calc(100dvh-6rem)] min-[701px]:max-w-[1400px] min-[701px]:min-h-[calc(100dvh-6rem)] min-[701px]:flex-row min-[701px]:rounded-[20px]"
    >
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
