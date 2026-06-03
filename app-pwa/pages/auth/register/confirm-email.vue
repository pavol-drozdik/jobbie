<template>
  <div class="app-shell min-h-screen">
    <div class="frame-surface overflow-x-hidden p-3">
      <div class="mx-auto w-full max-w-md text-center">
        <div class="jobbie-card space-y-4 p-4">
          <h2 class="text-lg font-extrabold tracking-tight" style="color: var(--ink)">{{ S.confirmEmailTitle }}</h2>
          <p class="text-sm" style="color: var(--ink3)">{{ S.confirmEmailMessage }}</p>
          <NuxtLink
            to="/auth/login"
            class="btn-green inline-flex w-full items-center justify-center"
          >
            {{ S.stepIntoApp }}
          </NuxtLink>
          <NuxtLink
            to="/auth/login"
            class="block font-semibold hover:underline"
            style="color: var(--g500)"
          >
            {{ S.alreadyConfirmedSignIn }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

definePageMeta({ layout: 'app' })
</script>
