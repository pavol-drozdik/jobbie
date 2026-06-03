<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: ['auth'] })

onMounted(() => {
  void navigateTo('/nastavenia', { redirectCode: 301 })
})
</script>
