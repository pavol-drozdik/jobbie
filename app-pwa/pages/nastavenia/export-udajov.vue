<template>

  <SettingsPageShell

    :title="S.settingsExportDataTitle"

    :description="S.settingsExportDataDescription"

    :flash="flash"

    :error="error"

  >

    <SettingsDataExportPanel @exported="onExported" @failed="onFailed" />

  </SettingsPageShell>

</template>



<script setup lang="ts">

import { S } from '~/utils/strings'



definePageMeta({ layout: 'app', middleware: ['auth'] })



const { flash, error } = useSettingsFeedback()



function onExported(): void {

  error.value = null

  flash.value = S.settingsExportDataDone

}



function onFailed(message: string): void {

  flash.value = null

  error.value = message

}



useHead({ title: () => S.settingsExportDataTitle })

</script>

