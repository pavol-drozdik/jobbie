<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import Drawer from 'primevue/drawer'
import { adminNavGroups } from '../../config/admin-nav'
import { useModerationCount } from '../../composables/useModerationCount'

const props = defineProps<{
  collapsed: boolean
  onLogout: () => void
}>()

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
}>()

const route = useRoute()
const mobileOpen = ref(false)
const isMobile = ref(false)

const {
  count: moderationCount,
  canAccess: moderationCanAccess,
} = useModerationCount()

const visibleGroups = computed(() =>
  adminNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.requiresModeration || moderationCanAccess.value,
      ),
    }))
    .filter((group) => group.items.length > 0),
)

function isActive(path: string): boolean {
  if (path === '/support') {
    return route.path === '/support' || route.path.startsWith('/support/')
  }
  if (path === '/blog') {
    return route.path === '/blog' || route.path.startsWith('/blog/')
  }
  return route.path === path || route.path.startsWith(`${path}/`)
}

function toggleCollapsed() {
  emit('update:collapsed', !props.collapsed)
}

function closeMobile() {
  mobileOpen.value = false
}

function checkMobile() {
  isMobile.value = window.innerWidth < 900
  if (!isMobile.value) {
    mobileOpen.value = false
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

watch(
  () => route.path,
  () => {
    closeMobile()
  },
)
</script>

<template>
  <!-- Mobile menu trigger -->
  <div
    v-if="isMobile"
    class="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 text-white"
  >
    <div class="text-sm font-bold tracking-tight">
      JOBBIE <span class="text-primary-400">Admin</span>
    </div>
    <Button
      icon="pi pi-bars"
      severity="secondary"
      text
      rounded
      class="!text-white"
      aria-label="Menu"
      @click="mobileOpen = true"
    />
  </div>

  <!-- Desktop sidebar -->
  <aside
    v-if="!isMobile"
    class="flex shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-white transition-all duration-200"
    :class="collapsed ? 'w-16' : 'w-60'"
  >
    <div
      class="flex items-center border-b border-slate-800 px-3 py-4"
      :class="collapsed ? 'justify-center' : 'justify-between'"
    >
      <div v-if="!collapsed" class="px-1 text-sm font-bold tracking-tight">
        JOBBIE <span class="text-primary-400">Admin</span>
      </div>
      <Button
        :icon="collapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'"
        severity="secondary"
        text
        rounded
        size="small"
        class="!text-slate-400"
        :aria-label="collapsed ? 'Rozbaliť menu' : 'Zbaliť menu'"
        @click="toggleCollapsed"
      />
    </div>

    <nav class="flex flex-1 flex-col gap-4 overflow-y-auto p-2">
      <div v-for="group in visibleGroups" :key="group.id">
        <p
          v-if="group.label && !collapsed"
          class="mb-1 px-2 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500"
        >
          {{ group.label }}
        </p>
        <RouterLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="relative mb-0.5 flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          :class="[
            isActive(item.to) ? 'bg-slate-800 text-white' : '',
            collapsed ? 'justify-center' : '',
          ]"
          :title="collapsed ? item.label : undefined"
        >
          <span
            v-if="isActive(item.to)"
            class="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary-500"
          />
          <i :class="[item.icon, 'text-base']" />
          <span v-if="!collapsed" class="flex-1">{{ item.label }}</span>
          <Badge
            v-if="!collapsed && item.badge && moderationCount > 0"
            :value="moderationCount > 99 ? '99+' : moderationCount"
            severity="danger"
            class="ml-auto"
          />
          <Badge
            v-else-if="collapsed && item.badge && moderationCount > 0"
            severity="danger"
            class="absolute -right-0.5 -top-0.5 min-w-4 text-[0.6rem]"
          />
        </RouterLink>
      </div>
    </nav>

    <div class="border-t border-slate-800 p-2">
      <Button
        :label="collapsed ? undefined : 'Odhlásiť'"
        icon="pi pi-sign-out"
        severity="secondary"
        text
        class="w-full !justify-start !text-slate-300 hover:!text-white"
        :class="collapsed ? '!justify-center' : ''"
        @click="onLogout"
      />
    </div>
  </aside>

  <!-- Mobile drawer -->
  <Drawer
    v-model:visible="mobileOpen"
    position="left"
    class="!w-72"
    :pt="{
      root: { class: '!bg-slate-900 !text-white' },
      header: { class: '!bg-slate-900 !text-white !border-slate-800' },
      content: { class: '!bg-slate-900 !p-0' },
    }"
  >
    <template #header>
      <span class="text-sm font-bold">
        JOBBIE <span class="text-primary-400">Admin</span>
      </span>
    </template>

    <nav class="flex flex-col gap-4 p-3">
      <div v-for="group in visibleGroups" :key="group.id">
        <p
          v-if="group.label"
          class="mb-1 px-2 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500"
        >
          {{ group.label }}
        </p>
        <RouterLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="relative mb-0.5 flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          :class="isActive(item.to) ? 'bg-slate-800 text-white' : ''"
          @click="closeMobile"
        >
          <i :class="item.icon" />
          <span class="flex-1">{{ item.label }}</span>
          <Badge
            v-if="item.badge && moderationCount > 0"
            :value="moderationCount > 99 ? '99+' : moderationCount"
            severity="danger"
          />
        </RouterLink>
      </div>
    </nav>

    <div class="border-t border-slate-800 p-3">
      <Button
        label="Odhlásiť"
        icon="pi pi-sign-out"
        severity="secondary"
        text
        class="w-full !justify-start !text-slate-300"
        @click="onLogout"
      />
    </div>
  </Drawer>
</template>
