<template>
  <div class="space-y-4">
    <div>
      <h3 class="m-0 mb-1 font-dmSans text-[15px] font-extrabold text-black">
        {{ S.passkeySectionTitle }}
      </h3>
      <p class="m-0 font-dmSans text-sm text-black/55">{{ S.passkeySectionHint }}</p>
    </div>
    <template v-if="passkeyNeedsTotpCode">
      <p class="font-dmSans text-sm text-black/55">{{ S.passkeyTotpStepHint }}</p>
      <label class="font-dmSans text-[15px] font-semibold text-black" for="security-passkey-totp">
        {{ S.passkeyTotpOtpLabel }}
      </label>
      <AuthOtpDigitInput
        id="security-passkey-totp"
        :model-value="passkeyTotpCode"
        :disabled="passkeySaving"
        :aria-label="S.passkeyTotpOtpLabel"
        @update:model-value="emit('update:passkeyTotpCode', $event)"
        @complete="emit('add')"
      />
    </template>
    <AppButton
      type="button"
      variant="outline"
      block
      :disabled="passkeySaving || !canUse"
      @click="emit('add')"
    >
      {{ passkeySaving ? S.loading : passkeyNeedsTotpCode ? S.passkeyConfirmAdd : S.passkeyAdd }}
    </AppButton>
    <p v-if="passkeyMsg" class="text-sm font-medium text-marketing-green">{{ passkeyMsg }}</p>
    <p v-if="passkeyErr" class="text-sm text-red-600" role="alert">{{ passkeyErr }}</p>
    <ul v-if="passkeys.length > 0" class="space-y-2">
      <li
        v-for="row in passkeys"
        :key="row.id"
        class="flex items-center justify-between gap-3 rounded-[14px] border border-[#e5e7eb] bg-marketing-surface px-4 py-3"
      >
        <div class="flex min-w-0 items-center gap-3">
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded-full bg-marketing-panel text-marketing-green"
          >
            <AppIcon name="settings" :size="16" />
          </span>
          <div class="min-w-0">
            <p class="truncate font-dmSans text-sm font-semibold text-black">{{ row.name }}</p>
            <p class="font-dmSans text-xs text-black/50">{{ formatDate(row.createdAt) }}</p>
          </div>
        </div>
        <AppButton
          type="button"
          variant="danger"
          size="sm"
          :disabled="passkeySaving"
          @click="emit('remove', row.id)"
        >
          {{ S.remove }}
        </AppButton>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { PasskeyCredential } from '~/composables/useAuth'
import { S } from '~/utils/strings'

defineProps<{
  passkeys: PasskeyCredential[]
  passkeySaving: boolean
  passkeyMsg: string
  passkeyErr: string
  canUse: boolean
  formatDate: (iso: string | null) => string
  passkeyNeedsTotpCode: boolean
  passkeyTotpCode: string
}>()

const emit = defineEmits<{
  add: []
  remove: [factorId: string]
  'update:passkeyTotpCode': [value: string]
}>()
</script>
