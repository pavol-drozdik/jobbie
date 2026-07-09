<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import {
  uploadBlogContentImage,
  validateBlogImageFile,
} from '../composables/useAdminStorageUpload'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    placeholder: 'Začnite písať článok…',
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const skipEmit = ref(false)
const uiTick = ref(0)
const linkUrl = ref('')
const imageUploading = ref(false)
const imageUploadError = ref<string | null>(null)
const imageInputRef = useTemplateRef<HTMLInputElement>('imageInput')

function bumpUi(): void {
  uiTick.value += 1
}

async function insertImageFromFile(file: File): Promise<void> {
  if (props.disabled) return
  const validation = validateBlogImageFile(file)
  if (validation) {
    imageUploadError.value = validation
    return
  }
  imageUploading.value = true
  imageUploadError.value = null
  const result = await uploadBlogContentImage(file)
  imageUploading.value = false
  if ('error' in result) {
    imageUploadError.value = result.error
    return
  }
  editor.value
    ?.chain()
    .focus()
    .setImage({ src: result.publicUrl, alt: '' })
    .run()
  bumpUi()
}

function onImageFileChange(ev: Event): void {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  void insertImageFromFile(file)
}

function openImagePicker(): void {
  if (props.disabled || imageUploading.value) return
  imageInputRef.value?.click()
}

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      underline: false,
    }),
    Underline,
    Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
    Image.configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: { class: 'blog-inline-image' },
    }),
    Placeholder.configure({
      placeholder: props.placeholder,
      emptyEditorClass: 'is-editor-empty',
    }),
  ],
  content: props.modelValue || '',
  editable: !props.disabled,
  editorProps: {
    attributes: {
      class: 'rich-text-prose',
    },
    handlePaste(_view, event) {
      const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith('image/'),
      )
      if (!files.length) return false
      event.preventDefault()
      void insertImageFromFile(files[0])
      return true
    },
    handleDrop(_view, event, _slice, moved) {
      if (moved || props.disabled) return false
      const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
        f.type.startsWith('image/'),
      )
      if (!files.length) return false
      event.preventDefault()
      void insertImageFromFile(files[0])
      return true
    },
  },
  onUpdate({ editor: ed }) {
    if (skipEmit.value) return
    emit('update:modelValue', ed.getHTML())
    bumpUi()
  },
  onSelectionUpdate: bumpUi,
  onTransaction: bumpUi,
})

watch(
  () => props.modelValue,
  (v) => {
    const ed = editor.value
    if (!ed) return
    const next = v || ''
    if (ed.getHTML() === next) return
    skipEmit.value = true
    ed.commands.setContent(next, { emitUpdate: false })
    skipEmit.value = false
    bumpUi()
  },
)

watch(
  () => props.disabled,
  (d) => editor.value?.setEditable(!d),
)

const blockTypeUi = computed(() => {
  void uiTick.value
  const ed = editor.value
  if (!ed) return 'paragraph'
  if (ed.isActive('heading', { level: 2 })) return '2'
  if (ed.isActive('heading', { level: 3 })) return '3'
  return 'paragraph'
})

const isBold = computed(() => {
  void uiTick.value
  return editor.value?.isActive('bold') ?? false
})
const isItalic = computed(() => {
  void uiTick.value
  return editor.value?.isActive('italic') ?? false
})
const isUnderline = computed(() => {
  void uiTick.value
  return editor.value?.isActive('underline') ?? false
})
const isStrike = computed(() => {
  void uiTick.value
  return editor.value?.isActive('strike') ?? false
})
const isBulletList = computed(() => {
  void uiTick.value
  return editor.value?.isActive('bulletList') ?? false
})
const isOrderedList = computed(() => {
  void uiTick.value
  return editor.value?.isActive('orderedList') ?? false
})
const isBlockquote = computed(() => {
  void uiTick.value
  return editor.value?.isActive('blockquote') ?? false
})
const isLink = computed(() => {
  void uiTick.value
  return editor.value?.isActive('link') ?? false
})
const isCodeBlock = computed(() => {
  void uiTick.value
  return editor.value?.isActive('codeBlock') ?? false
})

function run(fn: () => void): void {
  fn()
  bumpUi()
}

function onBlockTypeValue(v: string): void {
  const ed = editor.value
  if (!ed || props.disabled) return
  if (v === 'paragraph') {
    ed.chain().focus().setParagraph().run()
  } else {
    ed.chain().focus().setHeading({ level: Number(v) as 2 | 3 }).run()
  }
  bumpUi()
}

function setLink(): void {
  const ed = editor.value
  if (!ed) return
  const prev = ed.getAttributes('link').href as string | undefined
  const url = linkUrl.value.trim() || window.prompt('URL odkazu', prev || 'https://')
  if (!url) {
    ed.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  let href = url.trim()
  if (!/^https?:\/\//i.test(href) && !href.startsWith('/') && !href.startsWith('#')) {
    href = `https://${href}`
  }
  ed.chain().focus().extendMarkRange('link').setLink({ href }).run()
  linkUrl.value = ''
  bumpUi()
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="rich-editor">
    <div v-if="editor" class="rich-editor-toolbar">
      <select
        :value="blockTypeUi"
        :disabled="disabled || imageUploading"
        aria-label="Formát bloku"
        @change="onBlockTypeValue(($event.target as HTMLSelectElement).value)"
      >
        <option value="paragraph">Odstavec</option>
        <option value="2">Nadpis 2</option>
        <option value="3">Nadpis 3</option>
      </select>
      <span class="toolbar-divider" aria-hidden="true" />
      <button type="button" class="toolbar-btn" :class="{ 'toolbar-btn-active': isBold }" title="Tučné" :disabled="disabled || imageUploading" @click="run(() => editor!.chain().focus().toggleBold().run())">B</button>
      <button type="button" class="toolbar-btn" :class="{ 'toolbar-btn-active': isItalic }" title="Kurzíva" :disabled="disabled || imageUploading" @click="run(() => editor!.chain().focus().toggleItalic().run())">I</button>
      <button type="button" class="toolbar-btn" :class="{ 'toolbar-btn-active': isUnderline }" title="Podčiarknuté" :disabled="disabled || imageUploading" @click="run(() => editor!.chain().focus().toggleUnderline().run())">U</button>
      <button type="button" class="toolbar-btn" :class="{ 'toolbar-btn-active': isStrike }" title="Preškrtnuté" :disabled="disabled || imageUploading" @click="run(() => editor!.chain().focus().toggleStrike().run())">S</button>
      <span class="toolbar-divider" aria-hidden="true" />
      <button type="button" class="toolbar-btn" :class="{ 'toolbar-btn-active': isBulletList }" title="Odrážky" :disabled="disabled || imageUploading" @click="run(() => editor!.chain().focus().toggleBulletList().run())">•</button>
      <button type="button" class="toolbar-btn" :class="{ 'toolbar-btn-active': isOrderedList }" title="Číslovaný zoznam" :disabled="disabled || imageUploading" @click="run(() => editor!.chain().focus().toggleOrderedList().run())">1.</button>
      <button type="button" class="toolbar-btn" :class="{ 'toolbar-btn-active': isBlockquote }" title="Citát" :disabled="disabled || imageUploading" @click="run(() => editor!.chain().focus().toggleBlockquote().run())">❝</button>
      <button type="button" class="toolbar-btn" :class="{ 'toolbar-btn-active': isCodeBlock }" title="Blok kódu" :disabled="disabled || imageUploading" @click="run(() => editor!.chain().focus().toggleCodeBlock().run())">&lt;/&gt;</button>
      <button type="button" class="toolbar-btn" title="Oddeľovač" :disabled="disabled || imageUploading" @click="run(() => editor!.chain().focus().setHorizontalRule().run())">—</button>
      <span class="toolbar-divider" aria-hidden="true" />
      <button type="button" class="toolbar-btn" :class="{ 'toolbar-btn-active': isLink }" title="Odkaz" :disabled="disabled || imageUploading" @click="setLink">🔗</button>
      <button
        type="button"
        class="toolbar-btn"
        :class="{ 'toolbar-btn-active': imageUploading }"
        title="Vložiť obrázok"
        :disabled="disabled || imageUploading"
        @click="openImagePicker"
      >
        {{ imageUploading ? '…' : '🖼' }}
      </button>
      <input
        ref="imageInput"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        class="rich-editor-image-input"
        @change="onImageFileChange"
      >
    </div>
    <p v-if="imageUploading" class="rich-editor-status rich-editor-status--info">Nahrávam obrázok…</p>
    <p v-else-if="imageUploadError" class="rich-editor-status rich-editor-status--error">{{ imageUploadError }}</p>
    <EditorContent :editor="editor" class="rich-editor-content" />
  </div>
</template>

<style>
.rich-editor-content .ProseMirror.is-editor-empty::before {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
  color: #94a3b8;
}
.rich-editor-content .ProseMirror ul,
.rich-editor-content .ProseMirror ol {
  padding-left: 1.35rem;
}
.rich-editor-content .ProseMirror a {
  color: #16a34a;
  text-decoration: underline;
}
.rich-editor-content .ProseMirror img.blog-inline-image {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1rem auto;
  border-radius: 10px;
}
.rich-editor-content .ProseMirror pre {
  margin: 1rem 0;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  background: #f1f5f9;
  font-size: 0.875rem;
  overflow-x: auto;
}
.rich-editor-content .ProseMirror hr {
  margin: 1.25rem 0;
  border: none;
  border-top: 1px solid #e2e8f0;
}
.rich-editor-image-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}
.rich-editor-status {
  margin: 0;
  padding: 0.45rem 0.85rem;
  font-size: 0.8rem;
  border-bottom: 1px solid #e2e8f0;
}
.rich-editor-status--info {
  color: #16a34a;
  background: #f0fdf4;
}
.rich-editor-status--error {
  color: #b42318;
  background: #fef3f2;
}
</style>
