<template>
  <div ref="rootEl" class="relative font-dmSans">
    <button
      type="button"
      class="relative flex items-center justify-center rounded-xl p-2 font-dmSans text-sm font-semibold outline-none ring-marketing-green transition-colors focus-visible:ring-2"
      :class="
        variant === 'mobile'
          ? 'text-black/80 hover:bg-black/5'
          : 'text-gray-600 hover:bg-marketing-mint hover:text-gray-900'
      "
      :aria-expanded="open"
      :aria-label="S.notificationsAriaLabel"
      @click.stop="toggleOpen"
    >
      <AppIcon name="bell" :size="iconSize" />
      <span
        v-if="unreadCount > 0"
        class="absolute right-1 top-1 size-2 rounded-full bg-marketing-green ring-2 ring-white"
        aria-hidden="true"
      />
      <span v-if="unreadCount > 0" class="sr-only">{{ unreadCount }} neprečítaných</span>
    </button>
    <div
      v-show="open"
      class="z-50 font-dmSans antialiased"
      :class="
        variant === 'mobile'
          ? 'fixed inset-x-0 top-[calc(0.625rem+4.375rem+max(0.25rem,env(safe-area-inset-top,0px))+10px)] mx-auto w-[calc(100vw-1.5rem)]'
          : 'absolute left-1/2 top-full w-[22rem] -translate-x-1/2 pt-[30px]'
      "
      role="menu"
      :aria-label="S.notificationsAriaLabel"
    >
      <div class="overflow-hidden rounded-2xl border border-black/10 bg-white p-4 shadow-[0_12px_28px_rgba(0,0,0,0.12)]">
        <div class="mb-1 flex items-center justify-between border-b border-black/5 px-2 pb-2 pt-0.5">
          <span class="text-[15px] font-extrabold tracking-tight text-black">{{ S.notificationsAriaLabel }}</span>
          <span
            v-if="unreadCount > 0"
            class="rounded-full bg-marketing-mint px-2 py-0.5 text-[13px] font-bold text-marketing-green"
          >{{ unreadCount }}</span>
        </div>
        <div class="max-h-80 overflow-y-auto overscroll-contain pr-0.5">
          <p v-if="loading && items.length === 0" class="px-3 py-6 text-center text-[15px] font-medium text-black/45">
            {{ S.notificationsLoading }}
          </p>
          <p v-else-if="items.length === 0" class="px-3 py-6 text-center text-[15px] font-medium text-black/45">
            {{ S.notificationsEmpty }}
          </p>
          <ul v-else class="flex flex-col gap-0.5">
            <li v-for="item in items" :key="item.id">
              <button
                type="button"
                class="flex w-full gap-2 rounded-[10px] px-2 py-2.5 text-left font-dmSans text-[15px] outline-none transition-colors hover:bg-marketing-mint focus-visible:ring-2 focus-visible:ring-marketing-green/35"
                :class="item.read_at ? 'text-black/60' : 'text-black'"
                role="menuitem"
                @click="onSelectItem(item)"
              >
                <span class="flex w-5 shrink-0 justify-center pt-1" aria-hidden="true">
                  <span v-if="!item.read_at" class="size-2 rounded-full bg-marketing-green shadow-sm" />
                </span>
                <span class="flex min-w-0 flex-col gap-0.5">
                  <span class="leading-snug" :class="item.read_at ? 'font-semibold' : 'font-extrabold'">{{
                    item.title
                  }}</span>
                  <span v-if="subtitle(item)" class="line-clamp-2 text-sm font-medium leading-snug text-black/55">{{
                    subtitle(item)
                  }}</span>
                  <span class="text-xs font-medium text-black/40">{{ formatTime(item.created_at) }}</span>
                </span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Dropdown uses useNotifications (refresh on open + realtime reconnect).
import { S } from '~/utils/strings'
import { resolveSafeInternalPath } from '~/utils/safe-navigation'
import type { NotificationItem } from '~/composables/useNotifications'

const props = withDefaults(
  defineProps<{
    variant?: 'desktop' | 'mobile'
  }>(),
  { variant: 'desktop' },
)

const rootEl = ref<HTMLElement | null>(null)
const open = ref(false)
const { items, unreadCount, loading, refresh, markRead, markAllAsRead, startPolling, stopPolling, formatTime } =
  useNotifications()

const iconSize = computed(() => 20)

function subtitle(item: NotificationItem): string {
  const b = item.body?.trim()
  if (b) return b
  if (item.type === 'weekly_digest') return S.notificationsSubtitleDigest
  if (item.type === 'reengagement') return S.notificationsSubtitleReengagement
  if (item.type === 'admin_broadcast') return S.notificationsSubtitleBroadcast
  if (item.type === 'payment_received') return S.notificationsSubtitlePayment
  if (item.type === 'application_status') return S.notificationsSubtitleApplicationStatus
  if (item.type === 'job_status') return S.notificationsSubtitleJobStatus
  if (item.type === 'security_alert') return S.notificationsSubtitleSecurity
  if (item.type === 'chat_message') return S.notificationsSubtitleChatMessage
  if (item.type === 'job_application') return S.notificationsSubtitleJobApplication
  return ''
}

function toggleOpen(): void {
  open.value = !open.value
  if (open.value) {
    if (import.meta.client) {
      window.dispatchEvent(new CustomEvent('jobbie:notification-menu-opened', { detail: { variant: props.variant } }))
    }
    void (async () => {
      await markAllAsRead()
      // Sync list after mark-all; silent when we already have rows (no flash).
      await refresh({ silent: items.value.length > 0 })
    })()
  }
}

async function onSelectItem(item: NotificationItem): Promise<void> {
  await markRead(item.id)
  open.value = false
  const path = resolveSafeInternalPath(item.link_path, '/')
  await navigateTo(path)
}

function onDocumentClick(ev: MouseEvent): void {
  if (!open.value) return
  const el = rootEl.value
  if (el && !el.contains(ev.target as Node)) {
    open.value = false
  }
}

function onForceClose(): void {
  open.value = false
}

onMounted(() => {
  void refresh({ silent: items.value.length > 0 })
  startPolling()
  document.addEventListener('click', onDocumentClick)
  if (import.meta.client) {
    window.addEventListener('jobbie:close-notification-menu', onForceClose as EventListener)
  }
})

onUnmounted(() => {
  stopPolling()
  document.removeEventListener('click', onDocumentClick)
  if (import.meta.client) {
    window.removeEventListener('jobbie:close-notification-menu', onForceClose as EventListener)
  }
})
</script>
