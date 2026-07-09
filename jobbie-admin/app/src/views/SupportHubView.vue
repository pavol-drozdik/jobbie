<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import AdminPageHeader from '../components/layout/AdminPageHeader.vue'

const router = useRouter()
const uuid = ref('')
const hint = ref<string | null>(null)

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function open() {
  const id = uuid.value.trim()
  hint.value = null
  if (!uuidRe.test(id)) {
    hint.value = 'Zadajte platné UUID.'
    return
  }
  void router.push({ name: 'support-user', params: { id } })
}
</script>

<template>
  <div class="admin-page max-w-2xl">
    <AdminPageHeader
      title="Podpora"
      subtitle="Vyhľadávanie podľa UUID — používateľ, ponuka alebo inzerát"
    />

    <section class="admin-section-card">
      <label for="support-uuid" class="mb-1 block text-sm font-medium text-slate-700">
        UUID
      </label>
      <div class="flex flex-wrap gap-2">
        <InputText
          id="support-uuid"
          v-model="uuid"
          class="min-w-0 flex-1 font-mono"
          placeholder="00000000-0000-0000-0000-000000000000"
          @keydown.enter="open()"
        />
        <Button icon="pi pi-user" label="Otvoriť používateľa" @click="open()" />
      </div>
      <Message v-if="hint" severity="error" :closable="false" class="mt-3">{{ hint }}</Message>
      <p class="m-0 mt-3 text-sm text-slate-500">
        Pre ponuku alebo firemný inzerát použite priame odkazy z moderácie alebo zadajte UUID do URL:
        <code>/support/jobs/:id</code>,
        <code>/support/company-ads/:id</code>.
      </p>
    </section>

    <section class="admin-section-card">
      <h2 class="admin-section-title">Rýchle odkazy</h2>
      <div class="flex flex-wrap gap-2">
        <Button label="Účty" severity="secondary" size="small" @click="router.push('/users')" />
        <Button label="Moderácia" severity="secondary" size="small" @click="router.push('/moderation')" />
        <Button label="Audit" severity="secondary" size="small" @click="router.push('/audit')" />
      </div>
    </section>
  </div>
</template>
