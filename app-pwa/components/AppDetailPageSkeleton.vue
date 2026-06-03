<template>
  <div>
    <!-- Mobile: salary block after title; similar at end -->
    <div class="flex w-full flex-col gap-5 marketing:hidden" role="status" aria-busy="true" aria-label="Načítava sa">
    <div class="mb-1 h-5 w-40 animate-pulse rounded bg-gray-200/60" />
    <div class="h-80 w-full animate-pulse rounded-[20px] bg-gray-200/45" />
    <div class="rounded-[20px] bg-white px-6 py-6 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9 marketing:py-8">
      <div class="mb-5 h-9 w-full max-w-xl animate-pulse rounded-lg bg-gray-200/80" />
      <div class="flex flex-wrap gap-2.5">
        <div class="h-9 w-28 animate-pulse rounded-full bg-gray-200/55" />
        <div class="h-9 w-36 animate-pulse rounded-full bg-gray-200/50" />
      </div>
    </div>
    <div class="flex flex-col gap-3.5 rounded-[20px] bg-white p-7 shadow-[0_0_12px_rgba(0,0,0,0.07)]">
      <div class="h-3 w-24 animate-pulse rounded bg-gray-200/70" />
      <div class="h-11 w-40 animate-pulse rounded-lg bg-gray-200/80" />
      <div class="h-4 w-28 animate-pulse rounded bg-gray-200/60" />
      <div class="h-px w-full bg-gray-100" />
      <div class="h-14 w-full animate-pulse rounded-full bg-gray-200/50" />
      <div class="h-[50px] w-full animate-pulse rounded-full bg-gray-200/40" />
    </div>
    <div class="flex items-center gap-[18px] rounded-[20px] bg-white px-7 py-6 shadow-[0_0_12px_rgba(0,0,0,0.07)]">
      <div class="size-[58px] shrink-0 animate-pulse rounded-full bg-gray-200/70" />
      <div class="min-w-0 flex-1 space-y-2">
        <div class="h-3 w-16 animate-pulse rounded bg-gray-200/55" />
        <div class="h-5 w-44 animate-pulse rounded bg-gray-200/70" />
      </div>
      <div class="h-10 w-28 shrink-0 animate-pulse rounded-full bg-gray-200/45" />
    </div>
    <div class="rounded-[20px] bg-white px-6 py-8 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9">
      <div class="mb-[18px] h-6 w-36 animate-pulse rounded bg-gray-200/75" />
      <div class="space-y-2">
        <div class="h-3 w-full animate-pulse rounded bg-gray-200/55" />
        <div class="h-3 w-full animate-pulse rounded bg-gray-200/50" />
        <div class="h-3 w-[92%] animate-pulse rounded bg-gray-200/45" />
      </div>
    </div>
    <div class="rounded-[20px] bg-white p-6 shadow-[0_0_12px_rgba(0,0,0,0.07)]">
      <div class="h-5 w-40 animate-pulse rounded bg-gray-200/75" />
      <div class="mt-4 flex flex-col gap-3">
        <div v-for="n in 3" :key="n" class="flex items-center gap-3.5 rounded-[14px] p-3">
          <div class="size-14 shrink-0 animate-pulse rounded-xl bg-gray-200/60" />
          <div class="min-w-0 flex-1 space-y-2">
            <div class="h-4 w-full animate-pulse rounded bg-gray-200/65" />
            <div class="h-3 w-2/3 animate-pulse rounded bg-gray-200/50" />
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- Desktop: main + sidebar (matches jobs/[id]) -->
  <div
    class="hidden w-full min-w-0 marketing:grid marketing:grid-cols-[minmax(0,1fr)_380px] marketing:items-start marketing:gap-x-9"
    role="status"
    aria-busy="true"
    aria-label="Načítava sa"
  >
    <div class="w-full min-w-0 space-y-5">
      <div class="mb-5 h-5 w-40 animate-pulse rounded bg-gray-200/60" />
      <div class="h-80 w-full animate-pulse rounded-[20px] bg-gray-200/45" />
      <div class="rounded-[20px] bg-white px-6 py-6 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9 marketing:py-8">
        <div class="mb-5 h-9 w-full max-w-xl animate-pulse rounded-lg bg-gray-200/80" />
        <div class="flex flex-wrap gap-2.5">
          <div class="h-9 w-28 animate-pulse rounded-full bg-gray-200/55" />
          <div class="h-9 w-36 animate-pulse rounded-full bg-gray-200/50" />
        </div>
      </div>
      <div class="flex items-center gap-[18px] rounded-[20px] bg-white px-7 py-6 shadow-[0_0_12px_rgba(0,0,0,0.07)]">
        <div class="size-[58px] shrink-0 animate-pulse rounded-full bg-gray-200/70" />
        <div class="min-w-0 flex-1 space-y-2">
          <div class="h-3 w-16 animate-pulse rounded bg-gray-200/55" />
          <div class="h-5 w-44 animate-pulse rounded bg-gray-200/70" />
        </div>
        <div class="h-10 w-28 shrink-0 animate-pulse rounded-full bg-gray-200/45" />
      </div>
      <div class="rounded-[20px] bg-white px-6 py-8 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9">
        <div class="mb-[18px] h-6 w-36 animate-pulse rounded bg-gray-200/75" />
        <div class="space-y-2">
          <div class="h-3 w-full animate-pulse rounded bg-gray-200/55" />
          <div class="h-3 w-full animate-pulse rounded bg-gray-200/50" />
          <div class="h-3 w-[92%] animate-pulse rounded bg-gray-200/45" />
        </div>
      </div>
    </div>
    <aside class="relative w-full min-w-0">
      <div class="flex w-full flex-col gap-5 marketing:mt-[40px]">
      <div class="flex flex-col gap-3.5 rounded-[20px] bg-white p-7 shadow-[0_0_12px_rgba(0,0,0,0.07)]">
        <div class="h-3 w-24 animate-pulse rounded bg-gray-200/70" />
        <div class="h-11 w-40 animate-pulse rounded-lg bg-gray-200/80" />
        <div class="h-4 w-28 animate-pulse rounded bg-gray-200/60" />
        <div class="h-px w-full bg-gray-100" />
        <div class="h-14 w-full animate-pulse rounded-full bg-gray-200/50" />
        <div class="h-[50px] w-full animate-pulse rounded-full bg-gray-200/40" />
      </div>
      <div class="rounded-[20px] bg-white p-6 shadow-[0_0_12px_rgba(0,0,0,0.07)]">
        <div class="h-5 w-40 animate-pulse rounded bg-gray-200/75" />
        <div class="mt-4 flex flex-col gap-3">
          <div v-for="n in 3" :key="n" class="flex items-center gap-3.5 rounded-[14px] p-3">
            <div class="size-14 shrink-0 animate-pulse rounded-xl bg-gray-200/60" />
            <div class="min-w-0 flex-1 space-y-2">
              <div class="h-4 w-full animate-pulse rounded bg-gray-200/65" />
              <div class="h-3 w-2/3 animate-pulse rounded bg-gray-200/50" />
            </div>
          </div>
        </div>
      </div>
      </div>
    </aside>
  </div>
  </div>
</template>
