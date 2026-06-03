import { buildExportDataFromState } from '~/composables/useCvPrototypeShellState'
import { sortCvDrivingLicenseCategories } from '~/utils/cv-driving-license-categories'
import { openCvPreviewFromData } from '~/composables/useCvPrototypePreview'
import type { CvAggregateResponseDto } from '~/types/cv'
import { uiTemplateFromApiKey } from '~/utils/cv-prototype-template-map'
import { isoDateToMonthYear } from '~/utils/cv-month-year'
import { CV_PROTOTYPE_MONTH_OPTIONS } from '~/utils/cv-prototype-months'
import { formatCvStartAvailabilityLabel } from '~/utils/cv-start-availability'
import { JOB_POST_EMPLOYMENT_OPTIONS } from '~/utils/job-post-options'

type ExportCtx = Parameters<typeof buildExportDataFromState>[0]

function buildExportCtx(aggregate: CvAggregateResponseDto): ExportCtx {
  const header = aggregate.cv
  const monthOptions = [...CV_PROTOTYPE_MONTH_OPTIONS]
  const expDraft: ExportCtx['expDraft'] = {}
  for (const row of aggregate.experience) {
    const start = isoDateToMonthYear(row.start_date)
    const end = isoDateToMonthYear(row.end_date)
    const sm = start.month != null && start.year != null ? `${monthOptions[start.month]}` : 'Mesiac'
    const em = end.month != null && end.year != null ? `${monthOptions[end.month]}` : 'Mesiac'
    expDraft[row.id] = {
      position: row.position,
      company: row.company,
      city: row.city ?? '',
      current: row.current,
      fromYear: start.year != null ? String(start.year) : '',
      fromMonth: sm,
      toYear: end.year != null ? String(end.year) : '',
      toMonth: em,
      description: row.description ?? '',
    }
  }
  const eduDraftForPreview: ExportCtx['eduDraftForPreview'] = {}
  for (const row of aggregate.education) {
    const start = isoDateToMonthYear(row.start_date)
    const end = isoDateToMonthYear(row.end_date)
    eduDraftForPreview[row.id] = {
      education_kind: (row.education_kind as 'university' | 'secondary' | 'course_certificate') || 'university',
      school: row.school,
      field: row.field ?? '',
      institution: row.institution ?? '',
      has_graduation: row.has_graduation,
      fromYear: start.year != null ? String(start.year) : String(row.start_year ?? ''),
      toYear:
        row.currently_studying ? 'Neukončené' : end.year != null ? String(end.year) : String(row.end_year ?? ''),
      description: row.description ?? '',
      currently_studying: row.currently_studying,
    }
  }
  const skillDraft: ExportCtx['skillDraft'] = {}
  for (const row of aggregate.skills) {
    skillDraft[row.id] = { skill_name: row.skill_name, level: row.level }
  }
  const langDraft: ExportCtx['langDraft'] = {}
  for (const row of aggregate.languages) {
    langDraft[row.id] = { language: row.language, level: row.level }
  }
  const employmentLabels = JOB_POST_EMPLOYMENT_OPTIONS.filter((e) =>
    (header.employment_types ?? []).includes(e.value),
  ).map(
    (e) => e.label,
  )
  const startTerm = formatCvStartAvailabilityLabel(header.start_availability)
  const salaryUnitLabel = header.salary_period === 'hour' ? 'za hodinu' : 'za mesiac'
  return {
    uiTemplate: uiTemplateFromApiKey(header.template_key),
    header,
    aggregate,
    expDraft,
    eduDraftForPreview,
    skillDraft,
    langDraft,
    photoUrl: header.photo_url,
    employmentLabels,
    startTerm,
    salaryUnitLabel,
    licenseDisplay: sortCvDrivingLicenseCategories(header.driving_license_categories ?? []),
  }
}

export type CvHubPreviewResult = 'opened' | 'blocked' | 'error'

export function useCvHubPreview() {
  const { getCvAggregate } = useCv()
  async function openPreview(cvId: string): Promise<CvHubPreviewResult> {
    try {
      const aggregate = await getCvAggregate(cvId)
      const ctx = buildExportCtx(aggregate)
      const data = buildExportDataFromState(ctx)
      return (await openCvPreviewFromData(data, { cvId })) ? 'opened' : 'blocked'
    } catch {
      return 'error'
    }
  }
  return { openPreview }
}
