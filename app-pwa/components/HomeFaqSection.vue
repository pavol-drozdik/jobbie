<template>
  <section class="home-faq" aria-labelledby="home-faq-title">
    <div class="home-faq__inner">
      <h2 id="home-faq-title" class="home-faq__title section-title text-center">
        {{ S.faqTitle }}
      </h2>
      <div class="home-faq__role-block">
        <p class="home-faq__role-label">{{ S.faqRolePrompt }}</p>
        <div class="home-faq__tabs" role="tablist" :aria-label="S.faqTitle">
          <button
            v-for="tab in roleTabs"
            :key="tab.role"
            type="button"
            role="tab"
            class="home-faq__tab"
            :class="{ 'home-faq__tab--active': activeRole === tab.role }"
            :aria-selected="activeRole === tab.role"
            @click="selectRole(tab.role)"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>
      <div
        class="home-faq__accordion home-faq__card"
        role="tabpanel"
        :aria-label="currentTabLabel"
      >
        <div
          v-for="(item, index) in currentItems"
          :key="`${activeRole}-${index}`"
          class="home-faq__item"
        >
          <button
            type="button"
            class="home-faq__trigger"
            :aria-expanded="openIndex === index"
            :aria-controls="`faq-panel-${activeRole}-${index}`"
            :id="`faq-trigger-${activeRole}-${index}`"
            @click="toggle(index)"
          >
            <span class="home-faq__q">{{ item.question }}</span>
            <span class="home-faq__chev" :class="{ 'home-faq__chev--open': openIndex === index }" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6l-6-6z" />
              </svg>
            </span>
          </button>
          <div
            v-show="openIndex === index"
            :id="`faq-panel-${activeRole}-${index}`"
            role="region"
            class="home-faq__panel"
            :aria-labelledby="`faq-trigger-${activeRole}-${index}`"
          >
            <p class="home-faq__a">{{ item.answer }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { S } from '~/utils/strings'
import { HOME_FAQ_BY_ROLE, type HomeFaqRole } from '~/utils/home-faq'

const activeRole = ref<HomeFaqRole>('employer')
const openIndex = ref<number | null>(null)

const roleTabs = computed(
  (): readonly { role: HomeFaqRole; label: string }[] => [
    { role: 'employer', label: S.faqRoleEmployer },
    { role: 'worker', label: S.faqRoleWorker },
    { role: 'provider', label: S.faqRoleProvider },
  ],
)

const currentItems = computed(() => HOME_FAQ_BY_ROLE[activeRole.value])

const currentTabLabel = computed((): string => {
  const t = roleTabs.value.find((x) => x.role === activeRole.value)
  return t?.label ?? ''
})

function selectRole(role: HomeFaqRole): void {
  activeRole.value = role
}

function toggle(index: number): void {
  openIndex.value = openIndex.value === index ? null : index
}

watch(activeRole, () => {
  openIndex.value = null
})
</script>

<style scoped>
@keyframes home-faq-expand {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Align with .frame-surface (#F6FAF8) — same shell as hero & steps */
.home-faq {
  width: 100%;
  background: transparent;
}

.home-faq__inner {
  max-width: 1150px;
  margin-left: auto;
  margin-right: auto;
  padding: 40px 16px 48px;
}

@media (min-width: 768px) {
  .home-faq__inner {
    padding: 56px 16px 64px;
  }
}

/* Uses global .section-title */
.home-faq__title {
  margin: 0 auto;
  line-height: 1.12;
}

.home-faq__role-block {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

@media (min-width: 768px) {
  .home-faq__role-block {
    margin-top: 40px;
  }
}

.home-faq__role-label {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink2);
  letter-spacing: -0.02em;
}

.home-faq__tabs {
  display: flex;
  gap: 10px;
  width: 100%;
  max-width: 720px;
}

@media (max-width: 480px) {
  .home-faq__tabs {
    flex-direction: column;
  }
}

.home-faq__tab {
  flex: 1;
  border-radius: 999px;
  border: 1.5px solid var(--g200);
  padding: 12px 18px;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  background: var(--surface);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
}

@media (min-width: 481px) {
  .home-faq__tab {
    font-size: 16px;
    padding: 13px 22px;
  }
}

.home-faq__tab:hover {
  border-color: var(--g400);
  background: var(--g50);
}

.home-faq__tab:focus-visible {
  outline: 2px solid var(--g500);
  outline-offset: 2px;
}

.home-faq__tab--active {
  border-color: var(--g500);
  color: var(--g700);
  background: var(--g50);
  box-shadow: 0 1px 0 rgba(46, 168, 92, 0.15);
}

.home-faq__accordion {
  display: flex;
  flex-direction: column;
  margin-top: 28px;
}

.home-faq__card {
  background: var(--surface);
  border: 1px solid var(--sand3);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(14, 28, 18, 0.04);
}

.home-faq__item {
  border-top: 1px solid var(--g100);
}

.home-faq__item:first-child {
  border-top: none;
}

.home-faq__trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 14px 18px;
  text-align: left;
  cursor: pointer;
  border: none;
  background: transparent;
  color: inherit;
  transition: background 0.15s ease;
}

.home-faq__trigger:hover {
  background: var(--g50);
}

.home-faq__trigger:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--g500);
}

.home-faq__q {
  font-size: 17px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.35;
  letter-spacing: -0.02em;
}

.home-faq__chev {
  flex-shrink: 0;
  display: flex;
  color: var(--g600);
  transition: transform 0.2s ease;
}

.home-faq__chev--open {
  transform: rotate(180deg);
  color: var(--g500);
}

.home-faq__panel {
  padding: 0 18px 16px 18px;
  animation: home-faq-expand 0.22s ease forwards;
}

.home-faq__a {
  margin: 0;
  border-left: 3px solid var(--g200);
  padding-left: 14px;
  font-size: 16px;
  line-height: 1.55;
  font-weight: 500;
  color: var(--ink2);
  max-width: 900px;
}
</style>
