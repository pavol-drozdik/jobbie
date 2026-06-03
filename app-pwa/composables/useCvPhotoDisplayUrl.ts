import type { Ref } from 'vue'
import { useApi } from '~/composables/useApi'
import type { CvHeaderResponseDto } from '~/types/cv'
import { resolveCvPhotoDisplayUrl } from '~/utils/cv-photo-display-url'

type CvPhotoHeader = Pick<
  CvHeaderResponseDto,
  'photo_url' | 'photo_storage_path' | 'photo_view_url'
>

export function useCvPhotoDisplayUrl(
  cvId: Ref<string> | string,
  header: Ref<CvPhotoHeader> | CvPhotoHeader,
) {
  const { api } = useApi()
  const resolvedUrl = ref<string | null>(null)
  const localBlobUrl = ref<string | null>(null)

  const photoDisplayUrl = computed(() => localBlobUrl.value ?? resolvedUrl.value)

  function revokeLocalBlob(): void {
    if (!localBlobUrl.value) {
      return
    }
    URL.revokeObjectURL(localBlobUrl.value)
    localBlobUrl.value = null
  }

  function setLocalPhotoPreview(file: File): void {
    revokeLocalBlob()
    localBlobUrl.value = URL.createObjectURL(file)
  }

  async function refreshPhotoDisplayUrl(
    headerOverride?: CvPhotoHeader,
  ): Promise<void> {
    const id = toValue(cvId).trim()
    if (!id) {
      resolvedUrl.value = null
      return
    }
    const h = headerOverride ?? toValue(header)
    try {
      const url = await resolveCvPhotoDisplayUrl(id, h, api)
      resolvedUrl.value = url
      if (url) {
        revokeLocalBlob()
      }
    } catch {
      resolvedUrl.value = null
    }
  }

  watch(
    () => {
      const h = toValue(header)
      return [
        toValue(cvId),
        h.photo_url,
        h.photo_storage_path,
        h.photo_view_url,
      ] as const
    },
    () => {
      void refreshPhotoDisplayUrl()
    },
    { immediate: true },
  )

  onUnmounted(() => {
    revokeLocalBlob()
  })

  return {
    photoDisplayUrl,
    refreshPhotoDisplayUrl,
    setLocalPhotoPreview,
    revokeLocalBlob,
  }
}
