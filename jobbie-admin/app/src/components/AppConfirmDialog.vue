<script setup lang="ts">
import { useConfirm } from '../composables/useConfirm'

const { open, options, accept, cancel } = useConfirm()
</script>

<template>
  <div v-if="open && options" class="confirm-backdrop" role="dialog" aria-modal="true">
    <div class="confirm-card">
      <h2 v-if="options.title" class="confirm-title">{{ options.title }}</h2>
      <p class="confirm-message">{{ options.message }}</p>
      <div class="confirm-actions">
        <button type="button" class="btn btn-ghost" @click="cancel">
          {{ options.cancelLabel ?? 'Zrušiť' }}
        </button>
        <button
          type="button"
          class="btn"
          :class="options.danger ? 'btn-danger' : 'btn-primary'"
          @click="accept"
        >
          {{ options.confirmLabel ?? 'Potvrdiť' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(14, 28, 18, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.confirm-card {
  background: var(--card);
  border-radius: 14px;
  padding: 1.25rem 1.5rem;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.confirm-title {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
}

.confirm-message {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  color: var(--ink2);
  line-height: 1.45;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-danger {
  background: var(--danger);
  color: #fff;
  border: none;
}
</style>
