<template>
  <!-- Decorative: the same information is in the hero text next to it. -->
  <div
    aria-hidden="true"
    class="relative h-[420px] w-full max-w-[520px] select-none overflow-hidden rounded-[32px] bg-jobbie-pink shadow-brutal-lg marketing:h-[500px]"
  >
    <div class="absolute -right-16 -top-16 size-[260px] rounded-full border-[44px] border-white/45" />
    <div class="absolute -bottom-24 -left-10 size-[220px] rounded-full bg-white/30" />

    <!-- Job card -->
    <div
      class="absolute left-6 right-14 top-9 flex -rotate-2 flex-col gap-3 rounded-[20px] bg-white p-5 shadow-brutal marketing:left-8 marketing:right-16 marketing:top-11"
    >
      <div class="flex items-center gap-3">
        <span class="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-jobbie-ink bg-[#9FD8FF]">
          <AppIcon name="truck" :size="22" class="text-jobbie-ink" />
        </span>
        <span class="min-w-0">
          <span class="block truncate font-dmSans text-base font-bold text-jobbie-ink">Pomoc pri sťahovaní</span>
          <span class="block truncate font-dmSans text-[13px] font-medium text-jobbie-muted">Žilina · So 8:00 – 14:00</span>
        </span>
      </div>
      <div class="flex flex-wrap gap-2">
        <span class="rounded-lg bg-jobbie-lime px-2.5 py-1 font-dmSans text-[13px] font-bold text-jobbie-ink">9,50 €/h</span>
        <span class="inline-flex items-center gap-1 rounded-lg border-[1.5px] border-[#E0D8BE] bg-jobbie-cream px-2.5 py-1 font-dmSans text-[13px] font-semibold text-jobbie-ink">
          <AppIcon name="star" :size="13" class="text-jobbie-ink" />
          4,8 · overená firma
        </span>
      </div>
    </div>

    <!-- Chat -->
    <div class="absolute left-14 right-5 top-[196px] flex rotate-[1.5deg] flex-col gap-2 marketing:left-20 marketing:top-[220px]">
      <div class="max-w-[85%] self-start rounded-[16px_16px_16px_4px] border-2 border-jobbie-ink bg-white px-3.5 py-3 font-dmSans text-sm font-medium leading-snug text-jobbie-ink">
        Ahoj! Videli sme tvoj profil. Môžeš v sobotu ráno?
      </div>
      <div class="max-w-[70%] self-end rounded-[16px_16px_4px_16px] border-2 border-jobbie-ink bg-jobbie-ink px-3.5 py-3 font-dmSans text-sm font-semibold text-jobbie-lime">
        Jasné, budem tam o 8:00
      </div>
    </div>

    <!-- Confirmation toast -->
    <div class="absolute bottom-8 left-6 flex items-center gap-3 rounded-2xl bg-jobbie-ink px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.25)] marketing:bottom-10 marketing:left-9">
      <span class="flex size-8 items-center justify-center rounded-full bg-jobbie-lime">
        <AppIcon name="check" :size="18" class="text-jobbie-ink" />
      </span>
      <span class="font-dmSans text-sm font-semibold text-white">Prihláška odoslaná jedným klikom</span>
    </div>
  </div>
</template>
