<template>
  <div>
    <p v-if="!session?.access_token" class="font-dmSans text-base text-black/50">{{ S.pleaseSignIn }}</p>
    <template v-else>
      <p v-if="loadError" class="text-sm text-red-600">{{ loadError }}</p>
      <div v-else-if="loading" class="flex flex-col gap-5" aria-busy="true">
        <div class="flex items-center gap-4">
          <div class="size-[84px] shrink-0 animate-pulse rounded-full bg-black/10" />
          <div class="flex flex-1 flex-col gap-2">
            <div class="h-11 w-40 animate-pulse rounded-full bg-black/10" />
            <div class="h-4 w-56 animate-pulse rounded bg-black/10" />
          </div>
        </div>
        <div v-for="i in 4" :key="i" class="flex flex-col gap-2 border-t border-black/[0.07] pt-5">
          <div class="h-4 w-28 animate-pulse rounded bg-black/10" />
          <div class="h-14 animate-pulse rounded-full bg-black/10" />
        </div>
      </div>
      <form
        v-else
        :class="useMarketingLayout ? 'flex flex-col' : 'wizard space-y-4'"
        @submit.prevent="handleSave"
      >
        <p v-if="saveError" class="mb-4 text-sm text-red-600">{{ saveError }}</p>
        <p v-if="showSaveSuccess && saveOk" class="mb-4 text-sm text-marketing-green">{{ S.settingsSaved }}</p>

        <template v-if="useMarketingLayout">
          <!-- Profilová fotka -->
          <section class="pb-6">
            <h3 class="m-0 font-dmSans text-[15px] font-bold uppercase tracking-[0.06em] text-black/45">
              {{ S.settingsProfilSectionPhoto }}
            </h3>
            <div class="mt-4 flex flex-wrap items-center gap-4">
              <div
                class="flex size-[84px] shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-marketing-green font-dmSans text-[28px] font-bold text-white shadow-card"
              >
                <img
                  v-if="avatarPreviewUrl"
                  :src="avatarPreviewUrl"
                  alt=""
                  class="size-full object-cover"
                >
                <span v-else>{{ avatarInitials }}</span>
              </div>
              <div class="flex min-w-0 flex-1 flex-col gap-2">
                <input
                  ref="avatarFileInput"
                  type="file"
                  class="sr-only"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  @change="onAvatarFileChange"
                >
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    :class="outlineFileButtonClass"
                    :disabled="avatarUploading"
                    @click="openAvatarPicker"
                  >
                    {{ avatarUploading ? S.loading : S.settingsAvatarChooseFile }}
                  </button>
                  <button
                    v-if="avatarUrl.trim()"
                    type="button"
                    :class="textLinkButtonClass"
                    :disabled="avatarUploading"
                    @click="clearAvatar"
                  >
                    {{ S.settingsAvatarRemove }}
                  </button>
                </div>
                <p class="m-0 font-dmSans text-xs text-black/45">{{ S.settingsAvatarHint }}</p>
                <p v-if="avatarUploadError" class="m-0 text-sm text-red-600">{{ avatarUploadError }}</p>
              </div>
            </div>
          </section>

          <!-- Základné údaje -->
          <section class="border-t border-black/[0.07] py-6">
            <h3 class="m-0 font-dmSans text-[15px] font-bold uppercase tracking-[0.06em] text-black/45">
              {{ S.settingsProfilSectionBasic }}
            </h3>
            <div :class="[fieldWrapClass, 'mt-4']">
              <label :class="labelClass">{{ S.fullName }}</label>
              <input v-model="displayName" type="text" :class="inputClass" autocomplete="name">
            </div>
          </section>

          <!-- O mne -->
          <section class="border-t border-black/[0.07] py-6">
            <h3 class="m-0 font-dmSans text-[15px] font-bold uppercase tracking-[0.06em] text-black/45">
              {{ S.settingsProfilSectionAbout }}
            </h3>
            <p class="mt-1 font-dmSans text-sm text-black/45">{{ S.settingsProfilBioHint }}</p>
            <div :class="[fieldWrapClass, 'mt-4']">
              <label :class="labelClass" class="sr-only">{{ S.bio }}</label>
              <textarea v-model="bio" rows="4" :class="textareaClass" :placeholder="S.bio" />
            </div>
          </section>

          <!-- Profesijné -->
          <section class="border-t border-black/[0.07] py-6">
            <h3 class="m-0 font-dmSans text-[15px] font-bold uppercase tracking-[0.06em] text-black/45">
              {{ S.settingsProfilSectionProfessional }}
            </h3>
            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              <div :class="fieldWrapClass">
                <label :class="labelClass">{{ S.skills }}</label>
                <input v-model="skills" type="text" :class="inputClass" :placeholder="S.settingsProfilSkillsHint">
              </div>
              <div :class="fieldWrapClass">
                <label :class="labelClass">{{ S.location }}</label>
                <input v-model="location" type="text" :class="inputClass">
              </div>
            </div>
          </section>

          <!-- Odkazy -->
          <section class="border-t border-black/[0.07] py-6">
            <h3 class="m-0 font-dmSans text-[15px] font-bold uppercase tracking-[0.06em] text-black/45">
              {{ S.settingsProfilSectionLinks }}
            </h3>
            <div :class="[fieldWrapClass, 'mt-4']">
              <label :class="labelClass">{{ S.website }}</label>
              <input
                v-model="websiteUrl"
                type="url"
                :class="inputClass"
                :placeholder="S.settingsWebsitePlaceholder"
                autocomplete="url"
              >
            </div>
          </section>

          <div class="flex flex-wrap gap-2.5 border-t border-black/[0.07] pt-6 pb-[max(0px,env(safe-area-inset-bottom))]">
            <AppButton type="submit" variant="primary" size="lg" class="w-full sm:w-auto" :disabled="saving">
              {{ saving ? S.loading : S.firmyReviewSaveChanges }}
            </AppButton>
            <AppButton
              v-if="showCancel"
              type="button"
              variant="outline"
              size="lg"
              class="w-full sm:w-auto"
              @click="emit('cancel')"
            >
              {{ S.cancel }}
            </AppButton>
          </div>
        </template>

        <template v-else>
          <div :class="fieldWrapClass">
            <label :class="labelClass">{{ S.fullName }}</label>
            <input v-model="displayName" type="text" :class="inputClass">
          </div>
          <div :class="fieldWrapClass">
            <label :class="labelClass">{{ S.bio }}</label>
            <textarea v-model="bio" rows="3" :class="textareaClass" />
          </div>
          <div :class="fieldWrapClass">
            <label :class="labelClass">{{ S.skills }}</label>
            <input v-model="skills" type="text" :class="inputClass">
          </div>
          <div :class="fieldWrapClass">
            <label :class="labelClass">{{ S.location }}</label>
            <input v-model="location" type="text" :class="inputClass">
          </div>
          <div :class="fieldWrapClass">
            <label :class="labelClass">{{ S.website }}</label>
            <input
              v-model="websiteUrl"
              type="url"
              :class="inputClass"
              :placeholder="S.settingsWebsitePlaceholder"
            >
          </div>
          <div :class="fieldWrapClass">
            <label :class="labelClass">{{ S.settingsProfilePhoto }}</label>
            <div class="flex flex-wrap items-center gap-3">
              <div
                v-if="avatarPreviewUrl"
                class="size-16 shrink-0 overflow-hidden rounded-full border-2 border-black/10 bg-marketing-green shadow-card"
              >
                <img :src="avatarPreviewUrl" alt="" class="size-full object-cover">
              </div>
              <input
                ref="avatarFileInput"
                type="file"
                class="sr-only"
                accept="image/jpeg,image/png,image/webp,image/gif"
                @change="onAvatarFileChange"
              >
              <button
                type="button"
                :class="outlineFileButtonClass"
                :disabled="avatarUploading"
                @click="openAvatarPicker"
              >
                {{ avatarUploading ? S.loading : S.settingsAvatarChooseFile }}
              </button>
              <button
                v-if="avatarUrl.trim()"
                type="button"
                :class="textLinkButtonClass"
                :disabled="avatarUploading"
                @click="clearAvatar"
              >
                {{ S.settingsAvatarRemove }}
              </button>
            </div>
            <p class="mt-0.5 text-xs text-black/45">{{ S.settingsAvatarHint }}</p>
            <p v-if="avatarUploadError" class="text-sm text-red-600">{{ avatarUploadError }}</p>
          </div>
          <button type="submit" class="btn-green w-full disabled:opacity-50" :disabled="saving">
            {{ saving ? S.loading : S.save }}
          </button>
        </template>
      </form>
    </template>
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

const props = withDefaults(
  defineProps<{
    compact?: boolean
    showCancel?: boolean
    showSaveSuccess?: boolean
  }>(),
  { compact: true, showCancel: false, showSaveSuccess: false },
)

const emit = defineEmits<{
  saved: []
  cancel: []
}>()

const { user, session } = useAuth()
const { loading, loadError, profile, load, patch, isValidUrl } = useSettingsProfile()
const { api } = useApi()

const useMarketingLayout = computed(() => props.compact)
const {
  labelClass,
  inputClass,
  textareaClass,
  fieldWrapClass,
  outlineFileButtonClass,
  textLinkButtonClass,
} = useSettingsFormStyles()

const saving = ref(false)
const saveError = ref<string | null>(null)
const saveOk = ref(false)

const displayName = ref('')
const bio = ref('')
const skills = ref('')
const location = ref('')
const websiteUrl = ref('')
const avatarUrl = ref('')
const avatarFileInput = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)
const avatarUploadError = ref<string | null>(null)

const avatarPreviewUrl = computed(() => avatarUrl.value.trim())

const avatarInitials = computed(() => {
  const parts = displayName.value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return '?'
  }
  return parts
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)
})

function applyProfile(d: NonNullable<typeof profile.value>): void {
  displayName.value = d.display_name ?? ''
  bio.value = d.bio ?? ''
  skills.value = d.skills ?? ''
  location.value = d.location ?? ''
  websiteUrl.value = d.website ?? ''
  avatarUrl.value = d.avatar_url ?? ''
}

async function refreshForm(): Promise<void> {
  const d = await load()
  if (d) {
    applyProfile(d)
  }
}

function openAvatarPicker(): void {
  avatarFileInput.value?.click()
}

function clearAvatar(): void {
  avatarUrl.value = ''
  avatarUploadError.value = null
  if (avatarFileInput.value) {
    avatarFileInput.value.value = ''
  }
}

async function onAvatarFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  if (!session.value?.access_token || !user.value?.id) {
    avatarUploadError.value = S.pleaseSignIn
    input.value = ''
    return
  }
  const validationError = validateImageUpload(file, {
    maxBytes: JOB_PHOTO_STORAGE_MAX_BYTES,
  })
  if (validationError) {
    avatarUploadError.value = validationError
    input.value = ''
    return
  }
  avatarUploadError.value = null
  avatarUploading.value = true
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
    avatarUrl.value = result.publicUrl
  } catch (err) {
    avatarUploadError.value = err instanceof Error ? err.message : String(err)
  } finally {
    avatarUploading.value = false
    input.value = ''
  }
}

async function handleSave(): Promise<void> {
  if (!session.value?.access_token) {
    return
  }
  const website = websiteUrl.value.trim()
  if (website && !isValidUrl(website)) {
    saveError.value = S.settingsWebsiteInvalid
    return
  }
  saving.value = true
  saveError.value = null
  saveOk.value = false
  try {
    const result = await patch({
      display_name: displayName.value.trim() || null,
      bio: bio.value.trim() || null,
      skills: skills.value.trim() || null,
      location: location.value.trim() || null,
      website: website || null,
      avatar_url: avatarUrl.value.trim() || null,
    })
    if (!result.ok) {
      saveError.value = result.message ?? S.saveFailed
      return
    }
    saveOk.value = true
    avatarUploadError.value = null
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
  void refreshForm()
})
</script>
