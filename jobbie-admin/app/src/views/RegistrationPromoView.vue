<script setup lang="ts">

import { onMounted, ref } from 'vue'

import Button from 'primevue/button'

import InputText from 'primevue/inputtext'

import Message from 'primevue/message'

import ProgressSpinner from 'primevue/progressspinner'

import ToggleButton from 'primevue/togglebutton'

import { adminApi } from '../composables/adminApi'

import AdminPageHeader from '../components/layout/AdminPageHeader.vue'



type Campaign = {

  id: string

  code: string

  credits_amount: number

  max_redemptions: number

  redemption_count: number

  enabled: boolean

  starts_at: string | null

  ends_at: string | null

}



const loading = ref(true)

const savingId = ref<string | null>(null)

const error = ref<string | null>(null)

const message = ref<string | null>(null)

const campaigns = ref<Campaign[]>([])



const edits = ref<Record<string, {

  enabled: boolean

  credits_amount: number

  max_redemptions: number

}>>({})



async function loadCampaigns() {

  loading.value = true

  error.value = null

  const res = await adminApi<{ items?: Campaign[] }>('/admin/registration-promo/campaigns')

  loading.value = false

  if (!res.ok) {

    error.value = res.body.slice(0, 200) || `HTTP ${res.status}`

    campaigns.value = []

    return

  }

  campaigns.value = res.data?.items ?? []

  const next: typeof edits.value = {}

  for (const c of campaigns.value) {

    next[c.id] = {

      enabled: c.enabled,

      credits_amount: c.credits_amount,

      max_redemptions: c.max_redemptions,

    }

  }

  edits.value = next

}



async function saveCampaign(campaign: Campaign) {

  const edit = edits.value[campaign.id]

  if (!edit) return

  savingId.value = campaign.id

  message.value = null

  error.value = null

  const res = await adminApi<Campaign>(`/admin/registration-promo/campaigns/${campaign.id}`, {

    method: 'PATCH',

    body: {

      enabled: edit.enabled,

      credits_amount: edit.credits_amount,

      max_redemptions: edit.max_redemptions,

    },

  })

  savingId.value = null

  if (!res.ok) {

    error.value = res.body.slice(0, 200) || `HTTP ${res.status}`

    return

  }

  message.value = `Kampaň ${campaign.code} uložená.`

  await loadCampaigns()

}



onMounted(() => {

  void loadCampaigns()

})

</script>



<template>

  <div class="admin-page max-w-2xl">

    <AdminPageHeader

      title="Registračné promo kódy"

      subtitle="Kredity sa uplatnia pri registrácii nového účtu (max. 48 h od vytvorenia profilu)."

    />



    <p class="m-0 text-sm text-slate-500">

      Pred spustením nastavte kampaň na aktívnu.

    </p>



    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <Message v-if="message" severity="success" :closable="false">{{ message }}</Message>



    <div v-if="loading" class="flex justify-center py-12">

      <ProgressSpinner />

    </div>



    <section

      v-for="campaign in campaigns"

      :key="campaign.id"

      class="admin-section-card"

    >

      <h2 class="admin-section-title">{{ campaign.code }}</h2>

      <p class="m-0 mb-4 text-sm text-slate-500">

        Uplatnené: {{ campaign.redemption_count }} / {{ campaign.max_redemptions }}

      </p>

      <div v-if="edits[campaign.id]" class="grid gap-4">

        <div class="flex items-center gap-2">

          <ToggleButton

            v-model="edits[campaign.id].enabled"

            on-label="Aktívna"

            off-label="Neaktívna"

            on-icon="pi pi-check"

            off-icon="pi pi-times"

          />

        </div>

        <div class="flex flex-col gap-1">

          <label class="text-sm font-medium text-slate-700">Kredity</label>

          <InputText
            :model-value="String(edits[campaign.id].credits_amount)"
            type="number"
            class="max-w-xs"
            min="1"
            max="500"
            @update:model-value="edits[campaign.id].credits_amount = Number($event) || 0"
          />

        </div>

        <div class="flex flex-col gap-1">

          <label class="text-sm font-medium text-slate-700">Max. uplatnení</label>

          <InputText
            :model-value="String(edits[campaign.id].max_redemptions)"
            type="number"
            class="max-w-xs"
            :min="campaign.redemption_count"
            @update:model-value="edits[campaign.id].max_redemptions = Number($event) || 0"
          />

        </div>

        <Button

          :label="savingId === campaign.id ? 'Ukladám…' : 'Uložiť'"

          :loading="savingId === campaign.id"

          @click="saveCampaign(campaign)"

        />

      </div>

    </section>

  </div>

</template>

