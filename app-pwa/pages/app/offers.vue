<template>
  <div v-if="user" />
  <LoggedOutFeatureHero
    v-else
    title="Dostávaj pracovné ponuky na email"
    description="Nastav si upozornenia a dostávaj nové pracovné ponuky priamo na email."
    :benefits="[
      'Nové ponuky podľa tvojich preferencií',
      'Upozornenia priamo do emailu',
      'Jednoduché zapnutie alebo vypnutie upozornení',
    ]"
    image-src="/home-design/feature-newsletter.webp"
    image-alt="Upozornenia na pracovné ponuky"
    :redirect-path="redirectPath"
  />
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import LoggedOutFeatureHero from '~/components/marketing/LoggedOutFeatureHero.vue'

definePageMeta({ layout: 'app' })

const route = useRoute()
const { user, profile, loading } = useAuth()
const redirectPath = computed(() => route.fullPath || '/ponuky-na-email')

watchEffect(() => {
  if (!user.value) {
    return
  }
  if (loading.value) {
    return
  }
  const isCompany =
    profile.value?.role === 'company' || user.value.role === 'company'
  if (isCompany && !profile.value?.worker_role) {
    void navigateTo({ path: ROUTES.jobHub }, { replace: true })
    return
  }
  void navigateTo({ path: '/ponuky-na-email' }, { replace: true })
})
</script>
