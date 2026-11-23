<template>
  <!-- Decorative illustrations in the "Limetková energia" style; the section
       text next to each one carries the actual message. -->
  <div aria-hidden="true" class="relative mx-auto w-full max-w-[560px] select-none">
    <!-- Job seeker: a list of offers and a sent application -->
    <div
      v-if="variant === 'seeker'"
      class="relative rounded-[28px] bg-jobbie-sun p-5 shadow-brutal-lg marketing:p-7"
    >
      <div class="mb-4 flex items-center gap-2 rounded-2xl border-2 border-jobbie-ink bg-white px-4 py-3">
        <AppIcon name="search" :size="18" class="text-jobbie-muted" />
        <span class="font-dmSans text-[15px] font-medium text-jobbie-muted">Brigáda v Žiline</span>
        <span class="ml-auto rounded-lg bg-jobbie-ink px-3 py-1.5 font-dmSans text-xs font-bold text-jobbie-lime">Hľadať</span>
      </div>
      <div class="flex flex-col gap-3">
        <div
          v-for="job in seekerJobs"
          :key="job.title"
          class="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-brutal"
        >
          <span class="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-jobbie-ink" :class="job.bg">
            <AppIcon :name="job.icon" :size="20" class="text-jobbie-ink" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-dmSans text-[15px] font-bold text-jobbie-ink">{{ job.title }}</span>
            <span class="block truncate font-dmSans text-[13px] font-medium text-jobbie-muted">{{ job.meta }}</span>
          </span>
          <span class="shrink-0 rounded-lg bg-jobbie-lime px-2.5 py-1 font-dmSans text-[13px] font-bold text-jobbie-ink">{{ job.pay }}</span>
        </div>
      </div>
      <div class="absolute -bottom-5 right-5 flex rotate-2 items-center gap-2.5 rounded-2xl bg-jobbie-ink px-4 py-3 shadow-[0_14px_32px_rgba(0,0,0,0.25)]">
        <span class="flex size-7 items-center justify-center rounded-full bg-jobbie-lime">
          <AppIcon name="check" :size="16" class="text-jobbie-ink" />
        </span>
        <span class="font-dmSans text-[13px] font-semibold text-white">Prihlásený pred chvíľou</span>
      </div>
    </div>

    <!-- Employer: applicants with ratings and statuses -->
    <div
      v-else-if="variant === 'employer'"
      class="relative rounded-[28px] bg-jobbie-lime p-5 shadow-brutal-lg marketing:p-7"
    >
      <div class="mb-4 flex items-center justify-between gap-3">
        <span class="font-display text-xl font-extrabold text-jobbie-ink">Prihlášky</span>
        <span class="rounded-full border-2 border-jobbie-ink bg-white px-3 py-1 font-dmSans text-xs font-bold text-jobbie-ink">Skladník · Žilina</span>
      </div>
      <div class="flex flex-col gap-3">
        <div
          v-for="person in applicants"
          :key="person.name"
          class="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-brutal"
        >
          <span class="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-jobbie-ink font-dmSans text-sm font-bold text-jobbie-ink" :class="person.bg">{{ person.initials }}</span>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-dmSans text-[15px] font-bold text-jobbie-ink">{{ person.name }}</span>
            <span class="flex items-center gap-1 font-dmSans text-[13px] font-medium text-jobbie-muted">
              <AppIcon name="star" :size="12" class="text-jobbie-ink" />
              {{ person.rating }}
            </span>
          </span>
          <span class="shrink-0 rounded-lg border-2 border-jobbie-ink px-2.5 py-1 font-dmSans text-xs font-bold text-jobbie-ink" :class="person.statusBg">{{ person.status }}</span>
        </div>
      </div>
      <div class="absolute -bottom-5 left-5 flex -rotate-2 items-center gap-2.5 rounded-2xl border-2 border-jobbie-ink bg-jobbie-pink px-4 py-3">
        <AppIcon name="chat" :size="18" class="text-jobbie-ink" />
        <span class="font-dmSans text-[13px] font-bold text-jobbie-ink">2 nové správy od uchádzačov</span>
      </div>
    </div>

    <!-- App: phone frame with the listing screen -->
    <!-- Newsletter: fresh news cards -->
    <div v-else class="relative rounded-[28px] bg-jobbie-pink p-5 shadow-brutal-lg marketing:p-7">
      <div class="mb-4 flex items-center gap-3">
        <span class="flex size-11 items-center justify-center rounded-xl border-2 border-jobbie-ink bg-white">
          <AppIcon name="mail" :size="20" class="text-jobbie-ink" />
        </span>
        <span class="font-display text-xl font-extrabold text-jobbie-ink">Novinky do schránky</span>
      </div>
      <div class="flex flex-col gap-3">
        <div
          v-for="note in newsletterItems"
          :key="note.title"
          class="flex items-start gap-3 rounded-2xl bg-white p-3.5 shadow-brutal"
        >
          <span class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border-2 border-jobbie-ink" :class="note.bg">
            <AppIcon :name="note.icon" :size="16" class="text-jobbie-ink" />
          </span>
          <span class="min-w-0">
            <span class="block font-dmSans text-[15px] font-bold text-jobbie-ink">{{ note.title }}</span>
            <span class="block font-dmSans text-[13px] font-medium text-jobbie-muted">{{ note.meta }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AppIconName } from '~/utils/app-icons'

defineProps<{
  variant: 'seeker' | 'employer' | 'newsletter'
}>()

const seekerJobs: { title: string; meta: string; pay: string; icon: AppIconName; bg: string }[] = [
  { title: 'Vychystávanie v sklade', meta: 'Žilina · Po – Pi', pay: '8 €/h', icon: 'package', bg: 'bg-[#FFD24D]' },
  { title: 'Obsluha na koncerte', meta: 'Žilina · Pi večer', pay: '9 €/h', icon: 'music', bg: 'bg-[#C6B6FF]' },
  { title: 'Kosenie záhrady', meta: 'Martin · Víkend', pay: 'Dohodou', icon: 'leaf', bg: 'bg-[#7FE3B8]' },
]

const applicants: { name: string; initials: string; rating: string; status: string; bg: string; statusBg: string }[] = [
  { name: 'Lucia K.', initials: 'LK', rating: '4,9 · 12 hodnotení', status: 'Pozvaná', bg: 'bg-[#9FD8FF]', statusBg: 'bg-jobbie-lime' },
  { name: 'Marek T.', initials: 'MT', rating: '4,7 · 5 hodnotení', status: 'Nový', bg: 'bg-[#FFD24D]', statusBg: 'bg-jobbie-pink' },
  { name: 'Eva S.', initials: 'ES', rating: '5,0 · 3 hodnotenia', status: 'Odložená', bg: 'bg-[#C6B6FF]', statusBg: 'bg-jobbie-cream' },
]

const newsletterItems: { title: string; meta: string; icon: AppIconName; bg: string }[] = [
  { title: 'Kde sa najviac zarába na brigádach', meta: 'Blog · 4 min čítania', icon: 'chart-line', bg: 'bg-jobbie-lime' },
  { title: 'Ako napísať profil, ktorý zaujme', meta: 'Tipy · 3 min čítania', icon: 'pencil', bg: 'bg-[#9FD8FF]' },
  { title: 'Nové brigády vo tvojom meste', meta: 'Každý týždeň', icon: 'bell', bg: 'bg-jobbie-sun' },
]
</script>
