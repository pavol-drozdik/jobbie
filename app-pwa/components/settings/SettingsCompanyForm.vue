<template>
  <div>
    <div v-if="loading" class="flex flex-col gap-4 py-4">
      <div
        v-for="i in 4"
        :key="i"
        class="h-14 animate-pulse rounded-full bg-marketing-surface"
      />
    </div>
    <p v-else-if="loadError" class="text-sm text-red-600" role="alert">{{ loadError }}</p>
    <form v-else class="flex flex-col gap-0" @submit.prevent="handleSave">
      <p v-if="saveError" class="mb-4 text-sm text-red-600" role="alert">{{ saveError }}</p>

      <div class="mb-4">
        <NuxtLink
          to="/nastavenia/fakturacia"
          class="font-dmSans text-sm text-black/50 hover:text-marketing-green hover:underline"
        >
          {{ S.settingsFirmaBillingLink }}
        </NuxtLink>
      </div>

      <SettingsSection
        :title="S.settingsFirmaSectionBasic"
        :description="S.settingsFirmaSectionBasicHint"
      >
        <div :class="fieldWrapClass">
          <label :class="labelClass">{{ S.companyName }}</label>
          <input v-model="companyName" type="text" :class="inputClass" autocomplete="organization">
        </div>
        <div :class="fieldWrapClass">
          <label :class="labelClass">{{ S.sector }}</label>
          <input v-model="sector" type="text" :class="inputClass">
        </div>
        <div :class="fieldWrapClass">
          <label :class="labelClass">{{ S.description }}</label>
          <textarea v-model="description" rows="4" :class="textareaClass" />
        </div>
      </SettingsSection>

      <SettingsSection
        :title="S.settingsFirmaSectionAddress"
        :description="S.settingsFirmaSectionAddressHint"
        divider
      >
        <div :class="fieldWrapClass">
          <label :class="labelClass">{{ S.registeredOffice }}</label>
          <textarea v-model="registeredOffice" rows="2" :class="textareaClass" />
        </div>
        <div :class="fieldWrapClass">
          <label :class="labelClass">{{ S.website }}</label>
          <input
            v-model="websiteUrl"
            type="url"
            :class="inputClass"
            :placeholder="S.settingsWebsitePlaceholder"
            autocomplete="url"
          >
        </div>
      </SettingsSection>

      <SettingsSection
        :title="S.settingsFirmaSectionIdentifiers"
        :description="S.settingsFirmaSectionIdentifiersHint"
        divider
      >
        <div class="grid gap-5 sm:grid-cols-3">
          <div :class="fieldWrapClass">
            <label :class="labelClass">IČO</label>
            <input v-model="registrationNumber" type="text" :class="inputClass" inputmode="numeric">
          </div>
          <div :class="fieldWrapClass">
            <label :class="labelClass">DIČ</label>
            <input v-model="taxId" type="text" :class="inputClass">
          </div>
          <div :class="fieldWrapClass">
            <label :class="labelClass">IČ DPH</label>
            <input v-model="vatId" type="text" :class="inputClass">
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        :title="S.settingsFirmaSectionLogo"
        :description="S.settingsFirmaSectionLogoHint"
        divider
      >
        <div :class="fieldWrapClass">
          <div class="flex flex-wrap items-center gap-3">
            <div
              v-if="logoPreviewUrl"
              class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-black/10 bg-marketing-surface shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
            >
              <img :src="logoPreviewUrl" alt="" class="size-full object-cover">
            </div>
            <div
              v-else
              class="flex size-20 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-black/15 bg-marketing-surface text-black/25"
              aria-hidden="true"
            >
              <AppIcon name="building" :size="28" />
            </div>
            <input
              ref="logoFileInput"
              type="file"
              class="sr-only"
              accept="image/jpeg,image/png,image/webp,image/gif"
              @change="onLogoFileChange"
            >
            <button
              type="button"
              :class="outlineFileButtonClass"
              :disabled="logoUploading"
              @click="openLogoPicker"
            >
              {{ logoUploading ? S.loading : S.settingsFirmaLogoChooseFile }}
            </button>
            <button
              v-if="logoUrl.trim()"
              type="button"
              :class="textLinkButtonClass"
              :disabled="logoUploading"
              @click="clearLogo"
            >
              {{ S.settingsFirmaLogoRemove }}
            </button>
          </div>
          <p v-if="logoUploadError" class="text-sm text-red-600">{{ logoUploadError }}</p>
        </div>
      </SettingsSection>

      <div
        class="sticky bottom-0 z-10 -mx-6 mt-8 border-t border-black/[0.06] bg-white/95 px-6 py-4 backdrop-blur-sm sm:-mx-8 sm:px-8 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <button type="submit" :class="primaryButtonClass" :disabled="saving">
          {{ saving ? S.loading : S.save }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import { JOB_PHOTO_STORAGE_MAX_BYTES } from '~/utils/upload-policy'
import {
  compressImageFileToJpeg,
  PROFILE_AVATAR_MAX_EDGE_PX,
  validateImageUpload,
} from '~/utils/image-compression'

const emit = defineEmits<{
  saved: []
  error: [message: string]
}>()

const { user, session } = useAuth()
const { loading, loadError, profile, load, patch, isValidUrl } = useSettingsProfile()
const { api } = useApi()

const {
  labelClass,
  inputClass,
  textareaClass,
  fieldWrapClass,
  primaryButtonClass,
  outlineFileButtonClass,
  textLinkButtonClass,
} = useSettingsFormStyles()

const saving = ref(false)
const saveError = ref<string | null>(null)

const companyName = ref('')
const registeredOffice = ref('')
const description = ref('')
const websiteUrl = ref('')
const logoUrl = ref('')
const registrationNumber = ref('')
const taxId = ref('')
const vatId = ref('')
const sector = ref('')

const logoFileInput = ref<HTMLInputElement | null>(null)
const logoUploading = ref(false)
const logoUploadError = ref<string | null>(null)

const logoPreviewUrl = computed(() => logoUrl.value.trim())

function applyProfile(d: NonNullable<typeof profile.value>): void {
  companyName.value = d.company_name ?? ''
  registeredOffice.value = d.registered_office ?? ''
  description.value = d.description ?? ''
  websiteUrl.value = d.website ?? ''
  logoUrl.value = d.logo_url ?? ''
  registrationNumber.value = d.registration_number ?? ''
  taxId.value = d.tax_id ?? ''
  vatId.value = d.vat_id ?? ''
  sector.value = d.sector ?? ''
}

function openLogoPicker(): void {
  logoFileInput.value?.click()
}

function clearLogo(): void {
  logoUrl.value = ''
  logoUploadError.value = null
  if (logoFileInput.value) {
    logoFileInput.value.value = ''
  }
}

async function onLogoFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  if (!session.value?.access_token || !user.value?.id) {
    logoUploadError.value = S.pleaseSignIn
    input.value = ''
    return
  }
  const validationError = validateImageUpload(file, {
    maxBytes: JOB_PHOTO_STORAGE_MAX_BYTES,
  })
  if (validationError) {
    logoUploadError.value = validationError
    input.value = ''
    return
  }
  logoUploadError.value = null
  logoUploading.value = true
  try {
    const jpegFile = await compressImageFileToJpeg(file, {
      maxEdgePx: PROFILE_AVATAR_MAX_EDGE_PX,
      maxOutputBytes: JOB_PHOTO_STORAGE_MAX_BYTES,
    })
    const { uploadProfileAvatar } = useStorageUpload()
    const result = await uploadProfileAvatar(jpegFile)
    void api('/api/analytics/storage-access', {
      method: 'POST',
      body: {
        bucket_id: 'profile-avatars',
        object_path: result.storagePath,
        action: 'upload',
        bytes: result.size,
      },
    })
    logoUrl.value = result.publicUrl
  } catch (err) {
    logoUploadError.value = err instanceof Error ? err.message : String(err)
  } finally {
    logoUploading.value = false
    input.value = ''
  }
}

async function handleSave(): Promise<void> {
  const website = websiteUrl.value.trim()
  if (website && !isValidUrl(website)) {
    saveError.value = S.settingsWebsiteInvalid
    emit('error', S.settingsWebsiteInvalid)
    return
  }
  saving.value = true
  saveError.value = null
  try {
    const result = await patch({
      company_name: companyName.value.trim() || null,
      registered_office: registeredOffice.value.trim() || null,
      description: description.value.trim() || null,
      website: website || null,
      logo_url: logoUrl.value.trim() || null,
      registration_number: registrationNumber.value.trim() || null,
      tax_id: taxId.value.trim() || null,
      vat_id: vatId.value.trim() || null,
      sector: sector.value.trim() || null,
    })
    if (!result.ok) {
      const msg = result.message ?? S.saveFailed
      saveError.value = msg
      emit('error', msg)
      return
    }
    logoUploadError.value = null
    emit('saved')
  } finally {
    saving.value = false
  }
}

watch(profile, (d) => {
  if (d) {
    applyProfile(d)
  }
})

onMounted(() => {
  void load()
})
</script>
