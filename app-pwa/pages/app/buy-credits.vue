<template>
  <div class="app-shell">
    <div class="frame-surface p-3">
      <ProfileBuyCreditsPanel :embedded="false" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: ['auth', 'billing-access'] })
</script>
