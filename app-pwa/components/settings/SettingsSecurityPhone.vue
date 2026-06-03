<template>
  <div class="space-y-4">
    <div v-if="phoneVerified" class="flex items-center gap-2">
      <span class="rounded-full bg-marketing-mint px-2.5 py-0.5 text-[11px] font-bold text-marketing-green">
        {{ S.settingsSecurityStatusOn }}
      </span>
      <p class="m-0 font-dmSans text-sm text-marketing-green">{{ S.settingsSecurityPhoneVerified }}</p>
    </div>
    <div :class="fieldWrapClass">
      <input
        id="security-phone"
        :value="phoneE164"
        type="tel"
        :class="inputClass"
        :placeholder="S.settingsSecurityPhonePlaceholder"
        autocomplete="tel"
        :disabled="phoneVerified"
        @input="emit('update:phoneE164', ($event.target as HTMLInputElement).value)"
      >
    </div>
    <AppButton
      v-if="!phoneVerified"
      type="button"
      variant="outline"
      block
      :disabled="phoneBusy"
      @click="emit('sendCode')"
    >
      {{ phoneBusy ? S.loading : S.settingsSecurityPhoneSendCode }}
    </AppButton>
    <p v-if="phoneCodeSent && !phoneVerified" class="text-sm font-medium text-marketing-green">
      {{ S.settingsSecurityPhoneCodeSent }}
    </p>
    <template v-if="phoneCodeSent && !phoneVerified">
      <div :class="fieldWrapClass">
        <label :class="labelClass" for="security-sms-code">{{ S.settingsSecurityPhoneSmsPlaceholder }}</label>
        <input
          id="security-sms-code"
          :value="phoneSmsCode"
          type="text"
          :class="inputClass"
          :placeholder="S.settingsSecurityPhoneSmsPlaceholder"
          autocomplete="one-time-code"
          inputmode="numeric"
          @input="emit('update:phoneSmsCode', ($event.target as HTMLInputElement).value)"
        >
      </div>
      <AppButton type="button" block :disabled="phoneBusy" @click="emit('verify')">
        {{ phoneBusy ? S.loading : S.settingsSecurityPhoneVerify }}
      </AppButton>
    </template>
    <p v-if="phoneErr" class="text-sm text-red-600" role="alert">{{ phoneErr }}</p>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

const { labelClass, inputClass, fieldWrapClass } = useSettingsFormStyles()

defineProps<{
  phoneE164: string
  phoneSmsCode: string
  phoneBusy: boolean
  phoneErr: string
  phoneVerified: boolean
  phoneCodeSent: boolean
}>()

const emit = defineEmits<{
  'update:phoneE164': [value: string]
  'update:phoneSmsCode': [value: string]
  sendCode: []
  verify: []
}>()
</script>
