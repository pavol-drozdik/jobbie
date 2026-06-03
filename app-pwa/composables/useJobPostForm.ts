import type { Job } from '~/utils/job'
import { S } from '~/utils/strings'
import { pcSkillLabel } from '~/utils/job-alert-options'
import type { SkMunicipalityRow } from '~/utils/sk-municipality'
import { sanitizeJobDescriptionHtml } from '~/utils/sanitize-job-description-html'
import type { CvDrivingLicenseCategory } from '~/utils/cv-driving-license-categories'
import {
  cvCategoriesToDriverLicenseIds,
  driverLicenseIdsToCvCategories,
  toggleCvDriverLicenseCategory,
} from '~/utils/cv-driving-license-categories'
import {
  allowedSalaryTypesForEmployment,
  applyEmploymentTypeDefaults,
  employmentTypeFromLegacyJobType,
  employmentUsesStandardNastup,
  jobAdKindFromEmploymentType,
  normalizeJobPostEmploymentType,
  normalizeJobPostRequiredDocuments,
  type ApplicationMethodValue,
  type JobAdKind,
  type JobPostVariant,
  type SalaryTypeValue,
  type WorkModeValue,
} from '~/utils/job-post-options'
import {
  formatMoneyInputField,
  parseMoneyInput,
} from '~/utils/money-amount'

export type JobPostLanguageRow = { id: number; level: string }

const TURNUS_WORK_SHIFT_MODE_ID = 6

// Job post state: brigada/tpp/fuska schedule fields pack into requirements JSON for the API.
// Draft saves skip validateForPublish; activation charges credits on the server after publish.
export function useJobPostForm(opts?: { variant?: JobPostVariant }) {
  const variant: JobPostVariant = opts?.variant ?? 'domestic'
  const selectedEmploymentType = ref('brigada')
  const jobType = computed<JobAdKind>(() =>
    jobAdKindFromEmploymentType(selectedEmploymentType.value),
  )
  const title = ref('')
  const categorySlug = ref('')
  const workersNeeded = ref(1)

  const selectedMunicipality = ref<SkMunicipalityRow | null>(null)
  const regionEditable = ref('')
  const foreignWorkCountry = ref('')
  const foreignWorkCity = ref('')
  const streetLine = ref('')
  const postalCode = ref('')
  const workModes = ref<WorkModeValue[]>(['on_site'])

  const nastupDate = ref('')
  const nastupAsap = ref(false)
  const brigOd = ref('')
  const brigDo = ref('')
  const tppObdobie = ref<'urcite' | 'neurcite'>('urcite')
  const tppOd = ref('')
  const tppDo = ref('')
  const fuskaNezalezi = ref(false)
  const fuskaOd = ref('')
  const fuskaDo = ref('')
  const turnusOd = ref('')
  const turnusDo = ref('')
  const applicationDeadline = ref('')
  const weeklyHours = ref<number | ''>('')
  const estimatedHours = ref<number | ''>('')

  const salaryType = ref<SalaryTypeValue>('hourly')
  /** Plat — text field supports "10,50" and "10.50". */
  const salaryAmountInput = ref('')
  const salaryMax = ref<number | ''>('')
  const requiredExperience = ref('any')
  const educationLevel = ref<number | ''>('')
  const suitableFor = ref<number[]>([])
  const benefits = ref<number[]>([])
  const cvDriverLicenseCategories = ref<CvDrivingLicenseCategory[]>([])
  const workShiftModes = ref<number[]>([])
  const languageRows = ref<JobPostLanguageRow[]>([])
  const skillTags = ref<string[]>([])
  const ownCarRequired = ref(false)

  const descriptionHtml = ref('')
  const responsibilities = ref('')
  const requirementsText = ref('')
  const offerText = ref('')

  const applicationMethod = ref<ApplicationMethodValue>('platform')
  const contactPerson = ref('')
  const contactEmail = ref('')
  const contactPhone = ref('')
  const showPhonePublicly = ref(false)
  const applicationUrl = ref('')
  const requiredDocuments = ref<string[]>(['cv'])

  const coverPhoto = ref<string | null>(null)
  const extraPhotos = ref<string[]>([])
  const loadedPhotoUrls = ref<string[] | null>(null)
  const photosTouched = ref(false)
  const persistedCity = ref('')
  const persistedRegion = ref('')
  const isUrgent = ref(false)
  const isTopListing = ref(false)

  function markPhotosTouched(): void {
    photosTouched.value = true
  }

  function normalizePhotosFromJob(job: Job & Record<string, unknown>): string[] {
    const raw = job.photos
    if (Array.isArray(raw)) {
      return raw.filter(
        (url): url is string => typeof url === 'string' && url.trim().length > 0,
      )
    }
    if (raw && typeof raw === 'object') {
      return Object.values(raw as Record<string, unknown>).filter(
        (url): url is string => typeof url === 'string' && url.trim().length > 0,
      )
    }
    return []
  }

  // Apply employment defaults only until user edits typ úväzku (avoid clobbering manual choices).
  let adKindDefaultsApplied = false
  watch(selectedEmploymentType, (employmentType) => {
    const d = applyEmploymentTypeDefaults(employmentType)
    const allowed = allowedSalaryTypesForEmployment(employmentType)
    if (!adKindDefaultsApplied) {
      salaryType.value = d.salaryType
      requiredDocuments.value = [...d.requiredDocuments]
    } else if (!allowed.includes(salaryType.value)) {
      salaryType.value = d.salaryType
    }
    if (employmentType === 'turnus') {
      workShiftModes.value = [TURNUS_WORK_SHIFT_MODE_ID]
    }
  })

  function markAdKindDefaultsSeen(): void {
    adKindDefaultsApplied = true
  }

  function isRemoteOnly(): boolean {
    const modes = workModes.value
    return modes.length > 0 && modes.every((m) => m === 'remote')
  }

  function toggleWorkMode(mode: WorkModeValue): void {
    const set = new Set(workModes.value)
    if (set.has(mode)) set.delete(mode)
    else set.add(mode)
    workModes.value = [...set]
    if (workModes.value.length === 0) workModes.value = ['on_site']
  }

  function toggleCvDriverLicenseCategoryChip(
    category: CvDrivingLicenseCategory,
  ): void {
    cvDriverLicenseCategories.value = toggleCvDriverLicenseCategory(
      cvDriverLicenseCategories.value,
      category,
    )
  }

  function toggleRequiredDocument(value: string): void {
    if (value === 'none') {
      requiredDocuments.value = ['none']
      return
    }
    const next = requiredDocuments.value.filter((d) => d !== 'none')
    const set = new Set(next)
    if (set.has(value)) set.delete(value)
    else set.add(value)
    requiredDocuments.value = [...set]
  }

  function standardNastupPayload(): { nastup: string | null; asap: boolean } {
    return {
      nastup: nastupAsap.value ? null : nastupDate.value || null,
      asap: nastupAsap.value,
    }
  }

  function deriveStartFields(): {
    start_type: 'asap' | 'by_agreement' | 'date' | null
    start_date: string | null
  } {
    if (employmentUsesStandardNastup(selectedEmploymentType.value)) {
      if (nastupAsap.value) {
        return { start_type: 'asap', start_date: null }
      }
      if (nastupDate.value) {
        return { start_type: 'date', start_date: nastupDate.value }
      }
      return { start_type: null, start_date: null }
    }
    if (jobType.value === 'fuska') {
      if (fuskaNezalezi.value) {
        return { start_type: 'by_agreement', start_date: null }
      }
      if (fuskaOd.value) {
        return { start_type: 'date', start_date: fuskaOd.value }
      }
      return { start_type: null, start_date: null }
    }
    return { start_type: null, start_date: null }
  }

  function buildRequirementsPayload(): string {
    const meta = {
      v: 1 as const,
      job_kind: jobType.value,
      brigada: {
        ...standardNastupPayload(),
        od: brigOd.value || null,
        do: brigDo.value || null,
      },
      tpp: {
        ...standardNastupPayload(),
        obdobie: tppObdobie.value,
        od: tppObdobie.value === 'urcite' ? tppOd.value || null : null,
        do: tppObdobie.value === 'urcite' ? tppDo.value || null : null,
      },
      fuska: {
        nezalezi: fuskaNezalezi.value,
        od: !fuskaNezalezi.value ? fuskaOd.value || null : null,
        do: !fuskaNezalezi.value ? fuskaDo.value || null : null,
      },
      turnus: {
        od: turnusOd.value || null,
        do: turnusDo.value || null,
      },
    }
    return JSON.stringify(meta)
  }

  function buildPhotos(): string[] {
    const photos: string[] = []
    if (coverPhoto.value) photos.push(coverPhoto.value)
    extraPhotos.value.forEach((url) => {
      if (!photos.includes(url)) photos.push(url)
    })
    return photos
  }

  function parseNum(v: number | string | ''): number | null {
    if (v === '' || v === null) return null
    if (typeof v === 'number') {
      return Number.isFinite(v) ? parseMoneyInput(v) : null
    }
    return parseMoneyInput(v)
  }

  function buildApiBody(isDraft: boolean, plainDescription: string) {
    const salMin = parseMoneyInput(salaryAmountInput.value)
    const negotiable = salaryType.value === 'negotiable'
    const isForeignPost = variant === 'foreign'
    const krajPart = isForeignPost
      ? foreignWorkCountry.value.trim()
      : regionEditable.value.trim() ||
        selectedMunicipality.value?.kraj ||
        persistedRegion.value ||
        ''
    const cityName = isForeignPost
      ? foreignWorkCity.value.trim()
      : (selectedMunicipality.value?.name ?? persistedCity.value ?? '').trim()
    const locationLabel =
      cityName && krajPart ? `${cityName}, ${krajPart}` : cityName || krajPart || null

    const builtPhotos = buildPhotos()
    const photosPayload: { photos?: string[] } = {}
    if (photosTouched.value || builtPhotos.length > 0) {
      photosPayload.photos = builtPhotos
    } else if (loadedPhotoUrls.value !== null && loadedPhotoUrls.value.length === 0) {
      photosPayload.photos = []
    }

    return {
      title: title.value.trim() || 'Koncept',
      description:
        sanitizeJobDescriptionHtml(descriptionHtml.value) || plainDescription || ' ',
      location: locationLabel,
      location_address: streetLine.value.trim() || null,
      city: cityName || null,
      postal_code: postalCode.value.trim() || null,
      show_exact_address: false,
      salary: null as string | null,
      category: categorySlug.value || null,
      application_deadline: applicationDeadline.value.trim()
        ? `${applicationDeadline.value.trim()}T12:00:00.000Z`
        : null,
      is_urgent: isUrgent.value,
      ...(!isDraft ? { want_top_listing: isTopListing.value } : {}),
      is_draft: isDraft,
      ...photosPayload,
      job_type: jobType.value,
      employment_types: [selectedEmploymentType.value],
      work_modes: [...workModes.value],
      work_mode: workModes.value[0] ?? 'on_site',
      requirements: buildRequirementsPayload(),
      workers_needed: Math.max(1, Math.floor(Number(workersNeeded.value) || 1)),
      salary_type: negotiable ? 'negotiable' : salMin !== null ? salaryType.value : null,
      salary_min: negotiable ? null : salMin,
      salary_max: null,
      salary_negotiable: negotiable,
      education_levels:
        educationLevel.value !== '' ? [educationLevel.value] : [],
      benefits: [...benefits.value],
      suitable_for: [...suitableFor.value],
      driver_licenses: cvCategoriesToDriverLicenseIds(
        cvDriverLicenseCategories.value,
      ),
      work_shift_modes: [...workShiftModes.value],
      languages: languageRows.value.map((r) => ({
        language_id: r.id,
        level: r.level,
      })),
      pc_skills: [],
      ...deriveStartFields(),
      required_experience: requiredExperience.value || 'any',
      weekly_hours: parseNum(weeklyHours.value),
      estimated_hours: parseNum(estimatedHours.value),
      own_car_required: ownCarRequired.value,
      application_method: applicationMethod.value,
      contact_person: contactPerson.value.trim() || null,
      contact_email: contactEmail.value.trim() || null,
      contact_phone: contactPhone.value.trim() || null,
      show_phone_publicly: showPhonePublicly.value,
      application_url: applicationUrl.value.trim() || null,
      required_documents: normalizeJobPostRequiredDocuments([
        ...requiredDocuments.value,
      ]),
      responsibilities: responsibilities.value.trim() || null,
      requirements_text: requirementsText.value.trim() || null,
      offer_text: offerText.value.trim() || null,
      skill_tags: [...skillTags.value],
      work_from_home:
        workModes.value.includes('hybrid') || workModes.value.includes('remote'),
      is_foreign: variant === 'foreign',
    }
  }

  function validateForPublish(
    plainDescription: string,
    isDraft: boolean,
  ): string | null {
    if (isDraft) return null // incomplete data allowed while drafting
    if (!title.value.trim()) return 'Názov inzerátu je povinný.'
    if (title.value.trim().length > 120) {
      return 'Názov inzerátu môže mať najviac 120 znakov.'
    }
    if (!plainDescription.trim()) return 'Popis práce je povinný.'
    if (!categorySlug.value.trim()) return 'Vyberte kategóriu.'
    if (!selectedEmploymentType.value.trim()) {
      return 'Vyberte typ úväzku.'
    }
    if (workModes.value.length === 0) {
      return 'Vyberte aspoň jednu formu práce.'
    }
    // Fully remote/hybrid-without-address jobs omit street and municipality requirements.
    if (!isRemoteOnly()) {
      if (variant === 'foreign') {
        if (!foreignWorkCountry.value.trim()) {
          return S.jobPostForeignCountryRequired
        }
        if (!foreignWorkCity.value.trim()) {
          return S.jobPostForeignCityRequired
        }
      } else if (!selectedMunicipality.value) {
        return 'Vyberte mesto alebo obec.'
      }
      if (!streetLine.value.trim()) {
        return 'Zadajte ulicu a číslo.'
      }
    }
    const negotiable = salaryType.value === 'negotiable'
    if (!negotiable) {
      const amount = parseMoneyInput(salaryAmountInput.value)
      if (amount === null || amount <= 0) {
        return 'Zadajte plat alebo označte plat ako dohodou.'
      }
    }
    if (applicationMethod.value === 'email' && !contactEmail.value.trim()) {
      return 'Zadajte kontaktný e-mail.'
    }
    if (applicationMethod.value === 'phone' && !contactPhone.value.trim()) {
      return 'Zadajte telefón.'
    }
    if (applicationMethod.value === 'external' && !applicationUrl.value.trim()) {
      return 'Zadajte odkaz na prihlásenie.'
    }
    const docs = requiredDocuments.value
    if (docs.includes('none') && docs.length > 1) {
      return 'Ak nie je potrebné nič, ostatné dokumenty musia byť odznačené.'
    }
    if (applicationDeadline.value) {
      const d = new Date(`${applicationDeadline.value}T23:59:59`)
      if (d.getTime() < Date.now()) {
        return 'Termín prihlášky nemôže byť v minulosti.'
      }
    }
    if (selectedEmploymentType.value === 'turnus') {
      if (!turnusOd.value.trim() || !turnusDo.value.trim()) {
        return 'Pre turnusovú prácu zadajte obdobie od a do.'
      }
    }
    return null
  }

  function hydrateFromJob(job: Job & Record<string, unknown>): void {
    markAdKindDefaultsSeen()
    const emp = Array.isArray(job.employment_types)
      ? (job.employment_types as string[]).filter(Boolean)
      : []
    selectedEmploymentType.value = normalizeJobPostEmploymentType(
      emp[0] ?? employmentTypeFromLegacyJobType(job.job_type),
      job.is_foreign === true || variant === 'foreign' ? 'foreign' : 'domestic',
    )
    title.value = job.title ?? ''
    categorySlug.value = job.category ?? ''
    workersNeeded.value = Number(job.workers_needed) || 1
    streetLine.value = job.location_address ?? ''
    postalCode.value = String(job.postal_code ?? '')
    applicationDeadline.value = job.application_deadline
      ? String(job.application_deadline).slice(0, 10)
      : ''
    descriptionHtml.value = sanitizeJobDescriptionHtml(job.description ?? '')
    const photoUrls = normalizePhotosFromJob(job)
    loadedPhotoUrls.value = photoUrls
    photosTouched.value = false
    coverPhoto.value = photoUrls[0] ?? null
    extraPhotos.value = photoUrls.slice(1)
    isUrgent.value = Boolean(job.is_urgent)
    isTopListing.value = Boolean(job.show_top_badge)
    workModes.value = (
      Array.isArray(job.work_modes) && (job.work_modes as string[]).length > 0
        ? (job.work_modes as WorkModeValue[])
        : job.work_mode
          ? [job.work_mode as WorkModeValue]
          : ['on_site']
    ) as WorkModeValue[]
    salaryType.value = (job.salary_type as SalaryTypeValue) || 'monthly'
    const allowedSalary = allowedSalaryTypesForEmployment(
      selectedEmploymentType.value,
    )
    if (!allowedSalary.includes(salaryType.value)) {
      salaryType.value = applyEmploymentTypeDefaults(
        selectedEmploymentType.value,
      ).salaryType
    }
    const loadedSalary =
      job.salary_min != null
        ? Number(job.salary_min)
        : job.salary_max != null
          ? Number(job.salary_max)
          : null
    salaryAmountInput.value =
      loadedSalary != null && Number.isFinite(loadedSalary)
        ? formatMoneyInputField(loadedSalary)
        : ''
    salaryMax.value = ''
    if (job.salary_negotiable || job.salary_type === 'negotiable') {
      salaryType.value = 'negotiable'
      salaryAmountInput.value = ''
    }
    const eduIds = (job.education_levels ?? []).filter(
      (id): id is number => typeof id === 'number' && Number.isFinite(id),
    )
    educationLevel.value =
      eduIds.length > 0 ? Math.min(...eduIds) : ''
    suitableFor.value = [...(job.suitable_for ?? [])]
    benefits.value = [...(job.benefits ?? [])]
    cvDriverLicenseCategories.value = driverLicenseIdsToCvCategories(
      job.driver_licenses ?? [],
    )
    workShiftModes.value = [...(job.work_shift_modes ?? [])]
    languageRows.value = (job.languages ?? []).map((l) => ({
      id: l.language_id,
      level: l.level,
    }))
    const tags = [...(job.skill_tags ?? [])]
    for (const s of job.pc_skills ?? []) {
      const label = pcSkillLabel(s.skill_id)
      if (label && !label.startsWith('#') && !tags.includes(label)) {
        tags.push(label)
      }
    }
    skillTags.value = tags
    requiredExperience.value = String(job.required_experience ?? 'any')
    weeklyHours.value =
      job.weekly_hours != null ? Number(job.weekly_hours) : ''
    estimatedHours.value =
      job.estimated_hours != null ? Number(job.estimated_hours) : ''
    ownCarRequired.value = Boolean(job.own_car_required)
    const legacyStartDate = job.start_date
      ? String(job.start_date).slice(0, 10)
      : ''
    responsibilities.value = String(job.responsibilities ?? '')
    requirementsText.value = String(job.requirements_text ?? '')
    offerText.value = String(job.offer_text ?? '')
    applicationMethod.value =
      (job.application_method as ApplicationMethodValue) || 'platform'
    contactPerson.value = String(job.contact_person ?? '')
    contactEmail.value = String(job.contact_email ?? job.employer_email ?? '')
    contactPhone.value = String(job.contact_phone ?? '')
    showPhonePublicly.value = Boolean(job.show_phone_publicly)
    applicationUrl.value = String(job.application_url ?? '')
    requiredDocuments.value = normalizeJobPostRequiredDocuments(
      Array.isArray(job.required_documents) && job.required_documents.length > 0
        ? (job.required_documents as string[])
        : ['cv'],
    )
    const loc = (job.location ?? '').trim()
    const cityFromRow = String(job.city ?? '').trim()
    if (variant === 'foreign' || job.is_foreign === true) {
      foreignWorkCity.value = cityFromRow
      foreignWorkCountry.value = ''
      if (loc) {
        const comma = loc.indexOf(',')
        if (comma >= 0) {
          if (!foreignWorkCity.value) {
            foreignWorkCity.value = loc.slice(0, comma).trim()
          }
          foreignWorkCountry.value = loc.slice(comma + 1).trim()
        } else if (!foreignWorkCity.value) {
          foreignWorkCity.value = loc
        }
      }
      selectedMunicipality.value = null
      regionEditable.value = ''
    } else {
      foreignWorkCity.value = ''
      foreignWorkCountry.value = ''
      persistedCity.value = cityFromRow
      if (loc) {
        const parts = loc.split(',')
        regionEditable.value =
          parts.length > 1 ? parts.slice(1).join(',').trim() : ''
        persistedRegion.value = regionEditable.value
      } else {
        persistedRegion.value = ''
      }
    }
    try {
      const req = job.requirements ? JSON.parse(job.requirements) : null
      if (jobType.value === 'brigada' && req?.brigada) {
        nastupAsap.value =
          Boolean(req.brigada.asap) || job.start_type === 'asap'
        nastupDate.value = nastupAsap.value
          ? ''
          : String(req.brigada.nastup ?? '').slice(0, 10)
        brigOd.value = req.brigada.od ?? ''
        brigDo.value = req.brigada.do ?? ''
      }
      if (jobType.value === 'tpp' && req?.tpp) {
        nastupAsap.value = Boolean(req.tpp.asap) || job.start_type === 'asap'
        nastupDate.value = nastupAsap.value
          ? ''
          : String(req.tpp.nastup ?? '').slice(0, 10)
        tppObdobie.value = req.tpp.obdobie ?? 'urcite'
        tppOd.value = req.tpp.od ?? ''
        tppDo.value = req.tpp.do ?? ''
      }
      if (req?.fuska) {
        fuskaNezalezi.value = Boolean(req.fuska.nezalezi)
        fuskaOd.value = req.fuska.od ?? ''
        fuskaDo.value = req.fuska.do ?? ''
      }
      if (selectedEmploymentType.value === 'turnus' && req?.turnus) {
        turnusOd.value = req.turnus.od ?? ''
        turnusDo.value = req.turnus.do ?? ''
      }
    } catch {
      /* ignore */
    }
    if (
      employmentUsesStandardNastup(selectedEmploymentType.value) &&
      !nastupDate.value &&
      !nastupAsap.value &&
      legacyStartDate
    ) {
      if (job.start_type === 'asap') {
        nastupAsap.value = true
      } else {
        nastupDate.value = legacyStartDate
      }
    }
    if (job.job_type === 'fuska' && !fuskaOd.value && legacyStartDate) {
      fuskaOd.value = legacyStartDate
      fuskaNezalezi.value = false
    }
  }

  async function resolveDomesticMunicipality(
    ensureMunicipality: (name: string) => Promise<SkMunicipalityRow | null>,
  ): Promise<void> {
    if (variant === 'foreign') {
      return
    }
    const name = persistedCity.value.trim()
    if (!name) {
      return
    }
    const row = await ensureMunicipality(name)
    if (row) {
      selectedMunicipality.value = row
      regionEditable.value = row.kraj
      persistedRegion.value = row.kraj
      return
    }
    selectedMunicipality.value = {
      id: 0,
      name,
      kraj: persistedRegion.value,
      okres: '',
    }
  }

  return {
    selectedEmploymentType,
    jobType,
    title,
    categorySlug,
    workersNeeded,
    selectedMunicipality,
    regionEditable,
    foreignWorkCountry,
    foreignWorkCity,
    streetLine,
    postalCode,
    workModes,
    nastupDate,
    nastupAsap,
    brigOd,
    brigDo,
    tppObdobie,
    tppOd,
    tppDo,
    fuskaNezalezi,
    fuskaOd,
    fuskaDo,
    turnusOd,
    turnusDo,
    applicationDeadline,
    variant,
    weeklyHours,
    estimatedHours,
    salaryType,
    salaryAmountInput,
    salaryMax,
    requiredExperience,
    educationLevel,
    suitableFor,
    benefits,
    cvDriverLicenseCategories,
    workShiftModes,
    languageRows,
    skillTags,
    ownCarRequired,
    descriptionHtml,
    responsibilities,
    requirementsText,
    offerText,
    applicationMethod,
    contactPerson,
    contactEmail,
    contactPhone,
    showPhonePublicly,
    applicationUrl,
    requiredDocuments,
    coverPhoto,
    extraPhotos,
    isUrgent,
    isTopListing,
    isRemoteOnly,
    toggleWorkMode,
    toggleCvDriverLicenseCategoryChip,
    toggleRequiredDocument,
    buildApiBody,
    validateForPublish,
    hydrateFromJob,
    resolveDomesticMunicipality,
    markPhotosTouched,
    markAdKindDefaultsSeen,
  }
}
