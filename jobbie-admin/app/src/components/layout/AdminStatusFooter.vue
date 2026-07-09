<script setup lang="ts">
defineProps<{
  apiVersion: string | null
  recentLoginMinutes: number | null
}>()
</script>

<template>
  <footer
    v-if="apiVersion"
    class="border-t border-slate-200 bg-white px-6 py-2 text-xs text-slate-500"
  >
    Admin API v{{ apiVersion }}
    <span v-if="recentLoginMinutes != null"> · step-up {{ recentLoginMinutes }} min</span>
  </footer>
</template>
