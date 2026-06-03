<template>
  <div class="flex flex-col gap-1.5">
    <p class="m-0 font-dmSans text-xs leading-snug text-black/45">
      {{ S.applicantsTemplateVarsHint }}
    </p>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="v in vars"
        :key="v.key"
        type="button"
        class="rounded-full border border-black/10 bg-white px-3 py-1 font-dmSans text-xs font-semibold text-black/75 transition-colors hover:border-marketing-green/40 hover:bg-marketing-mint/40 hover:text-marketing-green disabled:cursor-not-allowed disabled:opacity-45"
        :disabled="disabled"
        :title="v.snippet"
        @click="emit('insert', v.snippet)"
      >
        {{ v.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import {
  APPLICANT_MESSAGE_TEMPLATE_VAR_KEYS,
  applicantTemplateSnippet,
  type ApplicantMessageTemplateVarKey,
} from '~/utils/applicant-message-template'

withDefaults(
  defineProps<{
    disabled?: boolean
  }>(),
  { disabled: false },
)

const emit = defineEmits<{ insert: [snippet: string] }>()

const LABEL_BY_KEY: Record<ApplicantMessageTemplateVarKey, string> = {
  candidateName: S.applicantsTemplateVarCandidateName,
  jobTitle: S.applicantsTemplateVarJobTitle,
  companyName: S.applicantsTemplateVarCompanyName,
  contactEmail: S.applicantsTemplateVarContactEmail,
  contactPhone: S.applicantsTemplateVarContactPhone,
}

const vars = APPLICANT_MESSAGE_TEMPLATE_VAR_KEYS.map((key) => ({
  key,
  label: LABEL_BY_KEY[key],
  snippet: applicantTemplateSnippet(key),
}))
</script>
