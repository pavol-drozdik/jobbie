<template>
  <div :id="ACCOUNT_ROLES_SECTION_ID">
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
    <div class="flex flex-col gap-1">
      <label
        for="settings-role-customer"
        class="flex is-clickable items-start gap-2.5 font-dmSans font-medium text-black/80"
        :class="compact ? 'py-2 text-[17px]' : 'py-1.5 text-sm'"
      >
        <AppCheckbox
          id="settings-role-customer"
          :model-value="customerRoleLocal"
          class="mt-0.5"
          @update:model-value="onCustomerRoleChange"
        />
        <span>{{ S.roleCustomerCard }}</span>
      </label>
      <label
        for="settings-role-worker"
        class="flex is-clickable items-start gap-2.5 font-dmSans font-medium text-black/80"
        :class="compact ? 'py-2 text-[17px]' : 'py-1.5 text-sm'"
      >
        <AppCheckbox
          id="settings-role-worker"
          :model-value="workerRoleLocal"
          class="mt-0.5"
          @update:model-value="onWorkerRoleChange"
        />
        <span>{{ S.roleWorkerCard }}</span>
      </label>
      <label
        for="settings-role-provider"
        class="flex is-clickable items-start gap-2.5 font-dmSans font-medium text-black/80"
        :class="compact ? 'py-2 text-[17px]' : 'py-1.5 text-sm'"
      >
        <AppCheckbox
          id="settings-role-provider"
          :model-value="providerRoleLocal"
          class="mt-0.5"
          @update:model-value="onProviderRoleChange"
        />
        <span>{{ S.roleProviderCard }}</span>
      </label>
    </div>
    <p v-if="rolesError" class="mt-2 text-xs text-red-600">{{ rolesError }}</p>
  </div>
</template>

<script setup lang="ts">
import { ACCOUNT_ROLES_SECTION_ID } from '~/utils/dashboard-role-denied'
import { useDebouncedFn } from '~/utils/debounce'
import { S } from '~/utils/strings'

withDefaults(
  defineProps<{
    compact?: boolean
  }>(),
  { compact: false },
)

const { profile, load, patch } = useSettingsProfile()

const customerRoleLocal = ref(false)
const workerRoleLocal = ref(false)
const providerRoleLocal = ref(false)
const rolesError = ref<string | null>(null)
const savingRoles = ref(false)
const saveQueued = ref(false)
const suppressApplyRoles = ref(false)

function applyRoles(): void {
  if (suppressApplyRoles.value) {
    return
  }
  const d = profile.value
  if (!d) {
    return
  }
  customerRoleLocal.value = Boolean(d.customer_role)
  workerRoleLocal.value = Boolean(d.worker_role)
  providerRoleLocal.value = Boolean(d.provider_role)
}

function currentRolesPayload(): {
  customer_role: boolean
  worker_role: boolean
  provider_role: boolean
} {
  return {
    customer_role: customerRoleLocal.value,
    worker_role: workerRoleLocal.value,
    provider_role: providerRoleLocal.value,
  }
}

async function flushRolesSave(): Promise<void> {
  if (savingRoles.value) {
    saveQueued.value = true
    return
  }
  const payload = currentRolesPayload()
  if (!payload.customer_role && !payload.worker_role && !payload.provider_role) {
    rolesError.value = S.rolesValidationAtLeastOne
    return
  }
  rolesError.value = null
  savingRoles.value = true
  suppressApplyRoles.value = true
  try {
    const result = await patch(payload)
    if (!result.ok) {
      rolesError.value = result.message ?? S.saveFailed
      suppressApplyRoles.value = false
      applyRoles()
      return
    }
  } finally {
    savingRoles.value = false
    suppressApplyRoles.value = false
    if (saveQueued.value) {
      saveQueued.value = false
      await flushRolesSave()
    }
  }
}

const scheduleRolesSave = useDebouncedFn(() => {
  void flushRolesSave()
}, 350)

function onRoleChange(): void {
  scheduleRolesSave()
}

function onCustomerRoleChange(checked: boolean): void {
  customerRoleLocal.value = checked
  onRoleChange()
}

function onWorkerRoleChange(checked: boolean): void {
  workerRoleLocal.value = checked
  onRoleChange()
}

function onProviderRoleChange(checked: boolean): void {
  providerRoleLocal.value = checked
  onRoleChange()
}

watch(profile, applyRoles, { immediate: true })

onMounted(() => {
  void load()
})

onBeforeUnmount(() => {
  scheduleRolesSave.cancel()
})
</script>
