<script setup lang="ts">
import { ref } from 'vue'
import { uploadBlogCover, validateBlogCoverFile } from '../composables/useAdminStorageUpload'

const model = defineModel<string>({ default: '' })

const uploading = ref(false)
const error = ref<string | null>(null)

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
      class="cover-upload-preview"
      style="display: flex; align-items: center; justify-content: center; color: var(--ink3); font-size: 0.875rem"
    >
      Žiadna titulná fotka
    </div>
    <div style="display: flex; flex-wrap: gap: 0.5rem; margin-top: 0.65rem">
      <label class="btn btn-primary" style="cursor: pointer">
        {{ uploading ? 'Nahrávam…' : model ? 'Nahradiť fotku' : 'Nahrať fotku' }}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style="display: none"
          :disabled="uploading"
          @change="onFileChange"
        >
      </label>
      <button v-if="model" type="button" class="btn btn-ghost" :disabled="uploading" @click="clearCover">
        Odstrániť
      </button>
    </div>
    <p v-if="error" class="error" style="margin: 0.5rem 0 0">{{ error }}</p>
    <p style="margin: 0.35rem 0 0; font-size: 0.75rem; color: var(--ink3)">
      JPG, PNG, WebP alebo GIF, max 5 MB. Odporúčaný pomer strán 4:3.
    </p>
  </div>
</template>
