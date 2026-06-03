<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

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
  <div class="support-hub">
    <header>
      <h1 class="page-title">Podpora</h1>
      <p class="page-subtitle">Vyhľadávanie podľa UUID — používateľ, ponuka alebo inzerát</p>
    </header>

    <section class="section-card">
      <label class="field-label" for="support-uuid">UUID</label>
      <div class="support-search-row">
        <input
          id="support-uuid"
          v-model="uuid"
          class="field-input mono"
          placeholder="00000000-0000-0000-0000-000000000000"
          @keydown.enter="open()"
        />
        <button type="button" class="btn btn-primary" @click="open()">Otvoriť používateľa</button>
      </div>
      <p v-if="hint" class="error">{{ hint }}</p>
      <p class="muted support-hint">
        Pre ponuku alebo firemný inzerát použite priame odkazy z moderácie alebo zadajte UUID do URL:
        <code>/support/jobs/:id</code>,
        <code>/support/company-ads/:id</code>.
      </p>
    </section>

    <section class="section-card quick-links">
      <h2 class="section-title">Rýchle odkazy</h2>
      <div class="quick-links-grid">
        <RouterLink to="/users" class="btn btn-ghost">Účty</RouterLink>
        <RouterLink to="/moderation" class="btn btn-ghost">Moderácia</RouterLink>
        <RouterLink to="/audit" class="btn btn-ghost">Audit</RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.support-hub {
  max-width: 720px;
}

.support-search-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.35rem;
}

.support-search-row .field-input {
  flex: 1;
}

.support-hint {
  margin-top: 0.75rem;
  font-size: 0.875rem;
}

.quick-links-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
