import type { MaybeRef } from 'vue'
import { toRef } from 'vue'
import { S } from '~/utils/strings'
import type { CompanyAd, CompanyAdFormPayload, CompanyAdGalleryItem, CompanyAdStatus } from '~/utils/company-ad'
import {
  companyAdToFormState,
  emptyCompanyAdFormState,
} from '~/utils/company-ad'
import { validateCompanyAdForPublish } from '~/utils/company-ad-validation'
import { sanitizeJobDescriptionHtml } from '~/utils/sanitize-job-description-html'
import {
  compressImageFileToJpeg,
  validateImageUpload,
} from '~/utils/image-compression'
import { CREDITS_PER_AD_MONTH } from '~/utils/billing-config'
import {
  getPlanTierCreditCost,
  parsePlanTierCreditCostsFromConfig,
} from '~/utils/plan-tier-credit-costs'
import type { SkMunicipalityRow } from '~/utils/sk-municipality'
import { hasActiveBffSession } from '~/utils/bff-csrf-state'
import {
  formatMoneyInputField,
  parseMoneyInput,
} from '~/utils/money-amount'

// Company service ads: publish spends credits server-side; client credit check is UX only.
export function useCompanyAdForm(options: {
  mode: 'create' | 'edit'
  adId?: MaybeRef<string | undefined>
}) {
  const { api } = useApi()
  const { user, profile, session, refreshUser } = useAuth()
  const adId = toRef(options.adId)

  const form = reactive<CompanyAdFormPayload>(emptyCompanyAdFormState())
  const descriptionHtml = ref('')
  const coverPhoto = ref<string | null>(null)
  const thumbnailTouched = ref(false)
  const durationMonths = ref(3)
  const isTopListing = ref(false)
  const adStatus = ref<CompanyAdStatus>('draft')
  const hadTopOnLoad = ref(false)
  const billingPlanSlug = ref('zadarmo')
  const saving = ref(false)
  const formError = ref<string | null>(null)
  const uploadingCover = ref(false)
  const uploadingGallery = ref(false)
  const selectedMunicipality = ref<SkMunicipalityRow | null>(null)
  const richEditorRef = ref<{ getPlainText: () => string } | null>(null)

  const { config: billingCatalogConfig, load: loadBillingCatalog } = useCatalogBilling()

  const planTierCosts = computed(() =>
    parsePlanTierCreditCostsFromConfig(billingCatalogConfig.value?.planTierCreditCosts),
  )

  const creditsDisplay = computed(() => profile.value?.credits ?? 0)

  const topListingCredits = computed(() =>
    getPlanTierCreditCost(
      planTierCosts.value,
      billingPlanSlug.value,
      'topOfCategory7Days',
    ),
  )

  const isAlreadyPublished = computed(() => adStatus.value === 'active')

  const requiredCredits = computed(() => {
    const publishCreditsNeeded = isAlreadyPublished.value
      ? 0
      : CREDITS_PER_AD_MONTH * durationMonths.value
    const topCreditsNeeded =
      isTopListing.value && !hadTopOnLoad.value ? topListingCredits.value : 0
    return publishCreditsNeeded + topCreditsNeeded
  })

  const topCreditsNeeded = computed(() =>
    isTopListing.value && !hadTopOnLoad.value ? topListingCredits.value : 0,
  )

  async function loadBillingAccount(): Promise<void> {
    if (!user.value?.id) return
    const res = await api<{ planSlug?: string }>('/api/billing/account')
    if (res.ok && res.data?.planSlug) {
      billingPlanSlug.value = res.data.planSlug
    }
  }

  watch(coverPhoto, (url) => {
    form.thumbnail_url = url?.trim() || null
  })

  function markThumbnailTouched(): void {
    thumbnailTouched.value = true
  }

  async function prefillFromProfile(): Promise<void> {
    if (!user.value?.id) return
    const res = await api<{
      phone_e164?: string | null
      contact_email?: string | null
      website?: string | null
      registration_number?: string | null
      tax_id?: string | null
      vat_id?: string | null
      company_name?: string | null
      display_name?: string | null
    }>(`/api/profiles/${user.value.id}`)
    if (!res.ok || !res.data) return
    const d = res.data
    if (!form.contact_phone && d.phone_e164) form.contact_phone = d.phone_e164
    if (!form.contact_email && d.contact_email) form.contact_email = d.contact_email
    if (!form.website && d.website) form.website = d.website
    if (!form.title.trim()) {
      form.title = (d.company_name || d.display_name || '').trim()
    }
  }

  function loadFromAd(ad: CompanyAd): void {
    const state = companyAdToFormState(ad)
    Object.assign(form, state)
    adStatus.value = ad.status
    hadTopOnLoad.value = Boolean(ad.show_top_badge)
    isTopListing.value = Boolean(ad.show_top_badge)
    descriptionHtml.value = sanitizeJobDescriptionHtml(ad.body ?? '')
    coverPhoto.value = ad.thumbnail_url
    thumbnailTouched.value = false
    const cityName = ad.city?.trim() ?? ''
    if (cityName) {
      selectedMunicipality.value = {
        id: 0,
        name: cityName,
        kraj: ad.region?.trim() ?? '',
        okres: '',
      }
    } else {
      selectedMunicipality.value = null
    }
  }

  async function uploadImage(file: File): Promise<string> {
    if (!user.value?.id) {
      throw new Error('Nie ste prihlásený.')
    }
    const validationError = validateImageUpload(file)
    if (validationError) {
      throw new Error(validationError)
    }
    const jpegFile = await compressImageFileToJpeg(file)
    const { uploadJobPhoto } = useStorageUpload()
    const result = await uploadJobPhoto(jpegFile, 'cover')
    void api('/api/analytics/storage-access', {
      method: 'POST',
      body: {
        bucket_id: 'job-photos',
        object_path: result.storagePath,
        action: 'upload',
        bytes: result.size,
      },
    })
    return result.publicUrl
  }

  function buildApiBody(publish: boolean): Record<string, unknown> {
    const plain = richEditorRef.value?.getPlainText() ?? ''
    const bodyHtml = sanitizeJobDescriptionHtml(descriptionHtml.value)
    const body = (bodyHtml || plain).trim()

    if (selectedMunicipality.value) {
      form.city = selectedMunicipality.value.name
      if (!form.region?.trim()) form.region = selectedMunicipality.value.kraj
    }

    const title = form.title.trim() || (publish ? '' : 'Nepomenovaná reklama')
    const bodyOut = body || (publish ? '' : ' ')
    const category = form.category?.trim() || ''

    const thumbnailPayload: { thumbnail_url?: string | null } = {}
    if (thumbnailTouched.value || form.thumbnail_url) {
      thumbnailPayload.thumbnail_url = form.thumbnail_url
    }

    return {
      title,
      body: bodyOut,
      ...(category ? { category } : {}),
      ...thumbnailPayload,
      profile_type: form.profile_type,
      tagline: form.tagline?.trim() || null,
      region: form.region?.trim() || null,
      city: form.city?.trim() || null,
      street_address: form.street_address?.trim() || null,
      postal_code: form.postal_code?.trim() || null,
      show_exact_address: form.show_exact_address,
      price_type: form.price_type,
      price_min: parseMoneyInput(form.price_min),
      price_max: parseMoneyInput(form.price_max),
      price_negotiable: form.price_type === 'negotiable',
      price_note: form.price_note?.trim() || null,
      availability: form.availability,
      works_weekends: form.works_weekends,
      evening_hours: form.evening_hours,
      emergency_service: form.emergency_service,
      contact_person: form.contact_person?.trim() || null,
      contact_email: form.contact_email?.trim() || null,
      contact_phone: form.contact_phone?.trim() || null,
      website: form.website?.trim() || null,
      preferred_contact_method: form.preferred_contact_method,
      show_phone_publicly: form.show_phone_publicly,
      show_email_publicly: form.show_email_publicly,
      ico: form.ico?.trim() || null,
      dic: form.dic?.trim() || null,
      ic_dph: form.ic_dph?.trim() || null,
      founded_year: form.founded_year,
      employee_count: form.employee_count,
      services: form.services,
      specializations: form.specializations,
      certifications: form.certifications,
      service_areas: form.service_areas,
      custom_service_areas: form.custom_service_areas,
      gallery_items: form.gallery_items,
      is_draft: !publish,
      ...(publish
        ? {
            duration_months: Math.min(
              12,
              Math.max(1, Math.floor(Number(durationMonths.value)) || 1),
            ),
            want_top_listing: isTopListing.value,
          }
        : {}),
      ...(options.mode === 'edit' && publish ? { publish: true } : {}),
    }
  }

  async function submit(publish: boolean): Promise<CompanyAd | null> {
    const canCallApi =
      Boolean(user.value?.id) ||
      Boolean(session.value?.access_token) ||
      hasActiveBffSession()
    if (!canCallApi) {
      formError.value = S.sessionExpiredMessage
      return null
    }

    const plain = richEditorRef.value?.getPlainText() ?? ''
    const bodyHtml = sanitizeJobDescriptionHtml(descriptionHtml.value)
    form.body = (bodyHtml || plain).trim()

    if (publish) {
      const err = validateCompanyAdForPublish(form)
      if (err) {
        formError.value = err
        return null
      }
      // SECURITY: Early feedback only — Nest charges credits on activate; never trust client balance alone.
      if (creditsDisplay.value < requiredCredits.value) {
        formError.value = S.firmyNotEnoughCredits
        return null
      }
    }

    formError.value = null
    saving.value = true
    try {
      const body = buildApiBody(publish)
      const editId = adId.value?.trim()
      if (options.mode === 'edit' && editId) {
        const patchBody = { ...body }
        delete patchBody.is_draft
        if (!publish) {
          delete patchBody.duration_months
          delete patchBody.publish
        }
        const res = await api<CompanyAd>(`/api/company-ads/${editId}`, {
          method: 'PATCH',
          body: patchBody,
        })
        if (!res.ok) {
          formError.value = extractApiError(res)
          return null
        }
        let saved = res.data as CompanyAd
        await refreshUser()
        return saved
      }
      const res = await api<CompanyAd>('/api/company-ads', {
        method: 'POST',
        body,
      })
      if (!res.ok) {
        formError.value = extractApiError(res)
        return null
      }
      let created = res.data as CompanyAd
      await refreshUser()
      return created
    } finally {
      saving.value = false
    }
  }

  function extractApiError(res: { data?: unknown; body?: string }): string {
    const d = res.data as { message?: string } | undefined
    return (
      d?.message?.trim() ||
      (res.body && res.body.length < 400 ? res.body : '') ||
      S.firmyErrorGeneric
    )
  }

  async function addGalleryFiles(files: FileList | File[]): Promise<void> {
    uploadingGallery.value = true
    formError.value = null
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const url = await uploadImage(file)
        form.gallery_items.push({ url, caption: null })
      }
    } catch (e) {
      formError.value = String(e)
    } finally {
      uploadingGallery.value = false
    }
  }

  function removeGalleryAt(index: number): void {
    form.gallery_items.splice(index, 1)
  }

  function updateGalleryCaption(index: number, caption: string): void {
    const item = form.gallery_items[index]
    if (item) item.caption = caption.trim() || null
  }

  function toggleServiceArea(value: string): void {
    const idx = form.service_areas.indexOf(value)
    if (idx >= 0) {
      form.service_areas.splice(idx, 1)
    } else {
      form.service_areas.push(value)
    }
  }

  watch(
    () => form.price_type,
    (t) => {
      if (t === 'negotiable' || t === 'hidden') {
        form.price_negotiable = t === 'negotiable'
      }
    },
  )

  const showPriceAmounts = computed(() => {
    const t = form.price_type
    return t !== 'negotiable' && t !== 'hidden'
  })

  const isOnlineOnly = computed(() => form.service_areas.includes('online'))

  const priceMinInput = computed({
    get: () =>
      form.price_min != null && Number.isFinite(form.price_min)
        ? formatMoneyInputField(form.price_min)
        : '',
    set: (raw: string) => {
      form.price_min = parseMoneyInput(raw)
    },
  })

  const priceMaxInput = computed({
    get: () =>
      form.price_max != null && Number.isFinite(form.price_max)
        ? formatMoneyInputField(form.price_max)
        : '',
    set: (raw: string) => {
      form.price_max = parseMoneyInput(raw)
    },
  })

  return {
    form,
    priceMinInput,
    priceMaxInput,
    descriptionHtml,
    coverPhoto,
    durationMonths,
    isTopListing,
    topListingCredits,
    topCreditsNeeded,
    loadBillingCatalog,
    loadBillingAccount,
    saving,
    formError,
    uploadingCover,
    uploadingGallery,
    selectedMunicipality,
    richEditorRef,
    creditsDisplay,
    requiredCredits,
    prefillFromProfile,
    loadFromAd,
    uploadImage,
    markThumbnailTouched,
    submit,
    addGalleryFiles,
    removeGalleryAt,
    updateGalleryCaption,
    toggleServiceArea,
    showPriceAmounts,
    isOnlineOnly,
    user,
  }
}
