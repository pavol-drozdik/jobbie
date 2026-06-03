<template>
  <div
    class="mb-6 rounded-2xl border border-black/[0.06] bg-marketing-surface px-5 py-5 max-[480px]:px-4"
  >
    <h3 class="m-0 text-[17px] font-extrabold text-black">
      {{ isEditMode ? S.firmyReviewEditTitle : S.profilePublicReviewFormTitle }}
    </h3>
    <p class="m-0 mt-1.5 text-[15px] leading-relaxed text-black/45">
      {{ S.profilePublicReviewFormSubtitle }}
    </p>

    <p v-if="isOwner" class="m-0 mt-4 text-[15px] text-black/55">
      {{ S.profilePublicReviewOwnerHint }}
    </p>

    <p v-else-if="!isLoggedIn" class="m-0 mt-4 text-[15px] text-black/55">
      {{ S.firmyReviewLoginPrompt }}
      <NuxtLink
        :to="loginHref"
        class="font-semibold text-marketing-green no-underline hover:underline"
      >
        {{ S.firmyReviewLoginAction }}
      </NuxtLink>
    </p>

    <template v-else>
      <p
        v-if="successMessage"
        class="m-0 mt-4 rounded-xl border border-marketing-green/20 bg-white px-3.5 py-2.5 text-sm font-medium text-marketing-green"
      >
        {{ successMessage }}
      </p>
      <p
        v-if="errorMessage"
        class="m-0 mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
      >
        {{ errorMessage }}
      </p>

      <div class="mt-4">
        <p class="m-0 mb-2 text-[14px] font-semibold text-black/70">
          {{ S.firmyReviewRatingLabel }}
        </p>
        <div
          class="flex gap-1"
          role="radiogroup"
          :aria-label="S.firmyReviewRatingLabel"
          @mouseleave="hoverRating = 0"
        >
          <button
            v-for="star in 5"
            :key="`pick-${star}`"
            type="button"
            class="border-none bg-transparent p-0.5 text-[28px] leading-none transition-colors"
            :class="
              star <= (hoverRating || rating)
                ? 'text-marketing-green'
                : 'text-black/15'
            "
            :aria-label="`${star} z 5`"
            :aria-checked="rating === star"
            role="radio"
            :disabled="submitting"
            @click="rating = star"
            @mouseenter="hoverRating = star"
            @keydown.enter.prevent="rating = star"
            @keydown.space.prevent="rating = star"
          >
            ★
          </button>
        </div>
      </div>

      <div class="mt-4">
        <label
          :for="commentInputId"
          class="mb-2 block text-[14px] font-semibold text-black/70"
        >
          {{ S.firmyReviewCommentLabel }}
        </label>
        <textarea
          :id="commentInputId"
          v-model="comment"
          rows="4"
          maxlength="2000"
          class="box-border w-full resize-y rounded-xl border border-black/10 bg-white px-3.5 py-3 font-dmSans text-[15px] leading-relaxed text-black outline-none focus:border-marketing-green"
          :placeholder="S.profilePublicReviewCommentPlaceholder"
          :disabled="submitting"
        />
      </div>

      <div class="mt-5 flex flex-wrap gap-3">
        <AppButton
          type="button"
          variant="primary"
          size="md"
          class="min-h-[48px] min-w-[160px] flex-1 sm:flex-none"
          :disabled="submitting"
          @click="onSubmit"
        >
          {{
            submitting
              ? S.loading
              : isEditMode
                ? S.firmyReviewSaveChanges
                : S.firmyReviewSubmit
          }}
        </AppButton>
        <AppButton
          v-if="isEditMode"
          type="button"
          variant="outline"
          size="md"
          class="min-h-[48px] flex-1 sm:flex-none"
          :disabled="submitting"
          @click="emit('cancel')"
        >
          {{ S.profileReviewCancelEdit }}
        </AppButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { parseApiErrorMessage, type ApiResultLike } from '~/utils/api-errors'
import type { ProfileReviewRow } from '~/components/profile/PublicProfileCard.vue'

const props = defineProps<{
  profileId: string
  isOwner: boolean
  /** Set when editing an existing review; omit for create. */
  editingReview: ProfileReviewRow | null
}>()

const emit = defineEmits<{
  saved: []
  cancel: []
  conflict: []
}>()

const { user, session } = useAuth()
const { api } = useApi()

const commentInputId = `profile-review-comment-${useId()}`

const rating = ref(0)
const hoverRating = ref(0)
const comment = ref('')
const submitting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const isLoggedIn = computed(
  () => Boolean(session.value?.access_token && user.value?.id),
)

const isEditMode = computed(() => Boolean(props.editingReview?.id))

const loginHref = computed(
  () =>
    `/auth/login?redirect=${encodeURIComponent(ROUTES.publicProfile(props.profileId))}`,
)

function syncFromReview(review: ProfileReviewRow | null): void {
  if (review) {
    rating.value = Math.min(5, Math.max(1, Math.round(review.rating)))
    comment.value = review.comment?.trim() ?? ''
  } else {
    rating.value = 0
    comment.value = ''
  }
  hoverRating.value = 0
}

watch(
  () => props.editingReview,
  (review) => {
    syncFromReview(review)
  },
  { immediate: true },
)

function parseApiErrorCode(res: ApiResultLike): string | null {
  const payload = res.data
  if (payload && typeof payload === 'object') {
    const code = (payload as { code?: string }).code
    if (typeof code === 'string' && code.trim()) {
      return code.trim()
    }
  }
  if (res.body?.trim()) {
    try {
      const parsed = JSON.parse(res.body) as { code?: string }
      if (typeof parsed.code === 'string' && parsed.code.trim()) {
        return parsed.code.trim()
      }
    } catch {
      /* ignore */
    }
  }
  return null
}

function clearFeedback(): void {
  successMessage.value = ''
  errorMessage.value = ''
}

async function onSubmit(): Promise<void> {
  clearFeedback()
  if (rating.value < 1 || rating.value > 5) {
    errorMessage.value = S.firmyReviewPickRating
    return
  }
  submitting.value = true
  const body = {
    rating: rating.value,
    comment: comment.value.trim() || null,
  }
  try {
    const res = isEditMode.value
      ? await api<ProfileReviewRow>(`/api/profiles/${props.profileId}/reviews`, {
          method: 'PATCH',
          body,
        })
      : await api<ProfileReviewRow>(`/api/profiles/${props.profileId}/reviews`, {
          method: 'POST',
          body,
        })
    if (res.ok) {
      successMessage.value = isEditMode.value
        ? S.firmyReviewUpdatedSuccess
        : S.firmyReviewSuccess
      emit('saved')
      return
    }
    const code = parseApiErrorCode(res)
    if (res.status === 409 || code === 'REVIEW_ALREADY_EXISTS') {
      errorMessage.value = S.firmyReviewDuplicate
      emit('conflict')
      return
    }
    if (code === 'REVIEW_SELF') {
      errorMessage.value = S.profilePublicReviewOwnerHint
      return
    }
    errorMessage.value = parseApiErrorMessage(res, S.firmyReviewFailed)
  } finally {
    submitting.value = false
  }
}
</script>
