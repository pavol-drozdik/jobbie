<template>
  <aside
    class="flex h-full min-h-0 w-full min-w-0 flex-col border-r border-black/[0.07] bg-white min-[701px]:w-[360px] min-[701px]:min-w-[360px] min-[701px]:max-w-[360px]"
  >
    <div class="shrink-0 border-b border-black/[0.07] px-5 pb-4 pt-6">
      <h3 class="mb-3.5 text-[26px] font-extrabold leading-none tracking-tight text-black">
        {{ S.chatInboxTitle }}
      </h3>
      <div class="flex h-11 items-center gap-2.5 rounded-full bg-marketing-soft px-4">
        <AppIcon name="search" :size="15" class="shrink-0 text-black/30" />
        <input
          v-model="localQuery"
          type="search"
          autocomplete="off"
          class="min-w-0 flex-1 border-0 bg-transparent text-base text-black outline-none placeholder:text-black/30"
          :placeholder="S.chatSearchConversations"
        >
      </div>
    </div>
    <p v-if="loading" class="px-5 py-4 text-base text-black/45">{{ S.loading }}</p>
    <p v-else-if="displayRooms.length === 0" class="px-5 py-4 text-base text-black/45">{{ S.noConversations }}</p>
    <ul v-else class="min-h-0 flex-1 overflow-y-auto">
      <li v-for="room in displayRooms" :key="room.id">
        <NuxtLink
          :to="ROUTES.chatRoom(room.id)"
          custom
          v-slot="{ href, navigate }"
        >
          <a
            :href="href"
            class="relative flex cursor-pointer items-center gap-3.5 px-5 py-3.5 no-underline text-inherit transition-colors hover:bg-[#f7fdf9]"
            :class="[
              room.id === activeRoomId ? 'bg-marketing-mint' : '',
              openingRoomId === room.id ? 'pointer-events-none opacity-60' : '',
            ]"
            @click="onRoomLinkClick($event, room.id, navigate)"
          >
          <span
            v-if="room.id === activeRoomId"
            class="absolute bottom-0 left-0 top-0 w-[3px] rounded-r bg-marketing-green"
            aria-hidden="true"
          />
          <div
            class="relative flex size-[52px] shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
            :style="{ backgroundColor: avatarColor(room.other_user_id) }"
          >
            {{ initials(room.other_user_name, room.other_user_id) }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="mb-0.5 flex items-center justify-between gap-2">
              <span class="truncate text-[17px] font-bold text-black">{{
                room.other_user_name || 'Konverzácia'
              }}</span>
              <span class="shrink-0 text-[13px] text-black/35">{{ formatConvTime(room.last_message_at) }}</span>
            </div>
            <div
              v-if="room.job_title"
              class="mb-1 inline-flex max-w-full items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-marketing-panel px-2.5 py-0.5 text-xs font-semibold text-marketing-green"
            >
              <AppIcon name="briefcase" :size="10" class="shrink-0 text-marketing-green" />
              <span class="truncate">{{ room.job_title }}</span>
            </div>
            <div class="flex items-center justify-between gap-1.5">
              <span
                class="min-w-0 flex-1 truncate text-[15px]"
                :class="(room.unread_count ?? 0) > 0 ? 'font-semibold text-black/75' : 'text-black/45'"
              >{{ room.last_message_preview || S.chat }}</span>
              <span
                v-if="(room.unread_count ?? 0) > 0"
                class="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marketing-green px-1 text-xs font-bold text-white"
              >{{ room.unread_count }}</span>
            </div>
          </div>
        </a>
        </NuxtLink>
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import type { ChatRoomListItem } from '~/types/chat'

const props = defineProps<{
  rooms: ChatRoomListItem[]
  loading: boolean
  activeRoomId: string | null
}>()

const { api } = useApi()
const openingRoomId = ref<string | null>(null)
const localQuery = ref('')

async function prefetchRoom(roomId: string): Promise<void> {
  await Promise.all([
    api(`/api/chat/rooms/${roomId}`),
    api(`/api/chat/rooms/${roomId}/messages`, {
      query: { limit: '300', offset: '0' },
    }),
  ])
}

async function openRoom(roomId: string, navigate: () => void): Promise<void> {
  if (openingRoomId.value) return
  openingRoomId.value = roomId
  try {
    await prefetchRoom(roomId)
  } catch {
    /* still open thread; page will load */
  } finally {
    openingRoomId.value = null
  }
  navigate()
}

function onRoomLinkClick(e: MouseEvent, roomId: string, navigate: () => void): void {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
  e.preventDefault()
  void openRoom(roomId, navigate)
}

const AVATAR_PALETTE = ['#7c3aed', '#0ea5e9', '#f59e0b', '#ef4444', '#10b981', '#6366f1']

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function avatarColor(userId: string): string {
  return AVATAR_PALETTE[hashStr(userId) % AVATAR_PALETTE.length]
}

function initials(name: string | null, fallbackId: string): string {
  const n = (name ?? '').trim()
  if (n.length > 0) {
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
    }
    return n.slice(0, 2).toUpperCase()
  }
  return fallbackId.replace(/-/g, '').slice(0, 2).toUpperCase() || '?'
}

function formatConvTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  if (isYesterday) return 'Vč.'
  return d.toLocaleDateString('sk-SK', { weekday: 'short' })
}

const displayRooms = computed(() => {
  const q = localQuery.value.trim().toLowerCase()
  const list = props.rooms ?? []
  if (!q) return list
  return list.filter((r) => {
    const name = (r.other_user_name ?? '').toLowerCase()
    const job = (r.job_title ?? '').toLowerCase()
    const prev = (r.last_message_preview ?? '').toLowerCase()
    return name.includes(q) || job.includes(q) || prev.includes(q)
  })
})
</script>
