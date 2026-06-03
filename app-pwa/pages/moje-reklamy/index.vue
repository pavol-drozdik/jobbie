<template>

  <div

    v-if="authLoading"

    class="flex min-h-[40vh] items-center justify-center px-5 py-20 font-dmSans text-black/50"

  >

    {{ S.loading }}

  </div>

  <LoggedOutFeatureHero

    v-else-if="!user"

    title="Pridaj svoju službu medzi profesionálov"

    description="Vytvor reklamu pre svoju firmu alebo ponúkanú službu."

    :benefits="[

      'Predstav svoju firmu alebo službu zákazníkom',

      'Získaj nové dopyty z tvojho okolia',

      'Spravuj svoju reklamu jednoducho online',

    ]"

    image-src="/home-design/feature-employer.webp"

    image-alt="Pridanie služby medzi profesionálov"

    :redirect-path="redirectPath"

  />

  <div v-else-if="!isProvider" class="min-h-screen bg-marketing-mint px-5 py-16 font-dmSans">

    <div class="mx-auto max-w-lg rounded-[20px] bg-white p-6 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.1)]">

      <p class="m-0 text-sm text-black/70">{{ S.firmyProviderRequired }}</p>

      <AppButton variant="primary" size="lg" class="mt-4 max-w-xs" :to="ROUTES.profile">

        {{ S.firmyGoToProfile }}

      </AppButton>

    </div>

  </div>

  <div v-else class="min-h-screen bg-marketing-mint font-dmSans text-black">

    <div class="mx-auto box-border w-full max-w-[1400px] px-5 pb-16 pt-0">

      <div class="mt-[30px] flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">

        <div class="min-w-0">

          <h1 class="m-0 font-dmSans text-[28px] font-extrabold leading-tight text-black sm:text-[32px]">

            {{ S.firmyHubTitle }}

          </h1>

          <p class="m-0 mt-2 max-w-2xl text-[15px] leading-relaxed text-black/50">

            {{ S.firmyHubPageDescription }}

          </p>

        </div>

        <NuxtLink

          :to="ROUTES.myAdsNew"

          class="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-marketing-green px-5 font-dmSans text-[14px] font-bold text-white no-underline hover:opacity-95 sm:h-12 sm:px-6 sm:text-[15px]"

        >

          {{ ads.length ? S.firmyHubNewAnother : S.firmyHubNewAd }}

        </NuxtLink>

      </div>



      <div v-if="loadError" class="mt-6 rounded-[20px] border border-red-200 bg-red-50 px-5 py-4 text-[15px] text-red-800">

        {{ loadError }}

        <button

          type="button"

          class="ml-2 font-semibold text-marketing-green underline"

          @click="loadAds()"

        >

          {{ S.cvDbErrorRetry }}

        </button>

      </div>



      <div v-if="loading" class="mt-10 space-y-3">

        <div

          v-for="n in 3"

          :key="n"

          class="h-[84px] animate-pulse rounded-[20px] bg-white shadow-[0px_3px_6px_1px_rgba(0,0,0,0.08)]"

        />

      </div>



      <template v-else-if="!loadError">

        <div v-if="ads.length === 0" class="mt-10 lg:mt-12">

          <div

            class="rounded-[20px] border border-black/[0.06] border-l-[4px] border-l-marketing-green bg-white pl-5 pr-6 py-6 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.1)] sm:pl-6 sm:pr-8 sm:py-7"

          >

            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">

              <div class="flex shrink-0 justify-center sm:pt-0.5">

                <span class="flex size-11 items-center justify-center rounded-full bg-marketing-panel text-marketing-green">

                  <AppIcon name="building" :size="22" />

                </span>

              </div>

              <div class="min-w-0 text-center sm:text-left">

                <p class="m-0 text-[17px] font-bold leading-snug text-black">

                  {{ S.firmyHubEmptyCalloutTitle }}

                </p>

                <p class="m-0 mt-2 text-[15px] leading-relaxed text-black/50">

                  {{ S.firmyHubEmptyCalloutBody }}

                </p>

                <p class="m-0 mt-4">

                  <NuxtLink

                    :to="ROUTES.myAdsNew"

                    class="inline-flex items-center justify-center rounded-full bg-marketing-green px-5 py-2.5 text-[14px] font-bold text-white no-underline hover:opacity-95"

                  >

                    {{ S.firmyHubEmptyCalloutLink }}

                  </NuxtLink>

                </p>

              </div>

            </div>

          </div>

        </div>



        <div v-else class="mt-8 sm:mt-10">

          <div

            v-if="showAllDraftsAlert"

            class="mb-8 flex gap-3 rounded-[20px] border border-red-200 bg-red-50 px-4 py-4 sm:gap-4 sm:px-5 sm:py-4"

            role="alert"

          >

            <span class="mt-0.5 shrink-0 text-red-600" aria-hidden="true">

              <AppIcon name="triangle-alert" :size="22" />

            </span>

            <div class="min-w-0">

              <p class="m-0 text-[15px] font-bold leading-snug text-red-950">

                {{ S.firmyHubAllDraftsAlertLead }}

              </p>

              <p class="m-0 mt-2 text-[14px] leading-relaxed text-red-900/80">

                {{ S.firmyHubAllDraftsAlertBody }}

              </p>

            </div>

          </div>



          <template v-if="showSectionedList">

            <h2 class="m-0 mb-2.5 px-0.5 font-dmSans text-[12px] font-bold uppercase tracking-[0.08em] text-black/30">

              {{ S.firmyHubSectionDraft }}

            </h2>

            <ul class="m-0 mb-8 list-none space-y-2.5 p-0 sm:mb-10 sm:space-y-3">

              <li v-for="ad in draftAds" :key="ad.id">

                <CompanyAdHubRow

                  :ad="ad"


                  :date-line="formatRowDateLine(ad)"

                  @rename="openRename(ad)"

                  @delete="remove(ad.id)"

                />

              </li>

            </ul>

            <template v-if="publishedAds.length">

              <h2 class="m-0 mb-2.5 px-0.5 font-dmSans text-[12px] font-bold uppercase tracking-[0.08em] text-black/30">

                {{ S.firmyHubSectionPublished }}

              </h2>

              <ul class="m-0 mb-8 list-none space-y-2.5 p-0 sm:mb-10 sm:space-y-3">

                <li v-for="ad in publishedAds" :key="ad.id">

                  <CompanyAdHubRow

                    :ad="ad"


                    :date-line="formatRowDateLine(ad)"

                    @rename="openRename(ad)"

                    @delete="remove(ad.id)"

                  />

                </li>

              </ul>

            </template>

            <template v-if="inactiveAds.length">

              <h2 class="m-0 mb-2.5 px-0.5 font-dmSans text-[12px] font-bold uppercase tracking-[0.08em] text-black/30">

                {{ S.firmyHubSectionInactive }}

              </h2>

              <ul class="m-0 list-none space-y-2.5 p-0 sm:space-y-3">

                <li v-for="ad in inactiveAds" :key="ad.id">

                  <CompanyAdHubRow

                    :ad="ad"


                    :date-line="formatRowDateLine(ad)"

                    @rename="openRename(ad)"

                    @delete="remove(ad.id)"

                  />

                </li>

              </ul>

            </template>

          </template>



          <ul v-else class="m-0 list-none space-y-2.5 p-0 sm:space-y-3">

            <li v-for="ad in ads" :key="ad.id">

              <CompanyAdHubRow

                :ad="ad"


                :date-line="formatRowDateLine(ad)"

                @rename="openRename(ad)"

                @delete="remove(ad.id)"

              />

            </li>

          </ul>

        </div>

      </template>



      <AppConfirmDialog

        v-model:open="deleteDialogOpen"

        variant="confirm"

        :title="S.dialogConfirmTitle"

        :message="S.firmyHubDeleteConfirmLead"

        :detail="S.firmyHubDeleteConfirmDetail"

        :confirm-text="S.firmyHubDeleteAd"

        :cancel-text="S.cancel"

        confirm-danger

        @confirm="confirmRemove"

      />

      <Teleport to="body">

        <div

          v-if="renameDialogOpen"

          class="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-0 font-dmSans antialiased sm:items-center sm:p-5"

          role="dialog"

          aria-modal="true"

          @click.self="renameDialogOpen = false"

        >

          <div

            class="w-full max-w-md rounded-t-2xl border border-black/10 bg-white px-6 py-8 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] sm:rounded-2xl sm:px-8 sm:py-7"

            @click.stop

          >

            <h2 class="m-0 text-center text-xl font-extrabold text-black">

              {{ S.firmyHubRenameDialogTitle }}

            </h2>

            <label class="mt-6 block text-left text-[13px] font-bold text-black/55" for="firmy-hub-rename-input">

              {{ S.firmyAdTitle }}

            </label>

            <input

              id="firmy-hub-rename-input"

              v-model="renameTitle"

              type="text"

              maxlength="120"

              class="addjob-input cv-field mt-2 w-full"

              @keydown.enter.prevent="saveRename"

            />

            <div class="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">

              <button

                type="button"

                class="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full border border-black/15 bg-white px-5 text-[15px] font-semibold text-black/75 hover:bg-neutral-50 sm:flex-initial sm:min-w-[7.5rem]"

                @click="renameDialogOpen = false"

              >

                {{ S.cancel }}

              </button>

              <button

                type="button"

                class="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full bg-marketing-green px-5 text-[15px] font-bold text-white hover:opacity-95 sm:flex-initial sm:min-w-[7.5rem]"

                :disabled="!renameTitle.trim() || renameSaving"

                @click="saveRename"

              >

                {{ S.firmyHubRenameSave }}

              </button>

            </div>

          </div>

        </div>

      </Teleport>

    </div>

  </div>

</template>



<script setup lang="ts">

import { computed, onMounted, ref, watch } from 'vue'

import { ROUTES } from '~/utils/app-routes'

import { S } from '~/utils/strings'

import type { CompanyAdListItem } from '~/utils/company-ad'

import { partitionCompanyAds } from '~/utils/company-ad-hub'

import LoggedOutFeatureHero from '~/components/marketing/LoggedOutFeatureHero.vue'

import CompanyAdHubRow from '~/components/firmy/CompanyAdHubRow.vue'



definePageMeta({ layout: 'app' })



const route = useRoute()

const redirectPath = computed(() => route.fullPath || ROUTES.myAds)

const { isProvider, user, loading: authLoading } = useAuth()

const { api } = useApi()

const { ads, loading, loadError, loadAds } = useProfileMyCompanyAds()



const partitioned = computed(() => partitionCompanyAds(ads.value))

const draftAds = computed(() => partitioned.value.draft)

const publishedAds = computed(() => partitioned.value.published)

const inactiveAds = computed(() => partitioned.value.inactive)



const showAllDraftsAlert = computed(

  () => ads.value.length > 0 && ads.value.every((a) => a.status === 'draft'),

)



const showSectionedList = computed(

  () =>

    draftAds.value.length > 0

    && (publishedAds.value.length > 0 || inactiveAds.value.length > 0),

)



const deleteDialogOpen = ref(false)

const deletePendingId = ref<string | null>(null)

const renameDialogOpen = ref(false)

const renameAdId = ref<string | null>(null)

const renameTitle = ref('')

const renameSaving = ref(false)



function formatSkDate(iso: string): string {

  const d = new Date(iso)

  if (Number.isNaN(d.getTime())) return ''

  return new Intl.DateTimeFormat('sk-SK', {

    day: 'numeric',

    month: 'numeric',

    year: 'numeric',

  }).format(d)

}



function formatRowDateLine(ad: CompanyAdListItem): string {

  const created = formatSkDate(ad.created_at)

  if (created) return `${S.firmyHubCreatedLabel} ${created}`

  const updated = formatSkDate(ad.updated_at)

  if (updated) return `${S.firmyHubUpdatedLabel} ${updated}`

  return ''

}



function openRename(ad: CompanyAdListItem): void {

  renameAdId.value = ad.id

  renameTitle.value = ad.title?.trim() || S.firmyHubDefaultTitle

  renameDialogOpen.value = true

}



async function saveRename(): Promise<void> {

  const id = renameAdId.value

  const title = renameTitle.value.trim()

  if (!id || !title) return

  renameSaving.value = true

  try {

    const res = await api(`/api/company-ads/${id}`, {

      method: 'PATCH',

      body: { title },

    })

    if (!res.ok) {

      loadError.value = res.body?.slice(0, 120) ?? 'Chyba'

      return

    }

    renameDialogOpen.value = false

    renameAdId.value = null

    await loadAds()

  } finally {

    renameSaving.value = false

  }

}



function remove(id: string): void {

  deletePendingId.value = id

  deleteDialogOpen.value = true

}



async function confirmRemove(): Promise<void> {

  const id = deletePendingId.value

  deletePendingId.value = null

  if (!id) return

  const res = await api(`/api/company-ads/${id}`, { method: 'DELETE' })

  if (!res.ok) {

    loadError.value = res.body?.slice(0, 120) ?? 'Chyba'

    return

  }

  await loadAds()

}



onMounted(() => {

  if (user.value) void loadAds()

})



watch(user, (u) => {

  if (u) void loadAds()

})



useHead({

  title: () => S.firmyHubTitle,

})

</script>

