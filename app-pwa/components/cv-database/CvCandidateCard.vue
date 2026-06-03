<template>
  <article
    class="flex w-full min-h-0 min-w-0 flex-col gap-4 overflow-hidden rounded-[15px] bg-marketing-surface p-4 shadow-[0px_0px_4px_0px_rgba(0,0,0,0.2)] sm:flex-row sm:items-stretch sm:gap-5 sm:p-5"
  >
    <div class="flex shrink-0 gap-3 sm:flex-col sm:items-center">
      <div
        class="relative size-14 shrink-0 overflow-hidden rounded-xl bg-marketing-soft sm:size-[72px]"
      >
        <img
          v-if="item.avatar_url"
          :src="item.avatar_url"
          alt=""
          class="size-full object-cover"
          width="72"
          height="72"
          loading="lazy"
          decoding="async"
        >
        <div
          v-else
          class="flex size-full items-center justify-center bg-[#7c3aed] font-dmSans text-lg font-bold text-white sm:text-xl"
        >
          {{ initials }}
        </div>
      </div>
    </div>

    <div class="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <div class="min-w-0">
        <h3 class="m-0 font-dmSans text-lg font-extrabold leading-tight text-black sm:text-xl">
          {{ item.candidate_display_name }}
        </h3>
        <p
          v-if="locationActivityLine"
          class="mt-1 font-dmSans text-sm font-medium leading-snug text-black/55"
        >
          {{ locationActivityLine }}
        </p>
        <p
          v-if="positionLine"
          class="mt-2 font-dmSans text-[15px] font-semibold leading-snug text-black"
        >
          {{ positionLine }}
        </p>
        <p
          v-if="metaLine"
          class="mt-1.5 font-dmSans text-sm leading-relaxed text-black/60"
        >
          {{ metaLine }}
        </p>
        <p
          v-if="salaryLine"
          class="mt-1 font-dmSans text-sm font-semibold text-marketing-green"
        >
          {{ salaryLine }}
        </p>
      </div>

      <div v-if="skillChips.length" class="min-w-0">
        <p class="m-0 mb-1.5 font-dmSans text-xs font-bold uppercase tracking-wide text-black/45">
          {{ S.cvDbCardSectionSkills }}
        </p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(s, idx) in skillChips"
            :key="`${s}-${idx}`"
            class="inline-flex rounded-full bg-marketing-soft px-3 py-1 text-sm font-medium text-black/80"
          >{{ s }}</span>
        </div>
      </div>

      <div v-if="languagesLine" class="min-w-0">
        <p class="m-0 mb-1 font-dmSans text-xs font-bold uppercase tracking-wide text-black/45">
          {{ S.cvDbCardSectionLangs }}
        </p>
        <p class="m-0 font-dmSans text-sm leading-relaxed text-black/70">
          {{ languagesLine }}
        </p>
      </div>

      <div
        v-if="item.contacts_visible && (item.contact_email || item.contact_phone)"
        class="min-w-0 rounded-xl border border-marketing-green/25 bg-marketing-mint/30 px-3 py-2.5"
      >
        <p class="m-0 mb-1.5 font-dmSans text-xs font-bold uppercase tracking-wide text-black/45">
          {{ S.cvDbContactSectionTitle }}
        </p>
        <p v-if="item.contact_email" class="m-0 font-dmSans text-sm text-black/80">
          <span class="font-semibold text-black">E-mail:</span>
          <a :href="`mailto:${item.contact_email}`" class="text-marketing-green hover:underline">{{ item.contact_email }}</a>
        </p>
        <p v-if="item.contact_phone" class="m-0 mt-1 font-dmSans text-sm text-black/80">
          <span class="font-semibold text-black">Telefón:</span>
          <a :href="`tel:${item.contact_phone}`" class="text-marketing-green hover:underline">{{ item.contact_phone }}</a>
        </p>
      </div>

      <div v-if="item.education_summary" class="hidden min-w-0 min-[380px]:block">
        <p class="m-0 mb-1 font-dmSans text-xs font-bold uppercase tracking-wide text-black/45">
          {{ S.cvDbCardSectionEducation }}
        </p>
        <p class="m-0 font-dmSans text-sm leading-relaxed text-black/70">
          {{ item.education_summary }}
        </p>
      </div>

      <div class="mt-auto flex flex-col gap-2 sm:hidden">
        <AppButton variant="primary" size="md" block @click="emit('view')">
          {{ S.cvDbCardViewCv }}
        </AppButton>
        <AppButton
          v-if="!item.contacts_visible"
          variant="outline"
          size="md"
          block
          :disabled="actionBusy"
          @click="emit('unlock')"
        >
          {{ unlockLabel }}
        </AppButton>
        <AppButton
          variant="outline"
          size="md"
          block
          :disabled="actionBusy"
          :title="contactDisabledTitle"
          @click="emit('contact')"
        >
          {{ S.cvDbContactCandidate }}
        </AppButton>
      </div>
    </div>

    <div class="hidden shrink-0 flex-col justify-center gap-2 sm:flex sm:min-w-[11rem]">
      <AppButton variant="primary" size="md" class="w-full min-[480px]:w-auto" @click="emit('view')">
        {{ S.cvDbCardViewCv }}
      </AppButton>
      <AppButton
        v-if="!item.contacts_visible"
        variant="outline"
        size="md"
        class="w-full min-[480px]:w-auto"
        :disabled="actionBusy"
        @click="emit('unlock')"
      >
        {{ unlockLabel }}
      </AppButton>
      <AppButton
        variant="outline"
        size="md"
        class="w-full min-[480px]:w-auto"
        :disabled="actionBusy"
        :title="contactDisabledTitle"
        @click="emit('contact')"
      >
        {{ S.cvDbContactCandidate }}
      </AppButton>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EmployerCvDatabaseListItem } from '~/types/employer-cv-database'
import { employmentTypeLabel } from '~/utils/employment-types'
import { S } from '~/utils/strings'

const props = withDefaults(
  defineProps<{
    item: EmployerCvDatabaseListItem
    activeSkillFilters?: string[]
    contactBusy?: boolean
    unlockBusy?: boolean
  }>(),
  {
    activeSkillFilters: () => [],
    contactBusy: false,
    unlockBusy: false,
  },
)

const emit = defineEmits<{
  view: []
  unlock: []
  contact: []
}>()

const actionBusy = computed(() => props.contactBusy || props.unlockBusy)

const unlockLabel = computed(() =>
  props.unlockBusy ? S.cvUnlockLoading : S.cvUnlockLabel,
)

const contactDisabledTitle = computed(() => (props.contactBusy ? '…' : undefined))

const initials = computed(() => {
  const n = props.item.candidate_display_name.trim()
  if (!n) return '?'
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0]![0] ?? ''
    const b = parts[parts.length - 1]!.replace(/\.$/, '')
    const bi = b[0] ?? a
    return (a + bi).toUpperCase()
  }
  return n.slice(0, 2).toUpperCase()
})

function skRokYears(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return `${n} rokov`
  const mod10 = n % 10
  if (mod10 === 1) return `${n} rokov`
  if (mod10 >= 2 && mod10 <= 4) return `${n} roky`
  return `${n} rokov`
}

const praxSegment = computed(() => {
  const y = props.item.years_of_experience
  const hasExp = Boolean(props.item.latest_experience)
  if (y == null) {
    return hasExp ? S.cvDbCardPraxLt1 : S.cvDbCardPraxNone
  }
  if (y === 0) {
    return hasExp ? S.cvDbCardPraxLt1 : S.cvDbCardPraxNone
  }
  if (y === 1) return S.cvDbCardPraxOne
  return `${S.cvDbCardPraxYears} ${skRokYears(y)}`
})

const positionLine = computed(() => {
  const want = props.item.desired_positions.map((x) => x.trim()).filter(Boolean)
  if (want.length) return want[0]!
  const pos = props.item.latest_experience?.position?.trim()
  return pos || ''
})

const cvUpdatedLine = computed(() => {
  try {
    const d = new Date(props.item.updated_at)
    const dateStr = d.toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    })
    return `${S.cvDbCardCvUpdatedPrefix} ${dateStr}`
  } catch {
    return ''
  }
})

const locationActivityLine = computed(() => {
  const loc = props.item.location?.trim()
  const act = cvUpdatedLine.value
  if (loc && act) return `${loc} · ${act}`
  if (loc) return loc
  if (act) return act
  return ''
})

function normalizeAvailability(raw: string | null | undefined): string {
  const t = (raw ?? '').trim()
  if (!t || t === 'Dátum') return ''
  const lower = t.toLowerCase()
  if (/(ihne[dď]|immediate|asap|okam[zž])/i.test(lower)) return S.cvDbCardStartImmediate
  if (/(dohod|po dohode|agreement)/i.test(lower)) return S.cvDbCardStartAgreement
  if (/(1\s*mesia|do\s*mesiac|30\s*dn)/i.test(lower)) return S.cvDbCardStartWithin1
  if (/(2\s*mesia|60\s*dn)/i.test(lower)) return S.cvDbCardStartWithin2
  if (/(3\s*mesia|90\s*dn)/i.test(lower)) return S.cvDbCardStartWithin3
  return t
}


const employmentSummary = computed(() => {
  const types = props.item.employment_types.map((x) => String(x).trim()).filter(Boolean)
  if (!types.length) return ''
  const labels = types.map(employmentTypeLabel)
  const max = 2
  const head = labels.slice(0, max)
  const rest = labels.length - max
  if (rest <= 0) return head.join(' · ')
  return `${head.join(' · ')} · +${rest}`
})

const metaLine = computed(() => {
  const parts: string[] = []
  parts.push(praxSegment.value)
  const avail = normalizeAvailability(props.item.start_availability ?? undefined)
  if (avail) parts.push(avail)
  const jt = employmentSummary.value
  if (jt) parts.push(jt)
  return parts.filter(Boolean).join(' · ')
})

const salaryLine = computed(() => {
  const min = props.item.salary_min
  if (min == null || min <= 0) return ''
  const amount = new Intl.NumberFormat('sk-SK').format(min)
  const period = props.item.salary_period === 'yearly' ? 'yearly' : 'monthly'
  const template =
    period === 'yearly' ? S.cvDbCardSalaryBruttoYearly : S.cvDbCardSalaryBruttoMonthly
  return template.replace('{amount}', amount)
})

function orderSkillsForDisplay(names: string[], filters: string[]): string[] {
  if (!filters.length) return [...names]
  const lower = names.map((s) => s.toLowerCase())
  const matched: string[] = []
  const used = new Set<number>()
  for (const f of filters) {
    const needle = f.trim().toLowerCase()
    if (!needle) continue
    for (let i = 0; i < names.length; i++) {
      if (used.has(i)) continue
      const s = lower[i]!
      if (s.includes(needle) || needle.includes(s)) {
        matched.push(names[i]!)
        used.add(i)
      }
    }
  }
  const rest: string[] = []
  for (let i = 0; i < names.length; i++) {
    if (!used.has(i)) rest.push(names[i]!)
  }
  return [...matched, ...rest]
}

const skillChips = computed(() => {
  const ordered = orderSkillsForDisplay(props.item.top_skills, props.activeSkillFilters)
  const max = 5
  const head = ordered.slice(0, max)
  const extra = ordered.length - max
  if (extra <= 0) return head
  return [...head, `+${extra}`]
})

const LANG_DISPLAY: Record<string, string> = {
  english: 'Angličtina',
  angličtina: 'Angličtina',
  slovak: 'Slovenčina',
  slovenčina: 'Slovenčina',
  german: 'Nemčina',
  nemčina: 'Nemčina',
  french: 'Francúzština',
  spanish: 'Španielčina',
}

function displayLanguageName(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  const mapped = LANG_DISPLAY[t.toLowerCase()]
  if (mapped) return mapped
  return t
}

const languagesLine = computed(() => {
  const langs = props.item.languages.slice(0, 3)
  if (!langs.length) return ''
  return langs
    .map((l) => {
      const name = displayLanguageName(l.language)
      const lvl = (l.level ?? '').trim().toUpperCase()
      return lvl ? `${name} ${lvl}` : name
    })
    .filter(Boolean)
    .join(' · ')
})
</script>
