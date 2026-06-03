<template>
  <div>
    <h2
      :class="
        compact
          ? 'mb-1.5 font-dmSans text-[20px] font-extrabold leading-none text-black'
          : 'form-label mb-2'
      "
    >
      {{ S.settingsRolesSection }}
    </h2>
    <p
      class="font-dmSans leading-normal text-black/45"
      :class="compact ? 'mb-5 text-base' : 'mb-2 text-xs'"
      :style="compact ? undefined : { color: 'var(--ink3)' }"
    >
      {{ compact ? S.settingsRolesDescription : S.rolesQuestion }}
    </p>
    <div class="flex flex-col">
      <label
        class="flex cursor-pointer items-center gap-3.5 rounded-full py-3.5 pl-[18px] pr-[18px] font-dmSans font-medium text-black transition-colors hover:bg-marketing-mint"
        :class="compact ? 'text-[17px]' : 'text-[13px]'"
        style="color: var(--ink2)"
      >
        <span
          class="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-[1.5px] border-[#d1d5db] bg-white transition-colors"
          :class="customerRoleLocal ? 'border-marketing-green bg-marketing-green' : ''"
        >
          <AppIcon
            v-if="customerRoleLocal"
            name="check-circle"
            :size="12"
            class="text-white [&>svg]:text-white"
          />
        </span>
        <input v-model="customerRoleLocal" type="checkbox" class="sr-only" @change="saveRoles">
        {{ S.roleCustomerCard }}
      </label>
      <label
        class="flex cursor-pointer items-center gap-3.5 rounded-full py-3.5 pl-[18px] pr-[18px] font-dmSans font-medium text-black transition-colors hover:bg-marketing-mint"
        :class="compact ? 'text-[17px]' : 'text-[13px]'"
        style="color: var(--ink2)"
      >
        <span
          class="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-[1.5px] border-[#d1d5db] bg-white transition-colors"
          :class="workerRoleLocal ? 'border-marketing-green bg-marketing-green' : ''"
        >
          <AppIcon
            v-if="workerRoleLocal"
            name="check-circle"
            :size="12"
            class="text-white [&>svg]:text-white"
          />
        </span>
        <input v-model="workerRoleLocal" type="checkbox" class="sr-only" @change="saveRoles">
        {{ S.roleWorkerCard }}
      </label>
      <label
        class="flex cursor-pointer items-center gap-3.5 rounded-full py-3.5 pl-[18px] pr-[18px] font-dmSans font-medium text-black transition-colors hover:bg-marketing-mint"
        :class="compact ? 'text-[17px]' : 'text-[13px]'"
        style="color: var(--ink2)"
      >
        <span
          class="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-[1.5px] border-[#d1d5db] bg-white transition-colors"
          :class="providerRoleLocal ? 'border-marketing-green bg-marketing-green' : ''"
        >
          <AppIcon
            v-if="providerRoleLocal"
            name="check-circle"
            :size="12"
            class="text-white [&>svg]:text-white"
          />
        </span>
        <input v-model="providerRoleLocal" type="checkbox" class="sr-only" @change="saveRoles">
        {{ S.roleProviderCard }}
      </label>
    </div>
    <p v-if="rolesError" class="mt-2 text-xs text-red-600">{{ rolesError }}</p>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

withDefaults(
  defineProps<{
    compact?: boolean
  }>(),
  { compact: false },
)

const { profile, load } = useSettingsProfile()
const { updateRoles } = useAuth()

const customerRoleLocal = ref(false)
const workerRoleLocal = ref(false)
const providerRoleLocal = ref(false)
const rolesError = ref<string | null>(null)
const savingRoles = ref(false)

function applyRoles(): void {
  const d = profile.value
  if (!d) {
    return
  }
  customerRoleLocal.value = Boolean(d.customer_role)
  workerRoleLocal.value = Boolean(d.worker_role)
  providerRoleLocal.value = Boolean(d.provider_role)
}

async function saveRoles(): Promise<void> {
  if (savingRoles.value) {
    return
  }
  if (!customerRoleLocal.value && !workerRoleLocal.value && !providerRoleLocal.value) {
    rolesError.value = S.rolesValidationAtLeastOne
    return
  }
  rolesError.value = null
  savingRoles.value = true
  try {
    const ok = await updateRoles({
      customer_role: customerRoleLocal.value,
      worker_role: workerRoleLocal.value,
      provider_role: providerRoleLocal.value,
    })
    if (!ok) {
      rolesError.value = S.saveFailed
    }
  } finally {
    savingRoles.value = false
  }
}

watch(profile, applyRoles, { immediate: true })

onMounted(() => {
  void load()
})
</script>
