<template>
  <div class="space-y-4 border-t border-black/10 pt-6">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 class="m-0 mb-1 font-dmSans text-[15px] font-extrabold text-black">
          {{ S.settingsSecurityTotpSection }}
        </h3>
        <p class="m-0 font-dmSans text-sm text-black/55">{{ S.settingsSecurityTotpHint }}</p>
      </div>
      <span
        v-if="totpStatusLabel"
        class="rounded-full px-2.5 py-0.5 text-[11px] font-bold leading-tight"
        :class="totpStatusClass"
      >
        {{ totpStatusLabel }}
      </span>
    </div>

    <template v-if="totpHasVerified">
      <AppButton
        type="button"
        variant="outline"
        block
        :disabled="totpBusy"
        @click="emit('disable')"
      >
        {{ S.settingsSecurityTotpDisable }}
      </AppButton>
    </template>

    <template v-else-if="totpPendingFactorId">
      <p class="font-dmSans text-sm font-semibold text-black">{{ S.settingsSecurityTotpStepScan }}</p>
      <div
        v-if="totpQrDataUrl"
        class="flex justify-center rounded-[14px] border border-[#e5e7eb] bg-white p-4"
      >
        <img :src="totpQrDataUrl" alt="" class="max-h-40 w-auto rounded">
      </div>
      <p v-else class="font-dmSans text-sm text-black/55">
        {{ S.settingsSecurityTotpEnrollPending }}
      </p>
      <p class="font-dmSans text-sm font-semibold text-black">{{ S.settingsSecurityTotpStepVerify }}</p>
      <label class="font-dmSans text-[15px] font-semibold text-black" for="security-totp-otp">
        {{ S.settingsSecurityTotpOtpLabel }}
      </label>
      <AuthOtpDigitInput
        id="security-totp-otp"
        :model-value="totpVerifyCode"
        :disabled="totpBusy"
        :aria-label="S.settingsSecurityTotpOtpLabel"
        @update:model-value="emit('update:totpVerifyCode', $event)"
      />
      <AppButton type="button" block :disabled="totpBusy" @click="emit('confirmEnroll')">
        {{ totpBusy ? S.loading : S.settingsSecurityTotpConfirm }}
      </AppButton>
      <AppButton
        type="button"
        variant="ghost"
        block
        :disabled="totpBusy"
        @click="emit('restartEnroll')"
      >
        {{ S.settingsSecurityTotpRegenerateQr }}
      </AppButton>
    </template>

    <template v-else>
      <AppButton type="button" block :disabled="totpBusy" @click="emit('startEnroll')">
        {{ totpBusy ? S.loading : S.settingsSecurityTotpEnable }}
      </AppButton>
    </template>

    <p v-if="totpErr" class="text-sm text-red-600" role="alert">{{ totpErr }}</p>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

defineProps<{
  totpHasVerified: boolean
  totpPendingFactorId: string | null
  totpQrDataUrl: string
  totpVerifyCode: string
  totpBusy: boolean
  totpErr: string
  totpStatusLabel: string
  totpStatusClass: string
}>()

defineEmits<{
  'update:totpVerifyCode': [value: string]
  startEnroll: []
  confirmEnroll: []
  restartEnroll: []
  disable: []
}>()
</script>
