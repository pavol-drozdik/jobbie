<template>
  <div
    class="px-4 py-4 sm:px-5"
    :class="!isFirst ? 'border-t border-black/[0.06]' : ''"
  >
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
      <div class="min-w-0 flex-1 lg:max-w-[42%]">
        <p class="m-0 font-dmSans text-[15px] font-bold leading-snug text-black">
          {{ row.label }}
        </p>
        <p class="m-0 mt-1 font-dmSans text-[13px] leading-snug text-black/50">
          {{ row.description }}
        </p>
        <NuxtLink
          v-if="showAuxLinks && categoryKey === 'job_email_alerts'"
          to="/ponuky-na-email"
          class="mt-2 inline-flex font-dmSans text-[13px] font-semibold text-marketing-green hover:underline"
        >
          {{ S.settingsNotifyManageJobAlerts }}
        </NuxtLink>
      </div>
      <div
        class="grid w-full grid-cols-3 gap-3 lg:max-w-[min(100%,24rem)] lg:flex-1"
        role="group"
        :aria-label="row.label"
      >
        <div
          v-for="ch in visibleChannels"
          :key="ch"
          class="flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-xl border border-black/[0.06] bg-white px-2 py-2.5"
        >
          <AppIcon :name="channelIcon(ch)" :size="16" class="text-marketing-green/80" />
          <span class="sr-only">{{ channelLabel(ch) }}</span>
          <AppSettingsSwitch
            :id="switchId(ch)"
            v-model="props.matrix[props.categoryKey][ch]"
            :label="`${row.label} — ${channelLabel(ch)}`"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  NOTIFY_UI_CHANNELS,
  type NotifyCat,
  type NotifyCh,
  channelIcon,
  channelLabel,
  isChannelShownForCategory,
  notifyCategoryRow,
} from '~/composables/useNotificationPreferencesMatrix'
import { S } from '~/utils/strings'

const props = withDefaults(
  defineProps<{
    categoryKey: NotifyCat
    matrix: Record<NotifyCat, Record<NotifyCh, boolean>>
    isFirst?: boolean
    idPrefix?: string
    showAuxLinks?: boolean
  }>(),
  { showAuxLinks: true, isFirst: false, idPrefix: undefined },
)

const row = computed(() => notifyCategoryRow(props.categoryKey))

const visibleChannels = computed(() =>
  NOTIFY_UI_CHANNELS.filter((ch) => isChannelShownForCategory(props.categoryKey, ch)),
)

function switchId(ch: NotifyCh): string {
  const prefix = props.idPrefix ?? 'notify'
  return `${prefix}-${props.categoryKey}-${ch}`
}
</script>
