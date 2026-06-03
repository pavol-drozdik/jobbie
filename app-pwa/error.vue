<template>
  <NuxtLayout name="app">
    <AppHttpErrorPage :error="error" />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import { isNotFoundError } from '~/utils/not-found'

const error = useError()

useHead(() => ({
  title: isNotFoundError(error.value)
    ? S.errorPageTitle404
    : S.errorPageTitleError,
}))
</script>
