<template>
  <div
    class="flex flex-col gap-3 border-b border-black/[0.06] bg-black/[0.02] px-4 py-3 sm:px-5 lg:flex-row lg:items-end lg:justify-between lg:gap-6"
    role="row"
  >
    <p class="m-0 font-dmSans text-[13px] font-semibold text-black/45 lg:max-w-[42%] lg:flex-1">
      {{ S.settingsNotifyChannelHeaderCategory }}
    </p>
    <div
      class="grid w-full grid-cols-3 gap-3 lg:max-w-[min(100%,24rem)] lg:flex-1"
      role="presentation"
    >
      <div
        v-for="ch in NOTIFY_UI_CHANNELS"
        :key="ch"
        class="flex flex-col items-center gap-1 text-center"
      >
        <AppIcon :name="channelIcon(ch)" :size="18" class="text-marketing-green" />
        <span class="font-dmSans text-[12px] font-bold leading-tight text-black/75">
          {{ channelLabel(ch) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  NOTIFY_UI_CHANNELS,
  channelIcon,
  channelLabel,
} from '~/composables/useNotificationPreferencesMatrix'
import { S } from '~/utils/strings'
</script>
