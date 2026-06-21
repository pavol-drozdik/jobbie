<template>
  <div
    class="rich-text-editor cv-field w-full overflow-hidden rounded-2xl border border-black/[0.06] bg-marketing-soft"
    :class="{ 'cv-field-is-disabled': disabled }"
  >
    <ClientOnly>
      <div v-if="editor">
        <div class="flex flex-wrap items-center gap-1 border-b border-black/[0.06] px-3.5 py-2.5">
          <div class="relative z-10 shrink-0">
            <AppFormDropdown
              v-model="blockTypeUi"
              variant="toolbar"
              bordered
              :options="blockTypeOptions"
              :disabled="disabled"
            />
          </div>
          <div class="mx-1 w-px self-stretch bg-black/10" aria-hidden="true" />
          <button
            type="button"
            class="toolbar-btn"
            :class="{ 'toolbar-btn-active': isBold }"
            title="Tučné"
            :disabled="disabled"
            @click="run(() => editor!.chain().focus().toggleBold().run())"
          >
            <span class="font-dmSans text-[15px] font-semibold">B</span>
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :class="{ 'toolbar-btn-active': isItalic }"
            title="Kurzíva"
            :disabled="disabled"
            @click="run(() => editor!.chain().focus().toggleItalic().run())"
          >
            <span class="font-dmSans text-[15px] font-semibold">I</span>
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :class="{ 'toolbar-btn-active': isUnderline }"
            title="Podčiarknuté"
            :disabled="disabled"
            @click="run(() => editor!.chain().focus().toggleUnderline().run())"
          >
            <span class="font-dmSans text-[15px] font-semibold">U</span>
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :class="{ 'toolbar-btn-active': isStrike }"
            title="Preškrtnuté"
            :disabled="disabled"
            @click="run(() => editor!.chain().focus().toggleStrike().run())"
          >
            <span class="font-dmSans text-[15px] font-semibold">S</span>
          </button>
          <div class="mx-1 w-px self-stretch bg-black/10" aria-hidden="true" />
          <button
            type="button"
            class="toolbar-btn"
            :class="{ 'toolbar-btn-active': isBulletList }"
            title="Odrážky"
            :disabled="disabled"
            @click="run(() => editor!.chain().focus().toggleBulletList().run())"
          >
            <span class="font-dmSans text-[15px] font-semibold">•</span>
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :class="{ 'toolbar-btn-active': isOrderedList }"
            title="Číslovaný zoznam"
            :disabled="disabled"
            @click="run(() => editor!.chain().focus().toggleOrderedList().run())"
          >
            <span class="font-dmSans text-[15px] font-semibold">1.</span>
          </button>
        </div>
        <EditorContent
          :editor="editor"
          class="rich-text-editor-content"
          :style="editorAreaStyle"
        />
      </div>
      <template #fallback>
        <div
          class="flex items-center justify-center px-5 py-4 font-dmSans text-base text-black/40"
          :style="editorAreaStyle"
        >
          Načítavam editor…
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
// Parents must sanitize HTML on save (sanitizeJobDescriptionHtml) — editor output is not trusted at display time.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'

const blockTypeOptions = [
  { value: 'paragraph', label: 'Odstavec' },
  { value: '2', label: 'Nadpis 2' },
  { value: '3', label: 'Nadpis 3' },
  { value: '4', label: 'Nadpis 4' },
] as const

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    disabled?: boolean
    /** Editable area height in px (wrapper + ProseMirror). */
    minHeightPx?: number
  }>(),
  {
    placeholder: '',
    disabled: false,
    minHeightPx: 300,
  },
)

const editorAreaStyle = computed(() => ({
  '--rte-min-h': `${props.minHeightPx}px`,
}))

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const skipEmit = ref(false)
const uiTick = ref(0)

function bumpUi(): void {
  uiTick.value += 1
}

const editorContentClass = computed(
  () =>
    'rich-html-content px-5 py-4 text-lg leading-relaxed outline-none ring-marketing-green focus-visible:ring-2 focus-visible:ring-offset-0',
)

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      code: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
      underline: false,
    }),
    Underline,
    Placeholder.configure({
      placeholder: props.placeholder,
      emptyEditorClass: 'is-editor-empty',
    }),
  ],
  content: props.modelValue || '',
  editable: !props.disabled,
  editorProps: {
    attributes: {
      class: editorContentClass.value,
    },
  },
  onUpdate({ editor: ed }) {
    if (skipEmit.value) return
    emit('update:modelValue', ed.getHTML())
    bumpUi()
  },
  onSelectionUpdate() {
    bumpUi()
  },
  onTransaction() {
    bumpUi()
  },
})

watch(
  () => props.modelValue,
  (v) => {
    const ed = editor.value
    if (!ed) return
    if (ed.isFocused) return
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
  (d) => {
    editor.value?.setEditable(!d)
  },
)

watch(editorContentClass, (cls) => {
  editor.value?.setOptions({
    editorProps: {
      attributes: {
        class: cls,
      },
    },
  })
})

const blockTypeUi = computed({
  get(): string {
    void uiTick.value
    const ed = editor.value
    if (!ed) return 'paragraph'
    if (ed.isActive('heading', { level: 2 })) return '2'
    if (ed.isActive('heading', { level: 3 })) return '3'
    if (ed.isActive('heading', { level: 4 })) return '4'
    return 'paragraph'
  },
  set(v: string) {
    onBlockTypeValue(v)
  },
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
    const level = Number(v) as 2 | 3 | 4
    ed.chain().focus().setHeading({ level }).run()
  }
  bumpUi()
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})

defineExpose({
  getPlainText(): string {
    return editor.value?.getText().trim() ?? ''
  },
})
</script>

<style scoped>
.toolbar-btn {
  @apply flex size-9 shrink-0 items-center justify-center rounded-lg border-none bg-transparent text-[15px] text-black/50 transition-colors hover:bg-marketing-panel hover:text-black disabled:cursor-not-allowed disabled:opacity-40;
}
.toolbar-btn-active {
  @apply bg-marketing-green text-white hover:bg-marketing-green hover:text-white;
}
</style>

<style>
.rich-text-editor-content {
  min-height: var(--rte-min-h, 300px);
}
.rich-text-editor-content .ProseMirror {
  min-height: var(--rte-min-h, 300px);
}
.rich-text-editor-content .ProseMirror:focus-visible {
  outline: none;
}
.rich-text-editor-content .ProseMirror.is-editor-empty::before {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
  color: rgb(0 0 0 / 0.3);
}
</style>
