<template>
  <div class="mt-3 overflow-x-auto rounded-lg border border-black/10">
    <table class="w-full min-w-[32rem] border-collapse text-left text-[12px] leading-snug text-black/80">
      <thead>
        <tr class="border-b border-black/10 bg-neutral-50">
          <th scope="col" class="px-3 py-2.5 font-semibold text-black">
            {{ S.cookieTableColName }}
          </th>
          <th scope="col" class="px-3 py-2.5 font-semibold text-black">
            {{ S.cookieTableColDomain }}
          </th>
          <th scope="col" class="px-3 py-2.5 font-semibold text-black">
            {{ S.cookieTableColExpiry }}
          </th>
          <th scope="col" class="px-3 py-2.5 font-semibold text-black">
            {{ S.cookieTableColPath }}
          </th>
          <th scope="col" class="px-3 py-2.5 font-semibold text-black">
            {{ S.cookieTableColDescription }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.name"
          class="border-b border-black/5 last:border-b-0"
        >
          <td class="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-black">
            {{ row.name }}
          </td>
          <td class="px-3 py-2.5">{{ row.domain }}</td>
          <td class="whitespace-nowrap px-3 py-2.5">{{ row.expiry }}</td>
          <td class="whitespace-nowrap px-3 py-2.5 font-mono text-[11px]">{{ row.path }}</td>
          <td class="min-w-[10rem] px-3 py-2.5 text-black/70">{{ row.description }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { CookieInventoryRow } from '~/utils/cookie-inventory'
import { S } from '~/utils/strings'

defineProps<{
  rows: CookieInventoryRow[]
}>()
</script>
