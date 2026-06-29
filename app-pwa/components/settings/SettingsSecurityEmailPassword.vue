<template>
  <div class="space-y-6">
    <div>
      <p class="mb-1 font-dmSans text-sm font-semibold text-black/70">
        {{ S.settingsSecurityCurrentEmail }}
      </p>
      <p class="m-0 truncate font-dmSans text-[15px] font-medium text-black">
        {{ currentEmail || '—' }}
      </p>
    </div>
    <div :class="fieldWrapClass">
      <label :class="labelClass">{{ S.settingsNewEmail }}</label>
      <p class="mb-2 font-dmSans text-sm text-black/55">{{ S.settingsEmailHint }}</p>
      <input
        :value="newEmail"
        type="email"
        :class="inputClass"
        :placeholder="S.settingsNewEmail"
        autocomplete="email"
        @input="emit('update:newEmail', ($event.target as HTMLInputElement).value)"
      >
      <AppButton
        type="button"
        class="mt-3"
        block
        :disabled="emailSaving"
        @click="emit('saveEmail')"
      >
        {{ emailSaving ? S.loading : S.save }}
      </AppButton>
      <p v-if="emailMsg" class="mt-2 text-sm font-medium text-marketing-green">{{ emailMsg }}</p>
      <p v-if="emailErr" class="mt-2 text-sm text-red-600" role="alert">{{ emailErr }}</p>
    </div>

    <div
      v-if="requiresCurrentPassword"
      class="border-t border-black/10 pt-6"
    >
      <div :class="fieldWrapClass">
        <label :class="labelClass" for="security-current-password">{{ S.settingsCurrentPassword }}</label>
        <p class="mb-2 font-dmSans text-sm text-black/55">{{ S.settingsCurrentPasswordHint }}</p>
        <input
          id="security-current-password"
          :value="currentPassword"
          type="password"
          :class="inputClass"
          :placeholder="S.settingsCurrentPassword"
          autocomplete="current-password"
          @input="emit('update:currentPassword', ($event.target as HTMLInputElement).value)"
        >
      </div>
    </div>

    <div class="border-t border-black/10 pt-6">
      <h3 class="m-0 mb-2 font-dmSans text-[15px] font-extrabold text-black">
        {{ S.settingsPasswordSection }}
      </h3>
      <p
        class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 font-dmSans text-sm leading-snug text-amber-900"
        role="note"
      >
        {{ S.settingsSecurityPasswordWarning }}
      </p>
      <p class="mb-3 font-dmSans text-sm text-black/55">{{ passwordPolicyHint }}</p>
      <div class="space-y-3">
        <div :class="fieldWrapClass">
          <label :class="labelClass" for="security-new-password">{{ S.settingsNewPassword }}</label>
          <input
            id="security-new-password"
            :value="newPassword"
            type="password"
            :class="inputClass"
            :placeholder="S.settingsNewPassword"
            autocomplete="new-password"
            @input="emit('update:newPassword', ($event.target as HTMLInputElement).value)"
          >
        </div>
        <div :class="fieldWrapClass">
          <label :class="labelClass" for="security-confirm-password">{{ S.settingsConfirmPassword }}</label>
          <input
            id="security-confirm-password"
            :value="confirmPassword"
            type="password"
            :class="inputClass"
            :placeholder="S.settingsConfirmPassword"
            autocomplete="new-password"
            @input="emit('update:confirmPassword', ($event.target as HTMLInputElement).value)"
          >
        </div>
      </div>
      <AuthTurnstileWidget
        v-if="turnstileEnabled"
        ref="passwordTurnstileRef"
        :model-value="passwordCaptchaToken"
        @update:model-value="emit('update:passwordCaptchaToken', $event)"
      />
      <AppButton
        type="button"
        class="mt-3"
        block
        :disabled="passwordSaving"
        @click="emit('savePassword')"
      >
        {{ passwordSaving ? S.loading : S.save }}
      </AppButton>
      <p v-if="passwordErr" class="mt-2 text-sm text-red-600" role="alert">{{ passwordErr }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import { passwordPolicyHint } from '~/utils/validate-password'

const { labelClass, inputClass, fieldWrapClass } = useSettingsFormStyles()
const { turnstileEnabled } = useAuthCaptcha()

const passwordTurnstileRef = ref<{
  reset?: () => void
  refreshToken?: () => Promise<string | null>
} | null>(null)

defineExpose({
  resetPasswordCaptcha: () => passwordTurnstileRef.value?.reset?.(),
  refreshPasswordCaptcha: () => passwordTurnstileRef.value?.refreshToken?.(),
})

defineProps<{
  currentEmail: string
  newEmail: string
  emailSaving: boolean
  emailMsg: string
  emailErr: string
  requiresCurrentPassword: boolean
  currentPassword: string
  newPassword: string
  confirmPassword: string
  passwordSaving: boolean
  passwordErr: string
  passwordCaptchaToken: string
}>()

const emit = defineEmits<{
  'update:newEmail': [value: string]
  'update:currentPassword': [value: string]
  'update:newPassword': [value: string]
  'update:confirmPassword': [value: string]
  'update:passwordCaptchaToken': [value: string]
  saveEmail: []
  savePassword: []
}>()
</script>
