<template>
  <div class="cv-form box-border w-full bg-marketing-mint px-5 pt-[24px] font-dmSans text-black">
    <AppConfirmDialog
      v-model:open="noticeDialogOpen"
      variant="alert"
      :title="S.dialogNoticeTitle"
      :message="noticeDialogMessage"
    />
    <div
      ref="shellRef"
      class="mx-auto grid w-full max-w-[1400px] grid-cols-1 items-start gap-[22px] min-[821px]:grid-cols-[280px_minmax(0,1fr)] min-[1201px]:grid-cols-[280px_minmax(0,1fr)]"
    >
      <aside
        id="cv-sidebar"
        ref="sidebarRef"
        class="relative z-50 rounded-[20px] bg-white p-[18px] shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] max-[820px]:static"
      >
        <div class="flex flex-col gap-2">
          <button
            v-for="s in stepNav"
            :key="s.step"
            type="button"
            class="grid w-full is-clickable grid-cols-[42px_minmax(0,1fr)] items-center gap-3 rounded-2xl border-0 bg-transparent p-2.5 text-left text-black/[0.58] transition-colors hover:bg-marketing-panel hover:text-marketing-green"
            :class="parentStep + 1 === s.step ? 'bg-marketing-panel text-marketing-green' : ''"
            @click="emitGoStep(s.step - 1)"
          >
            <span
              class="flex h-[42px] w-[42px] items-center justify-center rounded-full text-lg font-black"
              :class="
                parentStep + 1 === s.step
                  ? 'bg-marketing-green text-white'
                  : 'bg-marketing-mint text-marketing-green'
              "
            >{{ s.step }}</span>
            <span class="min-w-0">
              <strong class="block text-[17px] font-extrabold leading-tight">{{ s.title }}</strong>
              <span class="mt-0.5 block text-[13px] font-medium text-black/[0.42]">{{ s.sub }}</span>
            </span>
          </button>
        </div>
        <div
          v-show="parentStep === 1"
          class="mt-[18px] flex flex-col gap-2 border-t border-black/[0.06] pt-4"
        >
          <div class="px-2.5 pb-1 text-[13px] font-black uppercase tracking-wide text-black/[0.34]">
            Časti CV
          </div>
          <button
            v-for="sec in sectionMenu"
            :key="sec.id"
            type="button"
            class="flex items-center gap-2 rounded-full border-0 bg-transparent px-3 py-2.5 text-left text-[15px] font-bold text-black/[0.55] transition-colors hover:bg-marketing-mint hover:text-marketing-green"
            :class="activeSection === sec.id ? 'bg-marketing-mint text-marketing-green' : ''"
            @click="scrollToSection(sec.id)"
          >
            <AppIcon :name="sec.icon" :size="20" class="w-5 shrink-0" /> {{ sec.label }}
          </button>
        </div>
      </aside>
      <section class="overflow-hidden rounded-[20px] bg-white shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)]">
        <div class="h-2 bg-black/[0.06]">
          <span
            class="block h-full bg-marketing-green transition-[width] duration-300"
            :style="{ width: `${(parentStep + 1) * 33.333}%` }"
          />
        </div>
        <!-- Step 1 -->
        <div v-show="parentStep === 0" class="block p-[34px] max-[820px]:px-[18px] max-[820px]:py-6">
          <div class="mb-[26px] flex flex-wrap items-start justify-between gap-[18px]">
            <div>
              <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-marketing-panel px-3.5 py-2 text-[15px] font-extrabold text-marketing-green">
                <i class="fa-solid fa-palette" /> Krok 1 z 3
              </div>
              <h1 class="m-0 text-[44px] font-black leading-none text-black max-[820px]:text-[34px]">
                Vyberte vzhľad životopisu
              </h1>
              <p class="mt-3 max-w-[720px] text-lg leading-snug text-black/[0.55]">
                Začnite šablónou, ktorá najlepšie sedí vašej profesii. Obsah môžete dopĺňať v ďalšom kroku a vzhľad zmeniť kedykoľvek.
              </p>
            </div>
          </div>
          <div
            id="cv-display-title"
            class="scroll-mt-28 mb-7 rounded-[20px] border border-black/[0.06] bg-white p-[26px] shadow-[0px_1px_4px_rgba(0,0,0,0.04)] max-[820px]:mb-6"
          >
            <div class="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 id="cv-display-title-heading" class="m-0 text-[28px] font-black text-black">
                  Názov životopisu
                </h3>
                <p class="m-0 mt-2 max-w-[760px] text-[17px] text-black/[0.55]">
                  Vlastný názov v zozname životopisov — zvoľte si ho tak, aby ste sa v ňom rýchlo orientovali.
                </p>
              </div>
            </div>
            <input
              id="cv-display-title-input"
              :value="header.display_title ?? ''"
              type="text"
              class="addjob-input cv-field w-full"
              placeholder="Napr. Životopis 2026"
              autocomplete="off"
              aria-labelledby="cv-display-title-heading"
              @input="patch({ display_title: ($event.target as HTMLInputElement).value })"
            >
          </div>
          <div class="grid grid-cols-1 gap-[18px] min-[821px]:grid-cols-2">
            <article
              v-for="tpl in templateCards"
              :key="tpl.key"
              class="is-clickable rounded-[20px] border-2 border-transparent bg-marketing-soft p-4 transition-all hover:-translate-y-0.5"
              :class="uiTemplate === tpl.key ? 'border-marketing-green shadow-[0_0_0_5px_rgba(34,197,94,0.14)]' : ''"
              @click="selectUiTemplate(tpl.key)"
            >
              <div
                v-if="tpl.badge"
                class="mb-2.5 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black"
                :style="tpl.badgeStyle"
              >
                {{ tpl.badge }}
              </div>
              <div class="min-h-[290px] rounded-[14px] bg-white p-3.5 shadow-[0px_2px_5px_rgba(0,0,0,0.08)]">
                <div class="min-h-[262px] overflow-hidden rounded-xl bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" v-html="tpl.mini" />
              </div>
              <h3 class="mb-1 mt-3.5 text-xl font-black text-black">
                {{ tpl.name }}
              </h3>
              <p class="m-0 text-[15px] font-medium leading-snug text-black/[0.52]">
                {{ tpl.copy }}
              </p>
            </article>
          </div>
          <div class="mt-7 flex flex-wrap justify-between gap-3.5 border-t border-black/[0.06] pt-5">
            <button
              type="button"
              disabled
              class="inline-flex h-12 is-disabled-cursor items-center justify-center gap-2 rounded-full border-0 bg-marketing-soft px-5 text-[17px] font-extrabold text-black/[0.62] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
            >
              <i class="fa-solid fa-arrow-left" /> Späť
            </button>
            <button
              type="button"
              class="inline-flex h-12 is-clickable items-center justify-center gap-2 rounded-full border-0 bg-marketing-green px-5 text-[17px] font-extrabold text-white"
              @click="emitGoStep(1)"
            >
              Pokračovať <i class="fa-solid fa-arrow-right" />
            </button>
          </div>
        </div>
        <!-- Step 2 -->
        <div v-show="parentStep === 1" class="block p-[34px] max-[820px]:px-[18px] max-[820px]:py-6">
          <div class="mb-[26px] flex flex-wrap items-start justify-between gap-[18px]">
            <div>
              <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-marketing-panel px-3.5 py-2 text-[15px] font-extrabold text-marketing-green">
                <i class="fa-solid fa-pen-to-square" /> Krok 2 z 3
              </div>
              <h1 class="m-0 text-[44px] font-black leading-none text-black max-[820px]:text-[34px]">
                Zadávanie údajov
              </h1>
              <p class="mt-3 max-w-[720px] text-lg leading-snug text-black/[0.55]">
                Vyplňte osobné údaje, skúsenosti, vzdelanie, znalosti a doplnkové časti. Menu vľavo vás prenesie na konkrétnu časť formulára.
              </p>
            </div>
          </div>
          <div class="grid gap-5">
            <div id="personal" class="scroll-mt-28 rounded-[20px] border border-black/[0.06] bg-white p-[26px] shadow-[0px_1px_4px_rgba(0,0,0,0.04)]">
              <div class="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 class="m-0 text-[28px] font-black leading-tight text-black">
                    Osobné údaje
                  </h3>
                  <p class="mt-2 max-w-[760px] text-[17px] leading-snug text-black/[0.55]">
                    <strong>Základné údaje.</strong> Začnite zadaním vašich osobných a kontaktných údajov.
                  </p>
                </div>
              </div>
              <div class="mb-7 grid grid-cols-1 gap-x-4 gap-y-4 min-[821px]:grid-cols-2">
                <label class="relative min-h-[260px] is-clickable rounded-3xl border-2 border-dashed border-marketing-green/40 bg-marketing-soft">
                  <input type="file" accept="image/jpeg,image/png,image/webp" class="absolute inset-0 z-[1] is-clickable opacity-0" @change="onPhotoFile">
                  <img
                    v-if="photoPreviewUrl"
                    :src="photoPreviewUrl"
                    alt=""
                    class="absolute inset-0 z-0 size-full rounded-3xl object-cover"
                  >
                  <div
                    class="relative z-[2] flex h-full min-h-[260px] flex-col items-center justify-center gap-3 p-4 text-center"
                    :class="photoPreviewUrl ? 'bg-black/40 text-white' : ''"
                  >
                    <i class="fa-solid fa-cloud-arrow-up text-[42px] text-marketing-green" :class="photoPreviewUrl ? 'text-white' : ''" />
                    <strong class="text-[22px] font-black" :class="photoPreviewUrl ? 'text-white' : 'text-black'">Fotografia</strong>
                    <span class="text-base font-medium text-black/[0.55]" :class="photoPreviewUrl ? 'text-white/90' : ''">Kliknite alebo sem pretiahnite obrázok</span>
                  </div>
                </label>
                <div class="flex flex-col justify-center gap-[18px] py-2">
                  <div>
                    <h3 class="m-0 text-[28px] font-black text-black">
                      Fotografia
                    </h3>
                    <p class="m-0 mt-2 max-w-[520px] text-[17px] leading-normal text-black/[0.55]">
                      Nahrajte vašu fotografiu. Nie je povinná, no životopis s fotkou pôsobí osobnejšie a personalistu zaujme viac.
                    </p>
                  </div>
                  <div class="flex flex-wrap gap-3">
                    <button
                      type="button"
                      class="inline-flex h-12 is-clickable items-center gap-2 rounded-full border-2 border-marketing-green bg-white px-4 text-[17px] font-extrabold text-marketing-green"
                      @click="copyProfilePhoto"
                    >
                      <i class="fa-solid fa-copy" /> Skopírovať z profilového obrázku
                    </button>
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-1 gap-x-4 gap-y-4 min-[821px]:grid-cols-2">
                <div class="flex flex-col gap-2">
                  <label class="font-dmSans text-lg font-semibold text-black">Titul pred menom</label>
                  <input
                    class="addjob-input cv-field"
                    :value="header.title_before_name ?? ''"
                    type="text"
                    placeholder="Napr. Mgr., Ing., Bc."
                    @input="patch({ title_before_name: inputStrOrNull($event) })"
                  >
                </div>
                <div class="flex flex-col gap-2">
                  <label class="font-dmSans text-lg font-semibold text-black">Titul za menom</label>
                  <input
                    class="addjob-input cv-field"
                    :value="header.title_after_name ?? ''"
                    type="text"
                    placeholder="Napr. PhD., MBA"
                    @input="patch({ title_after_name: inputStrOrNull($event) })"
                  >
                </div>
                <div class="flex flex-col gap-2">
                  <label class="font-dmSans text-lg font-semibold text-black">Pohlavie</label>
                  <AppFormDropdown
                    bordered
                    :model-value="header.gender ?? 'Neuvádzať'"
                    :options="genderDropdownOptions"
                    placeholder="Neuvádzať"
                    @update:model-value="onGenderPick($event)"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="font-dmSans text-lg font-semibold text-black">Dátum narodenia <small class="font-medium text-black/[0.42]">(voliteľné)</small></label>
                  <input
                    class="addjob-input cv-field"
                    :value="header.birth_date ?? ''"
                    type="date"
                    @input="patch({ birth_date: ($event.target as HTMLInputElement).value || null })"
                  >
                </div>
                <div class="flex flex-col gap-2">
                  <label class="font-dmSans text-lg font-semibold text-black">Meno</label>
                  <input
                    class="addjob-input cv-field"
                    :value="header.first_name ?? ''"
                    type="text"
                    autocomplete="given-name"
                    @input="patch({ first_name: inputStrOrNull($event) })"
                    @blur="void flushHeaderNow()"
                  >
                </div>
                <div class="flex flex-col gap-2">
                  <label class="font-dmSans text-lg font-semibold text-black">Priezvisko</label>
                  <input
                    class="addjob-input cv-field"
                    :value="header.last_name ?? ''"
                    type="text"
                    autocomplete="family-name"
                    @input="patch({ last_name: inputStrOrNull($event) })"
                    @blur="void flushHeaderNow()"
                  >
                </div>
              </div>
              <div class="mt-7 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 class="m-0 text-[28px] font-black text-black">
                    Kontaktné údaje
                  </h3>
                  <p class="m-0 mt-2 max-w-[760px] text-[17px] text-black/[0.55]">
                    Uveďte údaje, cez ktoré vás môže personalista alebo firma kontaktovať.
                  </p>
                </div>
              </div>
              <div class="mt-5 grid grid-cols-1 gap-x-4 gap-y-4 min-[821px]:grid-cols-2">
                <div class="flex flex-col gap-2">
                  <label class="font-dmSans text-lg font-semibold text-black">E-mailová adresa</label>
                  <input
                    class="addjob-input cv-field"
                    :value="header.email ?? ''"
                    type="text"
                    inputmode="email"
                    autocomplete="email"
                    @input="patch({ email: inputStrOrNull($event) })"
                    @blur="void flushHeaderNow()"
                  >
                </div>
                <div class="flex flex-col gap-2">
                  <label class="font-dmSans text-lg font-semibold text-black">Telefónne číslo</label>
                  <input
                    class="addjob-input cv-field"
                    :value="header.phone ?? ''"
                    type="tel"
                    placeholder="+421 912 345 678"
                    autocomplete="tel"
                    @input="patch({ phone: ($event.target as HTMLInputElement).value || null })"
                  >
                </div>
                <div class="col-span-full flex flex-col gap-2">
                  <label class="font-dmSans text-lg font-semibold text-black">Adresa</label>
                  <small class="text-[13px] font-medium text-black/[0.42]">Uveďte vašu aktuálnu adresu.</small>
                </div>
                <div class="flex flex-col gap-2">
                  <label class="font-dmSans text-lg font-semibold text-black">{{ S.cvAddressCity }}</label>
                  <AppSkMunicipalityCombobox
                    :model-value="header.address_city ?? ''"
                    placeholder="napríklad Bratislava"
                    @update:model-value="patch({ address_city: $event.trim() || null })"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="font-dmSans text-lg font-semibold text-black">Ulica a číslo</label>
                  <input
                    class="addjob-input cv-field"
                    :value="header.address_street ?? ''"
                    type="text"
                    placeholder="Ulica 12"
                    @input="patch({ address_street: inputStrOrNull($event) })"
                  >
                </div>
                <div class="flex flex-col gap-2">
                  <label class="font-dmSans text-lg font-semibold text-black">PSČ</label>
                  <input
                    class="addjob-input cv-field"
                    :value="header.address_postal_code ?? ''"
                    type="text"
                    placeholder="010 01"
                    @input="patch({ address_postal_code: inputStrOrNull($event) })"
                  >
                </div>
              </div>
            </div>
            <div id="experience" class="scroll-mt-28 rounded-[20px] border border-black/[0.06] bg-white p-[26px] shadow-[0px_1px_4px_rgba(0,0,0,0.04)]">
              <div class="mb-5 flex flex-col gap-4">
                <h3 class="m-0 text-[28px] font-black text-black">
                  Pracovné skúsenosti
                </h3>
                <p class="m-0 max-w-[760px] text-[17px] text-black/[0.55]">
                  Aké máte pracovné skúsenosti? Personalistovi stačí v priemere 7 sekúnd na prvé preskenovanie životopisu, preto vyberte relevantné skúsenosti.
                </p>
                <button
                  type="button"
                  class="inline-flex h-12 w-fit items-center gap-2 rounded-full border-0 bg-marketing-green px-5 text-[17px] font-extrabold text-white"
                  @click="addExperience"
                >
                  <i class="fa-solid fa-plus" /> Pridať zamestnanie
                </button>
              </div>
              <div v-for="(row, expIdx) in sortedExperience" :key="row.id" class="cv-soft-panel mt-3.5 rounded-[20px] bg-marketing-soft p-5">
                <div class="mb-4 flex items-center justify-between gap-3">
                  <strong class="text-[19px] font-black">{{ expLabel(row.id) }}</strong>
                  <div class="flex items-center gap-1.5">
                    <template v-if="sortedExperience.length > 1">
                      <button
                        type="button"
                        class="flex size-[38px] is-clickable items-center justify-center rounded-full border-0 bg-white text-black/55 disabled:cursor-not-allowed disabled:opacity-35"
                        :disabled="reorderBusy || expIdx === 0"
                        :aria-label="S.cvMoveUp"
                        @click="moveExperience(row.id, 'up')"
                      >
                        <i class="fa-solid fa-chevron-up text-[15px]" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        class="flex size-[38px] is-clickable items-center justify-center rounded-full border-0 bg-white text-black/55 disabled:cursor-not-allowed disabled:opacity-35"
                        :disabled="reorderBusy || expIdx === sortedExperience.length - 1"
                        :aria-label="S.cvMoveDown"
                        @click="moveExperience(row.id, 'down')"
                      >
                        <i class="fa-solid fa-chevron-down text-[15px]" aria-hidden="true" />
                      </button>
                    </template>
                    <button
                      type="button"
                      class="flex size-[38px] is-clickable items-center justify-center rounded-full border-0 bg-white text-red-500"
                      :aria-label="S.cvDelete"
                      @click="removeExperience(row.id)"
                    >
                      <AppIcon name="trash-2" :size="18" />
                    </button>
                  </div>
                </div>
                <div class="grid grid-cols-1 gap-4 min-[821px]:grid-cols-2">
                  <div class="flex flex-col gap-2">
                    <label class="font-dmSans text-lg font-semibold text-black">Názov pracovnej pozície</label>
                    <input v-model="expDraft[row.id]!.position" class="addjob-input cv-field" placeholder="Napr. Predavač" @input="scheduleExperienceSave(row.id)">
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="font-dmSans text-lg font-semibold text-black">Zamestnávateľ</label>
                    <AppSkCompanyCombobox
                      v-model="expDraft[row.id]!.company"
                      placeholder="Názov firmy"
                      @update:model-value="scheduleExperienceSave(row.id)"
                    />
                  </div>
                  <div class="col-span-full flex flex-col gap-2">
                    <label class="font-dmSans text-lg font-semibold text-black">{{ S.cvAddressCity }}</label>
                    <AppSkMunicipalityCombobox
                      v-model="expDraft[row.id]!.city"
                      placeholder="napríklad Bratislava"
                      @update:model-value="scheduleExperienceSave(row.id)"
                    />
                  </div>
                  <label class="col-span-full flex is-clickable items-center gap-2.5 text-base font-bold text-black/[0.68]">
                    <AppCheckbox v-model="expDraft[row.id]!.current" @update:model-value="onExpCurrent(row.id)" />
                    Aktuálne tu pracujem
                  </label>
                  <div class="col-span-full flex flex-col gap-2">
                    <label class="font-dmSans text-lg font-semibold text-black">Časové obdobie</label>
                    <div class="grid grid-cols-1 gap-4 min-[821px]:grid-cols-2">
                      <div class="flex flex-col gap-2">
                        <span class="text-[13px] font-bold uppercase tracking-wide text-black/40">
                          {{ S.cvExpPeriodFrom }}
                        </span>
                        <div class="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2">
                          <AppCvYearCombobox
                            :model-value="expDraft[row.id]!.fromYear"
                            placeholder="Rok"
                            @update:model-value="onExpFromYear(row.id, $event)"
                          />
                          <AppFormDropdown
                            bordered
                            :model-value="expDraft[row.id]!.fromMonth"
                            :options="monthDropdownOptions"
                            placeholder="Mesiac"
                            empty-value="Mesiac"
                            @update:model-value="onExpMonth(row.id, 'fromMonth', $event)"
                          />
                        </div>
                      </div>
                      <div
                        class="flex flex-col gap-2 rounded-[16px] transition-[background-color,box-shadow] duration-200"
                        :class="
                          expDraft[row.id]!.current
                            ? 'bg-black/[0.05] px-3 py-3 ring-1 ring-inset ring-black/[0.08]'
                            : ''
                        "
                        :aria-disabled="expDraft[row.id]!.current ? 'true' : undefined"
                      >
                        <span
                          class="text-[13px] font-bold uppercase tracking-wide"
                          :class="expDraft[row.id]!.current ? 'text-black/28' : 'text-black/40'"
                        >
                          {{ S.cvExpPeriodTo }}
                        </span>
                        <div
                          class="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2"
                          :class="expDraft[row.id]!.current ? 'pointer-events-none select-none' : ''"
                        >
                          <AppCvYearCombobox
                            :model-value="expDraft[row.id]!.toYear"
                            :placeholder="expDraft[row.id]!.current ? '—' : 'Rok'"
                            :disabled="expDraft[row.id]!.current"
                            @update:model-value="onExpToYear(row.id, $event)"
                          />
                          <AppFormDropdown
                            bordered
                            :model-value="expDraft[row.id]!.toMonth"
                            :options="monthDropdownOptions"
                            :placeholder="expDraft[row.id]!.current ? '—' : 'Mesiac'"
                            empty-value="Mesiac"
                            :disabled="expDraft[row.id]!.current"
                            @update:model-value="onExpMonth(row.id, 'toMonth', $event)"
                          />
                        </div>
                        <p
                          v-if="expDraft[row.id]!.current"
                          class="m-0 text-[13px] font-medium leading-snug text-black/45"
                        >
                          {{ S.cvExpEndPeriodUnavailable }}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div class="col-span-full flex flex-col gap-2">
                    <label class="font-dmSans text-lg font-semibold text-black">Popis práce (nepovinné)</label>
                    <AppRichTextEditorLazy
                      :model-value="expDraft[row.id]!.description"
                      :min-height-px="180"
                      placeholder="Krátko a výstižne popíšte vašu náplň práce"
                      @update:model-value="onExpDescriptionHtml(row.id, $event)"
                    />
                    <div class="flex justify-end text-sm font-bold text-black/[0.42]">
                      {{ richTextPlainLength(expDraft[row.id]!.description) }}/{{ CV_RICH_LIMIT_SECTION }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div id="education" class="scroll-mt-28 rounded-[20px] border border-black/[0.06] bg-white p-[26px] shadow-[0px_1px_4px_rgba(0,0,0,0.04)]">
              <div class="mb-5 flex flex-col gap-4">
                <h3 class="m-0 text-[28px] font-black text-black">
                  Vzdelanie
                </h3>
                <p class="m-0 max-w-[760px] text-[17px] text-black/[0.55]">
                  Aké máte vzdelanie? Dajte zamestnávateľom vedieť, aké školy, kurzy alebo certifikáty máte za sebou.
                </p>
                <button
                  type="button"
                  class="inline-flex h-12 w-fit items-center gap-2 rounded-full border-0 bg-marketing-green px-5 text-[17px] font-extrabold text-white"
                  @click="addEducation"
                >
                  <i class="fa-solid fa-plus" /> Pridať vzdelanie
                </button>
              </div>
              <div v-for="(row, eduIdx) in sortedEducation" :key="row.id" class="cv-soft-panel mt-3.5 rounded-[20px] bg-marketing-soft p-5">
                <div class="mb-4 flex items-center justify-between gap-3">
                  <strong class="text-[19px] font-black">{{ eduLabel(row.id) }}</strong>
                  <div class="flex items-center gap-1.5">
                    <template v-if="sortedEducation.length > 1">
                      <button
                        type="button"
                        class="flex size-[38px] is-clickable items-center justify-center rounded-full border-0 bg-white text-black/55 disabled:cursor-not-allowed disabled:opacity-35"
                        :disabled="reorderBusy || eduIdx === 0"
                        :aria-label="S.cvMoveUp"
                        @click="moveEducation(row.id, 'up')"
                      >
                        <i class="fa-solid fa-chevron-up text-[15px]" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        class="flex size-[38px] is-clickable items-center justify-center rounded-full border-0 bg-white text-black/55 disabled:cursor-not-allowed disabled:opacity-35"
                        :disabled="reorderBusy || eduIdx === sortedEducation.length - 1"
                        :aria-label="S.cvMoveDown"
                        @click="moveEducation(row.id, 'down')"
                      >
                        <i class="fa-solid fa-chevron-down text-[15px]" aria-hidden="true" />
                      </button>
                    </template>
                    <button
                      type="button"
                      class="flex size-[38px] is-clickable items-center justify-center rounded-full border-0 bg-white text-red-500"
                      :aria-label="S.cvDelete"
                      @click="removeEducation(row.id)"
                    >
                      <AppIcon name="trash-2" :size="18" />
                    </button>
                  </div>
                </div>
                <div class="mb-4 flex flex-col gap-2">
                  <label class="font-dmSans text-lg font-semibold text-black">Aké vzdelanie chcete pridať?</label>
                  <div class="mt-2.5 flex flex-wrap gap-2.5">
                    <button
                      v-for="ek in eduKindChoices"
                      :key="ek.api"
                      type="button"
                      class="cv-choice-chip"
                      :class="eduDraft[row.id]!.education_kind === ek.api ? 'cv-choice-chip--selected' : ''"
                      @click="setEduKind(row.id, ek.api)"
                    >
                      {{ ek.label }}
                    </button>
                  </div>
                </div>
                <div class="grid grid-cols-1 gap-4 min-[821px]:grid-cols-2">
                  <template v-if="eduDraft[row.id]!.education_kind === 'secondary'">
                    <div class="col-span-full flex flex-col gap-2">
                      <label class="font-dmSans text-lg font-semibold text-black">Stredná škola</label>
                      <AppSkSchoolCombobox
                        v-model="eduDraft[row.id]!.school"
                        level="secondary"
                        placeholder="Názov školy"
                        @update:model-value="scheduleEducationSave(row.id)"
                      />
                    </div>
                    <label class="col-span-full flex is-clickable items-center gap-2.5 text-base font-bold text-black/[0.68]">
                      <AppCheckbox v-model="eduDraft[row.id]!.has_graduation" @update:model-value="saveEducation(row.id)" />
                      Ukončená s maturitnou skúškou
                    </label>
                  </template>
                  <template v-else-if="eduDraft[row.id]!.education_kind === 'course_certificate'">
                    <div class="flex flex-col gap-2">
                      <label class="font-dmSans text-lg font-semibold text-black">Názov kurzu/školenia alebo certifikátu</label>
                      <input v-model="eduDraft[row.id]!.school" class="addjob-input cv-field" placeholder="Názov kurzu" @input="scheduleEducationSave(row.id)">
                    </div>
                    <div class="flex flex-col gap-2">
                      <label class="font-dmSans text-lg font-semibold text-black">Názov inštitúcie</label>
                      <input v-model="eduDraft[row.id]!.institution" class="addjob-input cv-field" placeholder="Inštitúcia" @input="scheduleEducationSave(row.id)">
                    </div>
                  </template>
                  <template v-else>
                    <div class="flex flex-col gap-2">
                      <label class="font-dmSans text-lg font-semibold text-black">Vysoká škola</label>
                      <AppSkSchoolCombobox
                        v-model="eduDraft[row.id]!.school"
                        level="university"
                        placeholder="Názov školy"
                        @update:model-value="scheduleEducationSave(row.id)"
                      />
                    </div>
                    <div class="flex flex-col gap-2">
                      <label class="font-dmSans text-lg font-semibold text-black">Odbor</label>
                      <input v-model="eduDraft[row.id]!.field" class="addjob-input cv-field" placeholder="Odbor" @input="scheduleEducationSave(row.id)">
                    </div>
                  </template>
                  <div class="col-span-full flex flex-col gap-2">
                    <label class="font-dmSans text-lg font-semibold text-black">Časové obdobie</label>
                    <div class="grid grid-cols-1 gap-2.5 min-[821px]:grid-cols-2">
                      <AppCvYearCombobox
                        :model-value="eduDraft[row.id]!.fromYear"
                        placeholder="Od: Rok"
                        @update:model-value="onEduFromYear(row.id, $event)"
                      />
                      <AppCvYearCombobox
                        :model-value="eduDraft[row.id]!.toYear"
                        include-ongoing
                        placeholder="Do: Rok"
                        @update:model-value="onEduToYear(row.id, $event)"
                      />
                    </div>
                  </div>
                  <div class="col-span-full flex flex-col gap-2">
                    <label class="font-dmSans text-lg font-semibold text-black">Popis štúdia (nepovinné)</label>
                    <AppRichTextEditorLazy
                      :model-value="eduDraft[row.id]!.description"
                      :min-height-px="180"
                      placeholder="Krátko a výstižne popíšte vaše štúdium"
                      @update:model-value="onEduDescriptionHtml(row.id, $event)"
                    />
                    <div class="flex justify-end text-sm font-bold text-black/[0.42]">
                      {{ richTextPlainLength(eduDraft[row.id]!.description) }}/{{ CV_RICH_LIMIT_SECTION }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div id="skills" class="scroll-mt-28 rounded-[20px] border border-black/[0.06] bg-white p-[26px] shadow-[0px_1px_4px_rgba(0,0,0,0.04)]">
              <div class="mb-5 flex flex-col gap-4">
                <h3 class="m-0 text-[28px] font-black text-black">
                  Znalosti
                </h3>
                <p class="m-0 max-w-[760px] text-[17px] text-black/[0.55]">
                  Aké sú vaše zručnosti a znalosti? Zadajte, čo ovládate, a na akej úrovni.
                </p>
                <button
                  type="button"
                  class="inline-flex h-12 w-fit items-center gap-2 rounded-full border-0 bg-marketing-green px-5 text-[17px] font-extrabold text-white"
                  @click="addSkill"
                >
                  <i class="fa-solid fa-plus" /> Pridať znalosti
                </button>
              </div>
              <div v-for="row in sortedSkills" :key="row.id" class="cv-soft-panel mt-3.5 rounded-[20px] bg-marketing-soft p-5">
                <div class="mb-4 flex items-center justify-between gap-3">
                  <strong class="text-[19px] font-black">{{ skillLabel(row.id) }}</strong>
                  <button
                    type="button"
                    class="flex size-[38px] is-clickable items-center justify-center rounded-full border-0 bg-white text-red-500"
                    :aria-label="S.cvDelete"
                    @click="removeSkill(row.id)"
                  >
                    <AppIcon name="trash-2" :size="18" />
                  </button>
                </div>
                <div class="grid grid-cols-1 gap-4 min-[821px]:grid-cols-2">
                  <div class="flex flex-col gap-2">
                    <label class="font-dmSans text-lg font-semibold text-black">Názov znalosti</label>
                    <AppSkCvSkillCombobox
                      :model-value="skillDraft[row.id]!.skill_name"
                      @update:model-value="onSkillName(row.id, $event)"
                    />
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="font-dmSans text-lg font-semibold text-black">Úroveň</label>
                    <AppFormDropdown
                      bordered
                      :model-value="skillDraft[row.id]!.level"
                      :options="skillLevelDropdownOptions"
                      placeholder="Vyberte úroveň"
                      @update:model-value="onSkillLevel(row.id, $event)"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div id="languages" class="scroll-mt-28 rounded-[20px] border border-black/[0.06] bg-white p-[26px] shadow-[0px_1px_4px_rgba(0,0,0,0.04)]">
              <div class="mb-5 flex flex-col gap-4">
                <h3 class="m-0 text-[28px] font-black text-black">
                  Jazyky
                </h3>
                <p class="m-0 max-w-[760px] text-[17px] text-black/[0.55]">
                  Aké jazyky ovládate? Zadajte jazyk a úroveň, ktorú chcete uviesť v životopise.
                </p>
                <button
                  type="button"
                  class="inline-flex h-12 w-fit items-center gap-2 rounded-full border-0 bg-marketing-green px-5 text-[17px] font-extrabold text-white"
                  @click="addLanguage"
                >
                  <i class="fa-solid fa-plus" /> Pridať jazyk
                </button>
              </div>
              <div v-for="row in sortedLanguages" :key="row.id" class="cv-soft-panel mt-3.5 rounded-[20px] bg-marketing-soft p-5">
                <div class="mb-4 flex items-center justify-between gap-3">
                  <strong class="text-[19px] font-black">{{ langLabel(row.id) }}</strong>
                  <button
                    type="button"
                    class="flex size-[38px] is-clickable items-center justify-center rounded-full border-0 bg-white text-red-500"
                    :aria-label="S.cvDelete"
                    @click="removeLanguage(row.id)"
                  >
                    <AppIcon name="trash-2" :size="18" />
                  </button>
                </div>
                <div class="grid grid-cols-1 gap-4 min-[821px]:grid-cols-2">
                  <div class="flex flex-col gap-2">
                    <label class="font-dmSans text-lg font-semibold text-black">Jazyk</label>
                    <input v-model="langDraft[row.id]!.language" class="addjob-input cv-field" placeholder="Napr. Angličtina" @input="onLangNameInput(row.id)">
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="font-dmSans text-lg font-semibold text-black">Úroveň</label>
                    <AppFormDropdown
                      bordered
                      :model-value="langDraft[row.id]!.level"
                      :options="languageLevelDropdownOptions"
                      placeholder="Vyberte úroveň"
                      @update:model-value="onLangLevel(row.id, $event)"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div id="extras" class="scroll-mt-28 rounded-[20px] border border-black/[0.06] bg-white p-[26px] shadow-[0px_1px_4px_rgba(0,0,0,0.04)]">
              <div class="mb-5">
                <h3 class="m-0 text-[28px] font-black text-black">
                  Doplňujúce časti
                </h3>
                <p class="m-0 mt-2 max-w-[760px] text-[17px] text-black/[0.55]">
                  Každá časť je voliteľná. Pridajte do životopisu ďalšie sekcie, ktoré sú pre vás dôležité.
                </p>
              </div>
              <div class="flex flex-col gap-2">
                <label class="font-dmSans text-lg font-semibold text-black">Vodičský preukaz</label>
                <small class="text-[13px] font-medium text-black/[0.42]">Aké vlastníte vodičské oprávnenia?</small>
                <div class="mt-2.5 grid grid-cols-4 gap-2.5 sm:grid-cols-8 min-[821px]:grid-cols-8">
                  <button
                    v-for="lic in licenseButtons"
                    :key="lic"
                    type="button"
                    class="h-[54px] rounded-full border-0 text-lg font-black"
                    :class="
                      isLicenseActive(lic)
                        ? 'bg-marketing-green text-white'
                        : 'bg-marketing-soft text-black/[0.58] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]'
                    "
                    @click="toggleLicense(lic)"
                  >
                    {{ lic }}
                  </button>
                </div>
              </div>
              <div class="mt-5 flex flex-col gap-2">
                <label class="font-dmSans text-lg font-semibold text-black">Záujmy alebo koníčky</label>
                <small class="text-[13px] font-medium text-black/[0.42]">Ako si radi vypĺňate voľný čas?</small>
                <AppRichTextEditorLazy
                  class="mt-2"
                  :model-value="header.hobbies ?? ''"
                  :min-height-px="160"
                  placeholder="Vo voľnom čase rada bicyklujem, čítam literatúru faktu a rozširujem si vedomosti v oblasti somelierstva."
                  @update:model-value="onHobbiesRichHtml"
                />
                <div class="flex justify-end text-sm font-bold text-black/[0.42]">
                  {{ hobbiesCount }}/{{ CV_RICH_LIMIT_HOBBIES }}
                </div>
              </div>
              <div class="mt-5 flex flex-col gap-2">
                <label class="font-dmSans text-lg font-semibold text-black">Osobné zhrnutie</label>
                <small class="text-[13px] font-medium text-black/[0.42]">Napíšte o sebe krátke zhrnutie v 2 - 3 vetách.</small>
                <AppRichTextEditorLazy
                  class="mt-2"
                  :model-value="header.about_me ?? ''"
                  :min-height-px="180"
                  placeholder="Už viac ako 20 rokov pôsobím ako vodič v kamiónovej doprave, doposiaľ bez dopravnej nehody alebo priestupku."
                  @update:model-value="onAboutRichHtml"
                />
                <div class="flex justify-end text-sm font-bold text-black/[0.42]">
                  {{ aboutCount }}/{{ CV_RICH_LIMIT_ABOUT }}
                </div>
              </div>
              <div class="mt-5 flex flex-col gap-2">
                <label class="font-dmSans text-lg font-semibold text-black">Doplňujúce informácie</label>
                <small class="text-[13px] font-medium text-black/[0.42]">Chcete ešte niečo doplniť? Napíšte to sem.</small>
                <AppRichTextEditorLazy
                  class="mt-2"
                  :model-value="header.additional_skills_info ?? ''"
                  :min-height-px="180"
                  @update:model-value="onExtraRichHtml"
                />
                <div class="flex justify-end text-sm font-bold text-black/[0.42]">
                  {{ extraCount }}/{{ CV_RICH_LIMIT_EXTRA }}
                </div>
              </div>
            </div>
          </div>
          <div class="mt-7 flex flex-wrap justify-between gap-3.5 border-t border-black/[0.06] pt-5">
            <button type="button" class="inline-flex h-12 items-center gap-2 rounded-full border-0 bg-marketing-soft px-5 text-[17px] font-extrabold text-black/[0.62] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" @click="emitGoStep(0)">
              <i class="fa-solid fa-arrow-left" /> Späť
            </button>
            <button type="button" class="inline-flex h-12 items-center gap-2 rounded-full border-0 bg-marketing-green px-5 text-[17px] font-extrabold text-white" @click="emitGoStep(2)">
              Pokračovať <i class="fa-solid fa-arrow-right" />
            </button>
          </div>
        </div>
        <!-- Step 3 -->
        <div v-show="parentStep === 2" class="block p-[34px] max-[820px]:px-[18px] max-[820px]:py-6">
          <div class="mb-[26px] flex flex-wrap items-start justify-between gap-[18px]">
            <div>
              <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-marketing-panel px-3.5 py-2 text-[15px] font-extrabold text-marketing-green">
                <i class="fa-solid fa-circle-check" /> Krok 3 z 3
              </div>
              <h1 class="m-0 text-[44px] font-black leading-none text-black max-[820px]:text-[34px]">
                Záverečné nastavenia
              </h1>
              <p class="mt-3 max-w-[720px] text-lg leading-snug text-black/[0.55]">
                Obsah životopisu máte hotový. Doplňte ešte údaje, ktoré ho zvýhodnia pri hľadaní práce na Jobbie.
              </p>
            </div>
          </div>
          <div class="grid grid-cols-1 gap-[18px]">
            <div class="rounded-[20px] border border-black/[0.06] bg-white p-[26px] shadow-[0px_1px_4px_rgba(0,0,0,0.04)]">
              <div class="mb-5">
                <h3 class="m-0 text-[28px] font-black text-black">
                  {{ S.cvEmploymentSectionTitle }}
                </h3>
                <p class="m-0 mt-2 text-[17px] text-black/[0.55]">
                  {{ S.cvEmploymentSectionHint }}
                </p>
              </div>
              <div class="mt-2.5 flex flex-wrap gap-2.5">
                <button
                  v-for="em in employmentOptions"
                  :key="em.value"
                  type="button"
                  class="h-[54px] rounded-full border-0 px-5 text-lg font-black"
                  :class="
                    employmentSet.has(em.value)
                      ? 'bg-marketing-green text-white'
                      : 'bg-marketing-soft text-black/[0.58] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]'
                  "
                  @click="toggleEmployment(em.value)"
                >
                  {{ em.label }}
                </button>
              </div>
            </div>
            <div class="rounded-[20px] border border-black/[0.06] bg-white p-[26px] shadow-[0px_1px_4px_rgba(0,0,0,0.04)]">
              <div class="mb-5">
                <h3 class="m-0 text-[28px] font-black text-black">
                  Termín možného nástupu
                </h3>
                <p class="m-0 mt-2 text-[17px] text-black/[0.55]">
                  Kedy môžete nastúpiť do novej práce?
                </p>
              </div>
              <div class="mt-2.5 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  class="h-[54px] min-w-[7.5rem] rounded-full border-0 px-5 text-lg font-black"
                  :class="
                    startTermMode === 'immediate'
                      ? 'bg-marketing-green text-white'
                      : 'bg-marketing-soft text-black/[0.58] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]'
                  "
                  @click="setStartTermMode('immediate')"
                >
                  Ihneď
                </button>
                <button
                  type="button"
                  class="h-[54px] min-w-[7.5rem] rounded-full border-0 px-5 text-lg font-black"
                  :class="
                    startTermMode === 'agreement'
                      ? 'bg-marketing-green text-white'
                      : 'bg-marketing-soft text-black/[0.58] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]'
                  "
                  @click="setStartTermMode('agreement')"
                >
                  Dohodou
                </button>
                <button
                  type="button"
                  class="h-[54px] min-w-[7.5rem] rounded-full border-0 px-5 text-lg font-black"
                  :class="
                    startTermMode === 'date'
                      ? 'bg-marketing-green text-white'
                      : 'bg-marketing-soft text-black/[0.58] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]'
                  "
                  @click="setStartTermMode('date')"
                >
                  Dátum
                </button>
              </div>
              <div v-show="startTermMode === 'date'" class="mt-4 flex flex-col gap-2">
                <label class="font-dmSans text-lg font-semibold text-black">Dátum nástupu</label>
                <input
                  :value="startDateIso"
                  type="date"
                  class="addjob-input cv-field max-w-[280px]"
                  @input="onStartDateInput"
                >
              </div>
              <div class="mt-4 flex flex-col gap-2">
                <label class="font-dmSans text-lg font-semibold text-black">Očakávaný minimálny plat (v hrubom)</label>
                <div class="mt-1 grid grid-cols-1 gap-4 min-[821px]:grid-cols-2">
                  <input
                    class="addjob-input cv-field"
                    :value="header.salary_min != null ? String(header.salary_min) : ''"
                    type="number"
                    placeholder="EUR od"
                    @input="onSalaryAmount($event)"
                  >
                  <AppFormDropdown
                    bordered
                    :model-value="salaryUnitLabel"
                    :options="salaryUnitDropdownOptions"
                    placeholder="Jednotka mzdy"
                    @update:model-value="onSalaryUnitValue($event)"
                  />
                </div>
              </div>
            </div>
            <div class="rounded-[20px] border border-black/[0.06] bg-white p-[26px] shadow-[0px_1px_4px_rgba(0,0,0,0.04)]">
              <div class="mb-5">
                <h3 class="m-0 text-[28px] font-black text-black">
                  Pracovné preferencie
                </h3>
                <p class="m-0 mt-2 text-[17px] text-black/[0.55]">
                  Označte, čo vám pri práci vyhovuje.
                </p>
              </div>
              <div class="grid grid-cols-1 gap-3">
                <label class="flex is-clickable items-start gap-2.5 text-base font-bold leading-snug text-black/[0.68]">
                  <AppCheckbox
                    class="mt-0.5"
                    :model-value="header.weekend_work === true"
                    @update:model-value="patch({ weekend_work: $event })"
                  />
                  Práca aj na zmeny alebo cez víkendy
                </label>
                <label class="flex is-clickable items-start gap-2.5 text-base font-bold leading-snug text-black/[0.68]">
                  <AppCheckbox
                    class="mt-0.5"
                    :model-value="header.night_work === true"
                    @update:model-value="patch({ night_work: $event })"
                  />
                  Práca aj v noci
                </label>
                <label class="flex is-clickable items-start gap-2.5 text-base font-bold leading-snug text-black/[0.68]">
                  <AppCheckbox
                    class="mt-0.5"
                    :model-value="header.open_to_relocate_commute === true"
                    @update:model-value="patch({ open_to_relocate_commute: $event })"
                  />
                  Som ochotný/á sa kvôli práci presťahovať alebo dochádzať z väčšej vzdialenosti
                </label>
                <label class="flex is-clickable items-start gap-2.5 text-base font-bold leading-snug text-black/[0.68]">
                  <AppCheckbox
                    class="mt-0.5"
                    :model-value="header.remote_work_only === true"
                    @update:model-value="patch({ remote_work_only: $event })"
                  />
                  Práca iba z domu
                </label>
              </div>
            </div>
            <CvVisibilityToggle
              prominent
              :model-value="header.visible_to_employers"
              @update:model-value="patch({ visible_to_employers: $event })"
            />
          </div>
          <div class="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-5">
            <button type="button" class="inline-flex h-12 items-center gap-2 rounded-full border-0 bg-marketing-soft px-5 text-[17px] font-extrabold text-black/[0.62] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" @click="emitGoStep(1)">
              <i class="fa-solid fa-arrow-left" /> Späť
            </button>
            <div class="flex flex-wrap gap-3">
              <button
                type="button"
                class="inline-flex h-12 items-center gap-2 rounded-full border-2 border-marketing-green bg-white px-5 text-[17px] font-extrabold text-marketing-green disabled:is-disabled-cursor disabled:opacity-50"
                :disabled="previewBusy"
                @click="openPreview"
              >
                <i class="fa-solid" :class="previewBusy ? 'fa-spinner fa-spin' : 'fa-eye'" />
                {{ previewBusy ? 'Pripravujem náhľad…' : 'Náhľad' }}
              </button>
              <button
                type="button"
                class="inline-flex h-12 items-center gap-2 rounded-full border-2 border-dashed border-black/25 bg-white px-5 text-[17px] font-extrabold text-black/55 disabled:is-disabled-cursor disabled:opacity-50"
                :disabled="htmlPreviewBusy"
                title="Dočasný náhľad HTML pre úpravy šablón (nie PDF)"
                @click="openHtmlPreview"
              >
                <i class="fa-solid" :class="htmlPreviewBusy ? 'fa-spinner fa-spin' : 'fa-code'" />
                {{ htmlPreviewBusy ? 'Pripravujem…' : S.cvPreviewHtmlOpen }}
              </button>
              <button
                type="button"
                class="inline-flex h-12 items-center gap-2 rounded-full border-2 border-marketing-green bg-white px-5 text-[17px] font-extrabold text-marketing-green disabled:is-disabled-cursor disabled:opacity-50"
                :disabled="pdfExportBusy"
                @click="downloadPdf"
              >
                <i class="fa-solid" :class="pdfExportBusy ? 'fa-spinner fa-spin' : 'fa-download'" />
                {{ pdfExportBusy ? S.cvExportPdfWorking : S.cvExportPdf }}
              </button>
              <button
                type="button"
                class="inline-flex h-12 items-center gap-2 rounded-full border-0 bg-marketing-green px-5 text-[17px] font-extrabold text-white"
                @click="onFinishWizard"
              >
                <i class="fa-solid fa-check" /> Dokončiť
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
// CV editor: parentStep 1–3 wizard; section rows use *Draft maps until @change saves to API.
// visible_to_employers controls employer DB visibility (GDPR — server enforces show_contact_details separately).
import '~/assets/css/cv-template-mini-sheets.css'
import { computed, onMounted, reactive, watch } from 'vue'
import type {
  CvAggregateResponseDto,
  CvHeaderResponseDto,
  EducationResponseDto,
  ExperienceResponseDto,
  LanguageResponseDto,
  SkillResponseDto,
} from '~/types/cv'
import {
  CV_DRIVING_LICENSE_CATEGORIES,
  type CvDrivingLicenseCategory,
  sortCvDrivingLicenseCategories,
  toggleCvDriverLicenseCategory,
} from '~/utils/cv-driving-license-categories'
import { JOB_POST_EMPLOYMENT_OPTIONS } from '~/utils/job-post-options'
import {
  CV_START_TERM_AGREEMENT,
  CV_START_TERM_DATE_PENDING,
  CV_START_TERM_IMMEDIATE,
  formatCvStartAvailabilityLabel,
  parseCvStartAvailability,
  type CvStartTermMode,
} from '~/utils/cv-start-availability'
import { CV_PROTOTYPE_MONTH_OPTIONS, monthYearFromYearAndSkLabel } from '~/utils/cv-prototype-months'
import {
  buildCvEndYearDropdownOptions,
  buildCvStartYearDropdownOptions,
  CV_EDU_END_ONGOING,
} from '~/utils/cv-year-options'
import { apiTemplateKeyFromUi, uiTemplateFromApiKey, type CvPrototypeUiTemplate } from '~/utils/cv-prototype-template-map'
import { isoDateToMonthYear, monthYearToIsoFirstDay } from '~/utils/cv-month-year'
import type { CvMonthYear } from '~/utils/cv-month-year'
import { buildExportDataFromState } from '~/composables/useCvPrototypeShellState'
import {
  downloadCvPdfFromData,
  openCvHtmlPreviewFromData,
  openCvPreviewFromData,
  useCvPrototypeStickySidebar,
} from '~/composables/useCvPrototypePreview'
import { S } from '~/utils/strings'
import {
  prepareCvProfilePhotoForUpload,
  validateImageUpload,
} from '~/utils/image-compression'
import { checkCvRichTextPlainLimit } from '~/composables/useCvRichTextField'
import { useCvSectionSaveQueue } from '~/composables/useCvSectionSaveQueue'
import { richTextPlainLength } from '~/utils/rich-text-plain-length'
import {
  cvSectionReorderIds,
  swapCvSectionRow,
  type CvSectionReorderDirection,
} from '~/utils/cv-section-order'

const CV_RICH_LIMIT_HOBBIES = 250
const CV_RICH_LIMIT_ABOUT = 500
const CV_RICH_LIMIT_EXTRA = 1000
const CV_RICH_LIMIT_SECTION = 4000

const props = defineProps<{
  cvId: string
  parentStep: number
  header: CvHeaderResponseDto
  aggregate: CvAggregateResponseDto
  updateHeader: (partial: Partial<CvHeaderResponseDto>) => void
  updateAggregate: (updater: (agg: CvAggregateResponseDto) => CvAggregateResponseDto) => void
  queueSave: () => void
  flushHeaderSave: () => Promise<boolean>
  finishWizard: () => Promise<void>
  registerSectionSaveFlusher: (fn: () => Promise<void>) => void
}>()

const emit = defineEmits<{
  reload: []
  goStep: [step: number]
  setSection: [section: string]
}>()

const noticeDialogOpen = ref(false)
const noticeDialogMessage = ref('')

function showNotice(message: string): void {
  noticeDialogMessage.value = message
  noticeDialogOpen.value = true
}

const sectionSaveTail = ref(Promise.resolve())

async function runSectionSave(task: () => Promise<void>): Promise<void> {
  const next = sectionSaveTail.value.then(task).catch((err: unknown) => {
    showNotice(err instanceof Error ? err.message : 'Uloženie zlyhalo.')
    throw err
  })
  sectionSaveTail.value = next.then(
    () => undefined,
    () => undefined,
  )
  await next
}

const shellRef = ref<HTMLElement | null>(null)
const sidebarRef = ref<HTMLElement | null>(null)
useCvPrototypeStickySidebar(sidebarRef, shellRef)

const stepNav = [
  { step: 1, title: 'Výber vzhľadu', sub: 'Šablóna životopisu' },
  { step: 2, title: 'Zadávanie údajov', sub: 'Obsah a skúsenosti' },
  { step: 3, title: 'Dokončenie', sub: 'Záverečné nastavenia' },
] as const

const sectionMenu = [
  { id: 'personal', label: 'Osobné údaje', icon: 'user' as const },
  { id: 'experience', label: 'Pracovné skúsenosti', icon: 'briefcase' as const },
  { id: 'education', label: 'Vzdelanie', icon: 'graduation-cap' as const },
  { id: 'skills', label: 'Znalosti', icon: 'wrench' as const },
  { id: 'languages', label: 'Jazyky', icon: 'languages' as const },
  { id: 'extras', label: 'Doplňujúce časti', icon: 'plus' as const },
] as const

const activeSection = ref<string>('personal')

const { postSection, patchSection, deleteSectionRow, reorderSection } = useCv()
const { uploadCvPhoto } = useStorageUpload()
const { ensureSkill: ensureCatalogSkill } = useSkCvSkillSearch()
const cvIdRef = toRef(props, 'cvId')
const headerForPhoto = computed(() => ({
  photo_url: props.header.photo_url,
  photo_storage_path: props.header.photo_storage_path,
  photo_view_url: props.header.photo_view_url ?? null,
}))
const {
  photoDisplayUrl: photoPreviewUrl,
  refreshPhotoDisplayUrl,
  setLocalPhotoPreview,
} = useCvPhotoDisplayUrl(cvIdRef, headerForPhoto)

const uiTemplate = ref<CvPrototypeUiTemplate>('atlas')
watch(
  () => props.header.template_key,
  (k) => {
    uiTemplate.value = uiTemplateFromApiKey(k)
  },
  { immediate: true },
)

function selectUiTemplate(key: CvPrototypeUiTemplate): void {
  uiTemplate.value = key
  patch({ template_key: apiTemplateKeyFromUi(key) })
}

const templateCards: {
  key: CvPrototypeUiTemplate
  name: string
  copy: string
  badge?: string
  badgeStyle?: Record<string, string>
  mini: string
}[] = [
  {
    key: 'atlas',
    badge: 'Najuniverzálnejší',
    badgeStyle: { color: '#17324a' },
    name: 'Atlas',
    copy: 'Bočný panel, výrazné kontakty a čisté členenie pre univerzálne použitie.',
    mini: '<div class="mini-sheet atlas" aria-hidden="true"></div>',
  },
  {
    key: 'editorial',
    badge: 'Redakčný',
    badgeStyle: { color: '#6f4b22' },
    name: 'Redakčný',
    copy: 'Serifová hlavička a dvojstĺpcové telo pre komunikáciu a stratégie.',
    mini: '<div class="mini-sheet editorial" aria-hidden="true"></div>',
  },
  {
    key: 'minimalist',
    badge: 'Čistý layout',
    badgeStyle: { color: '#13212f' },
    name: 'Minimalistický',
    copy: 'Nízky vizuálny šum, silné zarovnanie a rýchla čitateľnosť.',
    mini: '<div class="mini-sheet minimalist" aria-hidden="true"></div>',
  },
  {
    key: 'monochrome',
    badge: 'Vysoký kontrast',
    badgeStyle: { color: '#111111' },
    name: 'Monochrómny',
    copy: 'Čierna hlavička a hustý, ale prehľadný dvojstĺpec.',
    mini: '<div class="mini-sheet monochrome" aria-hidden="true"></div>',
  },
]

const monthOptions = [...CV_PROTOTYPE_MONTH_OPTIONS]

const monthDropdownOptions: { value: string; label: string }[] = monthOptions.map((m) => ({
  value: m,
  label: m,
}))

const genderDropdownOptions: { value: string; label: string }[] = [
  { value: 'Neuvádzať', label: 'Neuvádzať' },
  { value: 'Muž', label: 'Muž' },
  { value: 'Žena', label: 'Žena' },
  { value: 'Iné', label: 'Iné' },
]

const salaryUnitDropdownOptions: { value: string; label: string }[] = [
  { value: 'za mesiac', label: 'za mesiac' },
  { value: 'za hodinu', label: 'za hodinu' },
]

type ExpDraft = {
  position: string
  company: string
  city: string
  current: boolean
  fromYear: string
  fromMonth: string
  toYear: string
  toMonth: string
  description: string
}
const expDraft = reactive<Record<string, ExpDraft>>({})
const reorderBusy = ref(false)

const sortedExperience = computed(() => {
  const list = [...props.aggregate.experience].sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0))
  return list
})

function experienceRowToDraft(row: ExperienceResponseDto): ExpDraft {
  const start = isoDateToMonthYear(row.start_date)
  const end = isoDateToMonthYear(row.end_date)
  const sm = start.month != null && start.year != null ? `${monthOptions[start.month]}` : 'Mesiac'
  const em = end.month != null && end.year != null ? `${monthOptions[end.month]}` : 'Mesiac'
  return {
    position: row.position,
    company: row.company,
    city: row.city ?? '',
    current: row.current,
    fromYear: formatYearDraftValue(start.year),
    fromMonth: sm,
    toYear: formatYearDraftValue(end.year),
    toMonth: em,
    description: row.description ?? '',
  }
}

function expLabel(id: string): string {
  const i = sortedExperience.value.findIndex((r) => r.id === id)
  return `Zamestnanie ${sortedExperience.value.length - i}`
}

async function persistExperienceRow(id: string): Promise<void> {
  const d = expDraft[id]
  if (!d) return
  const fromMy: CvMonthYear = monthYearFromYearAndSkLabel(d.fromYear, d.fromMonth, 1)
  const endMy: CvMonthYear =
    d.current ?
      { month: null, year: null }
    : monthYearFromYearAndSkLabel(d.toYear, d.toMonth, 12)
  await patchSection<ExperienceResponseDto>(props.cvId, 'experience', id, {
    position: d.position,
    company: d.company,
    city: d.city || null,
    country: null,
    start_date: monthYearToIsoFirstDay(fromMy),
    end_date: d.current ? null : monthYearToIsoFirstDay(endMy),
    current: d.current,
    description: d.description || null,
    bullets: [],
  })
}

const experienceSaveQueue = useCvSectionSaveQueue((id) =>
  runSectionSave(() => persistExperienceRow(id)),
)

function scheduleExperienceSave(id: string): void {
  experienceSaveQueue.markDirty(id)
}

async function addExperience(): Promise<void> {
  await flushAllSectionSaves()
  const newRow = await postSection<ExperienceResponseDto>(props.cvId, 'experience', {
    position: '',
    company: '',
    city: '',
    current: false,
    start_date: null,
    end_date: null,
    description: null,
  })
  props.updateAggregate((agg) => ({ ...agg, experience: [...agg.experience, newRow] }))
}

async function saveExperience(id: string): Promise<void> {
  scheduleExperienceSave(id)
  await experienceSaveQueue.flush()
}

function onGenderPick(value: string): void {
  patch({ gender: value === 'Neuvádzať' ? null : value })
}

function onExpMonth(id: string, field: 'fromMonth' | 'toMonth', value: string): void {
  const d = expDraft[id]
  if (!d) return
  d[field] = value
  scheduleExperienceSave(id)
}

function onExpFromYear(id: string, value: string): void {
  const d = expDraft[id]
  if (!d) return
  d.fromYear = value
  scheduleExperienceSave(id)
}

function onExpToYear(id: string, value: string): void {
  const d = expDraft[id]
  if (!d) return
  d.toYear = value
  scheduleExperienceSave(id)
}

async function onExpCurrent(id: string): Promise<void> {
  if (expDraft[id]?.current) {
    expDraft[id]!.toYear = ''
    expDraft[id]!.toMonth = 'Mesiac'
  }
  await saveExperience(id)
}

async function removeExperience(id: string): Promise<void> {
  await flushAllSectionSaves()
  await deleteSectionRow(props.cvId, 'experience', id)
  props.updateAggregate((agg) => ({
    ...agg,
    experience: agg.experience.filter((r) => r.id !== id),
  }))
}

async function moveExperience(id: string, direction: CvSectionReorderDirection): Promise<void> {
  const current = sortedExperience.value
  const next = swapCvSectionRow(current, id, direction)
  if (next.map((r) => r.id).join() === current.map((r) => r.id).join()) return
  reorderBusy.value = true
  try {
    await flushAllSectionSaves()
    const ids = cvSectionReorderIds(next)
    await reorderSection(props.cvId, 'experience', ids)
    const orderMap = new Map(ids.map((rowId, idx) => [rowId, idx]))
    props.updateAggregate((agg) => ({
      ...agg,
      experience: agg.experience.map((r) => ({
        ...r,
        sort_order: orderMap.has(r.id) ? orderMap.get(r.id)! : r.sort_order,
      })),
    }))
  } catch (err) {
    showNotice(err instanceof Error ? err.message : 'Nepodarilo sa zoradiť položky.')
  } finally {
    reorderBusy.value = false
  }
}

type EduDraft = {
  education_kind: 'university' | 'secondary' | 'course_certificate'
  school: string
  field: string
  institution: string
  has_graduation: boolean
  fromYear: string
  toYear: string
  description: string
  currently_studying: boolean
}
const eduDraft = reactive<Record<string, EduDraft>>({})

const eduKindChoices = [
  { api: 'university' as const, label: 'Vysoká škola' },
  { api: 'secondary' as const, label: 'Stredná škola' },
  { api: 'course_certificate' as const, label: 'Kurz alebo certifikát' },
]

const sortedEducation = computed(() =>
  [...props.aggregate.education].sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0)),
)

function educationRowToDraft(row: EducationResponseDto): EduDraft {
  const start = isoDateToMonthYear(row.start_date)
  const end = isoDateToMonthYear(row.end_date)
  return {
    education_kind: (row.education_kind as EduDraft['education_kind']) || 'university',
    school: row.school,
    field: row.field ?? '',
    institution: row.institution ?? '',
    has_graduation: row.has_graduation,
    fromYear: formatYearDraftValue(start.year ?? row.start_year),
    toYear: row.currently_studying
      ? CV_EDU_END_ONGOING
      : formatYearDraftValue(end.year ?? row.end_year),
    description: row.description ?? '',
    currently_studying: row.currently_studying,
  }
}

function eduLabel(id: string): string {
  const i = sortedEducation.value.findIndex((r) => r.id === id)
  return `Vzdelanie ${sortedEducation.value.length - i}`
}

function setEduKind(id: string, kind: EduDraft['education_kind']): void {
  if (eduDraft[id]) {
    eduDraft[id]!.education_kind = kind
    void saveEducation(id)
  }
}

function formatYearDraftValue(year: number | null | undefined): string {
  if (year == null || !Number.isFinite(year) || year <= 0) return ''
  return String(year)
}

function onEduFromYear(id: string, value: string): void {
  const d = eduDraft[id]
  if (!d) return
  d.fromYear = value
  scheduleEducationSave(id)
}

function onEduToYear(id: string, value: string): void {
  const d = eduDraft[id]
  if (!d) return
  d.toYear = value
  d.currently_studying = value === CV_EDU_END_ONGOING
  scheduleEducationSave(id)
}

async function persistEducationRow(id: string): Promise<void> {
  const d = eduDraft[id]
  if (!d) return
  const fromY = d.fromYear ? Number.parseInt(d.fromYear, 10) : null
  const toRaw = d.toYear.trim()
  const currently = toRaw === CV_EDU_END_ONGOING || d.currently_studying
  const toY =
    currently && toRaw === CV_EDU_END_ONGOING ? null : d.toYear ? Number.parseInt(d.toYear, 10) : null
  const startIso = fromY != null ? monthYearToIsoFirstDay({ year: fromY, month: 1 }) : null
  const endIso =
    currently ? null : toY != null ? monthYearToIsoFirstDay({ year: toY, month: 12 }) : null
  const row = props.aggregate.education.find((r) => r.id === id)
  await patchSection<EducationResponseDto>(props.cvId, 'education', id, {
    education_kind: d.education_kind,
    school: d.school,
    field: d.field || null,
    institution: d.institution || null,
    city: null,
    country: null,
    start_date: startIso,
    end_date: endIso,
    start_year: fromY,
    end_year: toY,
    currently_studying: currently,
    has_graduation: d.education_kind === 'secondary' ? d.has_graduation : Boolean(row?.has_graduation),
    description: d.description || null,
    bullets: [],
  })
}

const educationSaveQueue = useCvSectionSaveQueue((id) =>
  runSectionSave(() => persistEducationRow(id)),
)

function scheduleEducationSave(id: string): void {
  educationSaveQueue.markDirty(id)
}

async function addEducation(): Promise<void> {
  await flushAllSectionSaves()
  const newRow = await postSection<EducationResponseDto>(props.cvId, 'education', {
    education_kind: 'university',
    school: '',
    field: '',
    institution: '',
    start_year: null,
    end_year: null,
    start_date: null,
    end_date: null,
    currently_studying: false,
    description: null,
  })
  props.updateAggregate((agg) => ({ ...agg, education: [...agg.education, newRow] }))
}

async function saveEducation(id: string): Promise<void> {
  scheduleEducationSave(id)
  await educationSaveQueue.flush()
}

async function removeEducation(id: string): Promise<void> {
  await flushAllSectionSaves()
  await deleteSectionRow(props.cvId, 'education', id)
  props.updateAggregate((agg) => ({
    ...agg,
    education: agg.education.filter((r) => r.id !== id),
  }))
}

async function moveEducation(id: string, direction: CvSectionReorderDirection): Promise<void> {
  const current = sortedEducation.value
  const next = swapCvSectionRow(current, id, direction)
  if (next.map((r) => r.id).join() === current.map((r) => r.id).join()) return
  reorderBusy.value = true
  try {
    await flushAllSectionSaves()
    const ids = cvSectionReorderIds(next)
    await reorderSection(props.cvId, 'education', ids)
    const orderMap = new Map(ids.map((rowId, idx) => [rowId, idx]))
    props.updateAggregate((agg) => ({
      ...agg,
      education: agg.education.map((r) => ({
        ...r,
        sort_order: orderMap.has(r.id) ? orderMap.get(r.id)! : r.sort_order,
      })),
    }))
  } catch (err) {
    showNotice(err instanceof Error ? err.message : 'Nepodarilo sa zoradiť položky.')
  } finally {
    reorderBusy.value = false
  }
}

const skillDraft = reactive<Record<string, { skill_name: string; level: string }>>({})
const skillLevels = ['Začiatočník', 'Mierne pokročilý', 'Pokročilý', 'Expert'] as const
const skillLevelDropdownOptions: { value: string; label: string }[] = [
  { value: '', label: 'Vyberte úroveň' },
  ...skillLevels.map((l) => ({ value: l, label: l })),
]
const sortedSkills = computed(() => [...props.aggregate.skills].sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0)))

function skillLabel(id: string): string {
  const i = sortedSkills.value.findIndex((r) => r.id === id)
  return `Znalosť ${sortedSkills.value.length - i}`
}

async function persistSkillRow(id: string): Promise<void> {
  const d = skillDraft[id]
  if (!d) return
  const trimmed = d.skill_name.trim()
  if (trimmed.length >= 2) {
    const row = await ensureCatalogSkill(trimmed)
    d.skill_name = row?.name ?? trimmed
  }
  await patchSection<SkillResponseDto>(props.cvId, 'skills', id, {
    skill_name: d.skill_name.trim(),
    level: d.level === '' ? null : d.level,
  })
}

const skillSaveQueue = useCvSectionSaveQueue((id) => runSectionSave(() => persistSkillRow(id)))

function scheduleSkillSave(id: string): void {
  skillSaveQueue.markDirty(id)
}

async function addSkill(): Promise<void> {
  await flushAllSectionSaves()
  await postSection(props.cvId, 'skills', { skill_name: '', level: null })
  emit('reload')
}

async function saveSkill(id: string): Promise<void> {
  scheduleSkillSave(id)
  await skillSaveQueue.flush()
}

async function removeSkill(id: string): Promise<void> {
  await flushAllSectionSaves()
  await deleteSectionRow(props.cvId, 'skills', id)
  emit('reload')
}

const langDraft = reactive<Record<string, { language: string; level: string }>>({})
const langLevels = [
  { label: 'Začiatočník (A1)', value: 'A1' },
  { label: 'Začiatočník (A2)', value: 'A2' },
  { label: 'Mierne pokročilý (B1)', value: 'B1' },
  { label: 'Pokročilý (B2)', value: 'B2' },
  { label: 'Expert (C1)', value: 'C1' },
  { label: 'Expert (C2)', value: 'C2' },
] as const
const languageLevelDropdownOptions: { value: string; label: string }[] = [
  { value: '', label: 'Vyberte úroveň' },
  ...langLevels.map((l) => ({ value: l.value, label: l.label })),
]
const sortedLanguages = computed(() =>
  [...props.aggregate.languages].sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0)),
)

function langLabel(id: string): string {
  const i = sortedLanguages.value.findIndex((r) => r.id === id)
  return `Jazyk ${sortedLanguages.value.length - i}`
}

async function persistLanguageRow(id: string): Promise<void> {
  const d = langDraft[id]
  if (!d) return
  await patchSection<LanguageResponseDto>(props.cvId, 'languages', id, {
    language: d.language.trim(),
    level: d.level === '' ? null : d.level,
  })
}

const languageSaveQueue = useCvSectionSaveQueue((id) =>
  runSectionSave(() => persistLanguageRow(id)),
)

async function flushAllSectionSaves(): Promise<void> {
  await Promise.all([
    experienceSaveQueue.flush(),
    educationSaveQueue.flush(),
    skillSaveQueue.flush(),
    languageSaveQueue.flush(),
  ])
  await sectionSaveTail.value
}

function scheduleLanguageSave(id: string): void {
  languageSaveQueue.markDirty(id)
}

async function addLanguage(): Promise<void> {
  await flushAllSectionSaves()
  await postSection(props.cvId, 'languages', { language: '', level: null })
  emit('reload')
}

async function saveLanguage(id: string): Promise<void> {
  scheduleLanguageSave(id)
  await languageSaveQueue.flush()
}

async function removeLanguage(id: string): Promise<void> {
  await flushAllSectionSaves()
  await deleteSectionRow(props.cvId, 'languages', id)
  emit('reload')
}

async function onSkillName(id: string, value: string): Promise<void> {
  const d = skillDraft[id]
  if (!d) return
  d.skill_name = value
  scheduleSkillSave(id)
}

function onSkillLevel(id: string, value: string): void {
  const d = skillDraft[id]
  if (!d) return
  d.level = value
  scheduleSkillSave(id)
}

function onLangLevel(id: string, value: string): void {
  const d = langDraft[id]
  if (!d) return
  d.level = value
  scheduleLanguageSave(id)
}

function onLangNameInput(id: string): void {
  scheduleLanguageSave(id)
}

const licenseButtons = CV_DRIVING_LICENSE_CATEGORIES

function isLicenseActive(lic: string): boolean {
  return (props.header.driving_license_categories ?? []).includes(lic)
}

function toggleLicense(lic: string): void {
  patch({
    driving_license_categories: toggleCvDriverLicenseCategory(
      props.header.driving_license_categories ?? [],
      lic as CvDrivingLicenseCategory,
    ),
  })
}

const employmentOptions = JOB_POST_EMPLOYMENT_OPTIONS

const employmentSet = computed(() => new Set(props.header.employment_types ?? []))

function toggleEmployment(value: string): void {
  const next = new Set(props.header.employment_types ?? [])
  if (next.has(value)) next.delete(value)
  else next.add(value)
  patch({ employment_types: [...next] })
}

const startAvailabilityParsed = computed(() =>
  parseCvStartAvailability(props.header.start_availability),
)

const startTermMode = computed<CvStartTermMode>(() => startAvailabilityParsed.value.mode)

const startDateIso = computed(() => startAvailabilityParsed.value.dateIso)

const startTermLabel = computed(() =>
  formatCvStartAvailabilityLabel(props.header.start_availability),
)

function setStartTermMode(mode: CvStartTermMode): void {
  if (mode === 'immediate') {
    patch({ start_availability: CV_START_TERM_IMMEDIATE })
    return
  }
  if (mode === 'agreement') {
    patch({ start_availability: CV_START_TERM_AGREEMENT })
    return
  }
  patch({
    start_availability: startDateIso.value || CV_START_TERM_DATE_PENDING,
  })
}

function onStartDateInput(ev: Event): void {
  const v = (ev.target as HTMLInputElement).value.trim()
  patch({ start_availability: v || CV_START_TERM_DATE_PENDING })
}

const salaryUnitLabel = computed(() => {
  if (props.header.salary_period === 'hour') return 'za hodinu'
  return 'za mesiac'
})

function onSalaryAmount(ev: Event): void {
  const v = (ev.target as HTMLInputElement).value
  const n = v === '' ? null : Number.parseFloat(v)
  patch({ salary_min: n != null && Number.isFinite(n) ? n : null })
}

function onSalaryUnitValue(v: string): void {
  patch({
    salary_period: v === 'za hodinu' ? 'hour' : 'month',
    salary_currency: props.header.salary_currency ?? 'EUR',
  })
}

const hobbiesCount = computed(() => richTextPlainLength(props.header.hobbies))
const aboutCount = computed(() => richTextPlainLength(props.header.about_me))
const extraCount = computed(() => richTextPlainLength(props.header.additional_skills_info))

function onHobbiesRichHtml(html: string): void {
  const check = checkCvRichTextPlainLimit(html, CV_RICH_LIMIT_HOBBIES, 'Záujmy')
  if (!check.ok) {
    showNotice(check.message ?? 'Text je príliš dlhý.')
    return
  }
  patch({ hobbies: html.trim() ? html : null })
}

function onAboutRichHtml(html: string): void {
  const check = checkCvRichTextPlainLimit(html, CV_RICH_LIMIT_ABOUT, 'Osobné zhrnutie')
  if (!check.ok) {
    showNotice(check.message ?? 'Text je príliš dlhý.')
    return
  }
  patch({ about_me: html.trim() ? html : null })
}

function onExtraRichHtml(html: string): void {
  const check = checkCvRichTextPlainLimit(html, CV_RICH_LIMIT_EXTRA, 'Doplňujúce informácie')
  if (!check.ok) {
    showNotice(check.message ?? 'Text je príliš dlhý.')
    return
  }
  patch({ additional_skills_info: html.trim() ? html : null })
}

function onExpDescriptionHtml(id: string, html: string): void {
  const d = expDraft[id]
  if (!d) return
  const check = checkCvRichTextPlainLimit(html, CV_RICH_LIMIT_SECTION, 'Popis práce')
  if (!check.ok) {
    showNotice(check.message ?? 'Text je príliš dlhý.')
    return
  }
  d.description = html.trim() ? html : ''
  scheduleExperienceSave(id)
}

function onEduDescriptionHtml(id: string, html: string): void {
  const d = eduDraft[id]
  if (!d) return
  const check = checkCvRichTextPlainLimit(html, CV_RICH_LIMIT_SECTION, 'Popis štúdia')
  if (!check.ok) {
    showNotice(check.message ?? 'Text je príliš dlhý.')
    return
  }
  d.description = html.trim() ? html : ''
  scheduleEducationSave(id)
}

async function onPhotoFile(ev: Event): Promise<void> {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const validationError = validateImageUpload(file)
  if (validationError) {
    showNotice(validationError)
    return
  }
  try {
    const prepared = await prepareCvProfilePhotoForUpload(file)
    setLocalPhotoPreview(prepared)
    const row = await uploadCvPhoto(props.cvId, prepared)
    patch({
      photo_url: row.photo_url,
      photo_storage_path: row.photo_storage_path,
      photo_original_mime: row.photo_original_mime,
      photo_view_url: row.photo_view_url ?? null,
    })
    await refreshPhotoDisplayUrl({
      photo_url: row.photo_url,
      photo_storage_path: row.photo_storage_path,
      photo_view_url: row.photo_view_url ?? null,
    })
  } catch (err) {
    showNotice(err instanceof Error ? err.message : S.saveFailed)
  }
}

async function copyProfilePhoto(): Promise<void> {
  const config = useRuntimeConfig()
  const { session } = useAuth()
  const token = session.value?.access_token
  if (!token) {
    showNotice(S.cvCopyPhotoLoggedOut)
    return
  }
  try {
    const me = await $fetch<{ avatar_url?: string | null }>(`${config.public.apiBaseUrl}/api/profiles/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const url = me.avatar_url?.trim()
    if (!url) {
      showNotice(S.cvCopyPhotoAvatarMissing)
      return
    }
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error('fetch failed')
    }
    const blob = await res.blob()
    const file = new File([blob], 'avatar.jpg', {
      type: blob.type || 'image/jpeg',
    })
    const validationError = validateImageUpload(file)
    if (validationError) {
      showNotice(validationError)
      return
    }
    const prepared = await prepareCvProfilePhotoForUpload(file)
    setLocalPhotoPreview(prepared)
    const row = await uploadCvPhoto(props.cvId, prepared)
    patch({
      photo_url: row.photo_url,
      photo_storage_path: row.photo_storage_path,
      photo_original_mime: row.photo_original_mime,
      photo_view_url: row.photo_view_url ?? null,
    })
    await refreshPhotoDisplayUrl({
      photo_url: row.photo_url,
      photo_storage_path: row.photo_storage_path,
      photo_view_url: row.photo_view_url ?? null,
    })
  } catch {
    showNotice(S.cvCopyPhotoLoadFailed)
  }
}

function patch(p: Partial<CvHeaderResponseDto>): void {
  props.updateHeader(p)
}

async function flushHeaderNow(): Promise<void> {
  await props.flushHeaderSave()
}

/** Empty or whitespace-only → null; otherwise keep value as typed (trim only all-whitespace). */
function inputStrOrNull(ev: Event): string | null {
  const v = (ev.target as HTMLInputElement).value
  if (v.trim() === '') return null
  return v
}

async function emitGoStep(step: number): Promise<void> {
  const headerOk = await props.flushHeaderSave()
  if (!headerOk) {
    showNotice('Nepodarilo sa uložiť údaje životopisu. Skúste to znova.')
    return
  }
  try {
    await flushAllSectionSaves()
  } catch {
    return
  }
  emit('goStep', step)
}

watch(
  () => props.aggregate.experience,
  (list) => {
    for (const row of list) {
      if (!experienceSaveQueue.isDirty(row.id)) {
        expDraft[row.id] = experienceRowToDraft(row)
      }
    }
    for (const id of Object.keys(expDraft)) {
      if (!list.some((row) => row.id === id)) {
        delete expDraft[id]
        experienceSaveQueue.clearDirty(id)
      }
    }
  },
  { immediate: true },
)

watch(
  () => props.aggregate.education,
  (list) => {
    for (const row of list) {
      if (!educationSaveQueue.isDirty(row.id)) {
        eduDraft[row.id] = educationRowToDraft(row)
      }
    }
    for (const id of Object.keys(eduDraft)) {
      if (!list.some((row) => row.id === id)) {
        delete eduDraft[id]
        educationSaveQueue.clearDirty(id)
      }
    }
  },
  { immediate: true },
)

watch(
  () => props.aggregate.skills,
  (list) => {
    for (const row of list) {
      if (!skillSaveQueue.isDirty(row.id)) {
        skillDraft[row.id] = { skill_name: row.skill_name ?? '', level: row.level ?? '' }
      }
    }
    for (const id of Object.keys(skillDraft)) {
      if (!list.some((row) => row.id === id)) {
        delete skillDraft[id]
        skillSaveQueue.clearDirty(id)
      }
    }
  },
  { immediate: true },
)

watch(
  () => props.aggregate.languages,
  (list) => {
    for (const row of list) {
      if (!languageSaveQueue.isDirty(row.id)) {
        langDraft[row.id] = { language: row.language ?? '', level: row.level ?? '' }
      }
    }
    for (const id of Object.keys(langDraft)) {
      if (!list.some((row) => row.id === id)) {
        delete langDraft[id]
        languageSaveQueue.clearDirty(id)
      }
    }
  },
  { immediate: true },
)

onMounted(() => {
  props.registerSectionSaveFlusher(flushAllSectionSaves)
})

function scrollToSection(id: string): void {
  activeSection.value = id
  emit('setSection', id)
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function buildLocalPreviewExportData() {
  return buildExportDataFromState({
    uiTemplate: uiTemplate.value,
    header: props.header,
    aggregate: props.aggregate,
    expDraft,
    eduDraftForPreview: eduDraft,
    skillDraft,
    langDraft,
    photoUrl: photoPreviewUrl.value,
    employmentLabels: employmentOptions.filter((e) => employmentSet.value.has(e.value)).map((e) => e.label),
    startTerm: startTermLabel.value,
    salaryUnitLabel: salaryUnitLabel.value,
    licenseDisplay: sortCvDrivingLicenseCategories(props.header.driving_license_categories ?? []),
  })
}

const previewBusy = ref(false)
const htmlPreviewBusy = ref(false)

async function openPreview(): Promise<void> {
  if (previewBusy.value) return
  previewBusy.value = true
  try {
    const opened = await openCvPreviewFromData(buildLocalPreviewExportData(), {
      cvId: props.cvId,
      failedMessage: S.cvPreviewFailed,
    })
    if (!opened) {
      showNotice(S.cvPreviewPopupBlocked)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : S.cvPreviewFailed
    showNotice(msg)
  } finally {
    previewBusy.value = false
  }
}

async function openHtmlPreview(): Promise<void> {
  if (htmlPreviewBusy.value) return
  htmlPreviewBusy.value = true
  try {
    const opened = await openCvHtmlPreviewFromData(buildLocalPreviewExportData(), {
      cvId: props.cvId,
      failedMessage: S.cvPreviewFailed,
    })
    if (!opened) {
      showNotice(S.cvPreviewPopupBlocked)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : S.cvPreviewFailed
    showNotice(msg)
  } finally {
    htmlPreviewBusy.value = false
  }
}

const pdfExportBusy = ref(false)

async function downloadPdf(): Promise<void> {
  if (pdfExportBusy.value) return
  pdfExportBusy.value = true
  try {
    await downloadCvPdfFromData(buildLocalPreviewExportData(), {
      failedMessage: S.cvExportPdfFailed,
      cvId: props.cvId,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : S.cvExportPdfFailed
    showNotice(msg)
  } finally {
    pdfExportBusy.value = false
  }
}

async function onFinishWizard(): Promise<void> {
  const headerOk = await props.flushHeaderSave()
  if (!headerOk) {
    showNotice('Nepodarilo sa uložiť údaje životopisu. Skúste to znova.')
    return
  }
  try {
    await flushAllSectionSaves()
  } catch {
    return
  }
  await props.finishWizard()
}
</script>

