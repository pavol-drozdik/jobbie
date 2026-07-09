<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { uploadBlogCover, validateBlogCoverFile } from '../composables/useAdminStorageUpload'

const model = defineModel<string>({ default: '' })

const uploading = ref(false)
const error = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

async function onFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  error.value = validateBlogCoverFile(file)
  if (error.value) return
  uploading.value = true
  error.value = null
  const result = await uploadBlogCover(file)
  uploading.value = false
  if ('error' in result) {
    error.value = result.error
    return
  }
  model.value = result.publicUrl
}

function clearCover() {
  model.value = ''
}

function triggerUpload() {
  fileInput.value?.click()
}
</script>

<template>
  <div>
    <img
      v-if="model"
      :src="model"
      alt="Náhľad titulnej fotky"
      class="cover-upload-preview"
    >
    <div
      v-else
      class="cover-upload-preview flex items-center justify-center text-sm text-slate-500"
    >
      Žiadna titulná fotka
    </div>
    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      class="hidden"
      :disabled="uploading"
      @change="onFileChange"
    >
    <div class="mt-3 flex flex-wrap gap-2">
      <Button
        :label="uploading ? 'Nahrávam…' : model ? 'Nahradiť fotku' : 'Nahrať fotku'"
        :loading="uploading"
        @click="triggerUpload"
      />
      <Button
        v-if="model"
        label="Odstrániť"
        severity="secondary"
        :disabled="uploading"
        @click="clearCover"
      />
    </div>
    <Message v-if="error" severity="error" :closable="false" class="mt-2">{{ error }}</Message>
    <p class="m-0 mt-1 text-xs text-slate-500">
      JPG, PNG, WebP alebo GIF, max 5 MB. Odporúčaný pomer strán 4:3.
    </p>
  </div>
</template>
