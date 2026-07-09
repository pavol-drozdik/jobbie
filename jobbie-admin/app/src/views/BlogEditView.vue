<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import ToggleButton from 'primevue/togglebutton'
import { adminApi } from '../composables/adminApi'
import { useConfirm } from '../composables/useConfirm'
import AdminRichTextEditor from '../components/AdminRichTextEditor.vue'
import AdminCoverUpload from '../components/AdminCoverUpload.vue'
import { buildBlogPublicUrl } from '../utils/pwa-public-url'

const { confirm } = useConfirm()

const route = useRoute()
const router = useRouter()
const isNew = computed(() => route.name === 'blog-new')
const postId = computed(() => (isNew.value ? null : String(route.params.id ?? '')))

const saving = ref(false)
const message = ref<string | null>(null)
const error = ref(false)

const slug = ref('')
const title = ref('')
const excerpt = ref('')
const bodyHtml = ref('')
const coverImageUrl = ref('')
const category = ref('tipy')
const status = ref<'draft' | 'published'>('draft')
const seoTitle = ref('')
const seoDescription = ref('')
const isFeatured = ref(false)
const readingTimeMinutes = ref<number | ''>('')
const slugError = ref<string | null>(null)

const categories = [
  { value: 'tipy', label: 'Tipy' },
  { value: 'kariera', label: 'Kariéra' },
  { value: 'brigady', label: 'Brigády' },
  { value: 'firmy', label: 'Firmy' },
  { value: 'novinky', label: 'Novinky' },
]

const statusOptions = [
  { label: 'Koncept', value: 'draft' as const },
  { label: 'Publikovaný', value: 'published' as const },
]

function buildBody() {
  return {
    slug: slug.value.trim() || undefined,
    title: title.value.trim(),
    excerpt: excerpt.value.trim() || null,
    body_html: bodyHtml.value,
    cover_image_url: coverImageUrl.value.trim() || null,
    category: category.value,
    status: status.value,
    seo_title: seoTitle.value.trim() || null,
    seo_description: seoDescription.value.trim() || null,
    is_featured: isFeatured.value,
    reading_time_minutes:
      readingTimeMinutes.value === '' ? undefined : Number(readingTimeMinutes.value),
  }
}

async function loadPost() {
  if (!postId.value) return
  const res = await adminApi<Record<string, unknown>>(`/admin/blog/${postId.value}`)
  if (!res.ok || !res.data) {
    message.value = `Chyba načítania: ${res.status}`
    error.value = true
    return
  }
  const p = res.data
  slug.value = String(p.slug ?? '')
  title.value = String(p.title ?? '')
  excerpt.value = String(p.excerpt ?? '')
  bodyHtml.value = String(p.body_html ?? '')
  coverImageUrl.value = String(p.cover_image_url ?? '')
  category.value = String(p.category ?? 'tipy')
  status.value = (p.status === 'published' ? 'published' : 'draft') as 'draft' | 'published'
  seoTitle.value = String(p.seo_title ?? '')
  seoDescription.value = String(p.seo_description ?? '')
  isFeatured.value = Boolean(p.is_featured)
  readingTimeMinutes.value =
    p.reading_time_minutes != null ? Number(p.reading_time_minutes) : ''
}

async function save() {
  message.value = null
  error.value = false
  if (!title.value.trim()) {
    message.value = 'Nadpis je povinný.'
    error.value = true
    return
  }
  if (!bodyHtml.value.replace(/<[^>]+>/g, '').trim()) {
    message.value = 'Telo článku je povinné.'
    error.value = true
    return
  }
  saving.value = true
  const body = buildBody()
  let res: Awaited<ReturnType<typeof adminApi<Record<string, unknown>>>>
  try {
    res = isNew.value
      ? await adminApi<Record<string, unknown>>('/admin/blog', { method: 'POST', body })
      : await adminApi<Record<string, unknown>>(`/admin/blog/${postId.value}`, {
          method: 'PATCH',
          body,
        })
  } finally {
    saving.value = false
  }
  if (res.ok && res.data) {
    message.value = 'Uložené.'
    error.value = false
    if (isNew.value && res.data.id) {
      await router.replace({ name: 'blog-edit', params: { id: String(res.data.id) } })
    }
  } else {
    error.value = true
    const errBody = res.ok ? '' : res.body
    slugError.value = parseApiSlugError(errBody)
    message.value = res.ok ? 'Uloženie zlyhalo.' : formatApiError(res.status, errBody)
  }
}

function parseApiSlugError(body: string): string | null {
  try {
    const j = JSON.parse(body) as { message?: string | string[] }
    const msg = Array.isArray(j.message) ? j.message.join(', ') : j.message
    if (msg && /slug/i.test(msg)) return msg
  } catch {
    if (/slug/i.test(body)) return body.slice(0, 300)
  }
  return null
}

function formatApiError(status: number, body: string): string {
  const slug = parseApiSlugError(body)
  if (slug) return slug
  return `Chyba ${status}: ${body.slice(0, 200)}`
}

function openPreview() {
  const s = slug.value.trim()
  if (!s) {
    message.value = 'Najprv zadajte slug.'
    error.value = true
    return
  }
  window.open(buildBlogPublicUrl(s), '_blank', 'noopener,noreferrer')
}

async function publish() {
  if (!postId.value) {
    await save()
    return
  }
  await save()
  if (error.value) return
  saving.value = true
  const res = await adminApi<Record<string, unknown>>(`/admin/blog/${postId.value}/publish`, {
    method: 'POST',
  })
  saving.value = false
  if (res.ok) {
    status.value = 'published'
    message.value = 'Publikované.'
    error.value = false
  } else {
    error.value = true
    message.value = `Chyba ${res.status}: ${res.body}`
  }
}

async function unpublish() {
  if (!postId.value) return
  saving.value = true
  const res = await adminApi<Record<string, unknown>>(`/admin/blog/${postId.value}/unpublish`, {
    method: 'POST',
  })
  saving.value = false
  if (res.ok) {
    status.value = 'draft'
    message.value = 'Zrušené publikovanie.'
    error.value = false
  } else {
    error.value = true
    message.value = `Chyba ${res.status}: ${res.body}`
  }
}

async function removePost() {
  if (!postId.value) return
  const ok = await confirm({
    title: 'Zmazať článok',
    message: 'Zmazať tento článok natrvalo?',
    confirmLabel: 'Zmazať',
    danger: true,
  })
  if (!ok) return
  const res = await adminApi<{ ok: true }>(`/admin/blog/${postId.value}`, { method: 'DELETE' })
  if (res.ok) {
    await router.push({ name: 'blog' })
  } else {
    error.value = true
    message.value = `Chyba ${res.status}: ${res.body}`
  }
}

onMounted(() => {
  if (!isNew.value) void loadPost()
})
</script>

<template>
  <div class="admin-page">
    <Button
      label="← Späť na zoznam"
      severity="secondary"
      text
      size="small"
      class="mb-2"
      @click="router.push({ name: 'blog' })"
    />

    <h1 class="m-0 mb-4 text-2xl font-bold text-slate-900">
      {{ isNew ? 'Nový článok' : 'Upraviť článok' }}
    </h1>

    <div class="blog-edit-layout">
      <Card class="shadow-sm">
        <template #content>
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium text-slate-700">Nadpis *</label>
              <InputText v-model="title" class="w-full" maxlength="300" />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium text-slate-700">Perex</label>
              <p class="m-0 text-xs text-slate-500">
                Krátky úvodný text pod nadpisom na stránke článku. Ak necháte prázdne, použije sa SEO popis alebo úryvok z tela.
              </p>
              <Textarea v-model="excerpt" class="w-full" maxlength="500" rows="3" />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium text-slate-700">Telo článku *</label>
              <p class="m-0 text-xs text-slate-500">
                Nadpisy H2 sa zobrazia v obsahu článku (TOC). Citát slúži pre tipy.
              </p>
              <AdminRichTextEditor v-model="bodyHtml" :disabled="saving" />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium text-slate-700">Titulná fotka</label>
              <p class="m-0 text-xs text-slate-500">
                Voliteľná. Ak ju nenahrajete, na webe sa použije prvý obrázok z tela článku.
              </p>
              <AdminCoverUpload v-model="coverImageUrl" />
            </div>
          </div>
        </template>
      </Card>

      <aside class="flex flex-col gap-4">
        <Card class="shadow-sm">
          <template #content>
            <div class="flex flex-col gap-3">
              <div class="flex flex-col gap-1">
                <label class="text-sm font-medium text-slate-700">Slug</label>
                <InputText v-model="slug" class="w-full font-mono text-sm" maxlength="120" placeholder="auto z nadpisu" />
                <Message v-if="slugError" severity="error" :closable="false" class="mt-1">{{ slugError }}</Message>
                <Button
                  label="Náhľad na webe"
                  severity="secondary"
                  text
                  size="small"
                  class="mt-1 self-start"
                  @click="openPreview"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm font-medium text-slate-700">Kategória</label>
                <Select
                  v-model="category"
                  :options="categories"
                  option-label="label"
                  option-value="value"
                  class="w-full"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm font-medium text-slate-700">Stav</label>
                <Select
                  v-model="status"
                  :options="statusOptions"
                  option-label="label"
                  option-value="value"
                  class="w-full"
                />
              </div>
              <div class="flex items-center gap-2">
                <ToggleButton
                  v-model="isFeatured"
                  on-label="Zvýrazniť na archive"
                  off-label="Bez zvýraznenia"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm font-medium text-slate-700">Čas čítania (min)</label>
                <InputText
                  :model-value="readingTimeMinutes === '' ? '' : String(readingTimeMinutes)"
                  type="number"
                  class="max-w-32"
                  min="1"
                  max="120"
                  placeholder="auto"
                  @update:model-value="readingTimeMinutes = $event === '' || $event == null ? '' : Number($event)"
                />
              </div>
            </div>
          </template>
        </Card>

        <Card class="shadow-sm">
          <template #content>
            <div class="flex flex-col gap-3">
              <div class="flex flex-col gap-1">
                <label class="text-sm font-medium text-slate-700">SEO nadpis</label>
                <InputText v-model="seoTitle" class="w-full" maxlength="200" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm font-medium text-slate-700">SEO popis</label>
                <Textarea v-model="seoDescription" class="w-full" maxlength="400" rows="3" />
              </div>
            </div>
          </template>
        </Card>

        <p class="m-0 text-sm leading-relaxed text-slate-500">
          <strong class="text-slate-700">Uložiť</strong> uloží koncept (alebo publikuje, ak je stav „Publikovaný“).
          Na webe sa článok zobrazí až po <strong class="text-slate-700">Publikovať</strong> alebo po uložení so stavom Publikovaný.
        </p>

        <div class="flex flex-wrap gap-2">
          <Button :label="saving ? 'Ukladám…' : 'Uložiť'" :loading="saving" @click="save" />
          <Button
            v-if="postId && status !== 'published'"
            label="Publikovať"
            severity="secondary"
            :disabled="saving"
            @click="publish"
          />
          <Button
            v-if="postId && status === 'published'"
            label="Zrušiť publikovanie"
            severity="secondary"
            :disabled="saving"
            @click="unpublish"
          />
          <Button
            v-if="postId"
            label="Zmazať"
            severity="danger"
            :disabled="saving"
            @click="removePost"
          />
        </div>

        <Message v-if="message" :severity="error ? 'error' : 'success'" :closable="false">
          {{ message }}
        </Message>
      </aside>
    </div>
  </div>
</template>
