<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app' })

const route = useRoute()
const router = useRouter()
onMounted(() => {
  void router.replace({ path: '/databaza-zivotopisov', query: { ...route.query } })
})
</script>
