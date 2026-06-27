<template>
  <div
    class="flex justify-between gap-2 sm:gap-2.5"
    role="group"
    :aria-label="ariaLabel"
    @paste="onPaste"
  >
    <input
      v-for="(_, index) in OTP_LENGTH"
      :key="index"
      :ref="(el) => setInputRef(index, el)"
      :id="index === 0 ? id : undefined"
      :value="digits[index]"
      type="text"
      inputmode="numeric"
      :autocomplete="index === 0 ? 'one-time-code' : 'off'"
      maxlength="1"
      class="size-[52px] shrink-0 rounded-xl border border-black/[0.06] bg-marketing-soft text-center font-dmSans text-[22px] font-semibold tabular-nums text-black outline-none ring-marketing-green transition-[border-color,box-shadow,background-color] duration-200 focus-visible:ring-2 disabled:is-disabled-cursor disabled:opacity-60 sm:size-[58px] sm:text-[26px]"
      :class="cellClass(index)"
      :disabled="disabled"
      :aria-label="`Číslica ${index + 1} z ${OTP_LENGTH}`"
      @input="onInput(index, $event)"
      @keydown="onKeydown(index, $event)"
      @focus="onFocus(index, $event)"
      @blur="onBlur(index)"
    >
  </div>
</template>

<script setup lang="ts">
const OTP_LENGTH = 6

const props = withDefaults(
  defineProps<{
    modelValue: string
    disabled?: boolean
    id?: string
    ariaLabel?: string
  }>(),
  {
    disabled: false,
    ariaLabel: 'Overovací kód',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  complete: [value: string]
}>()

const digits = ref<string[]>(Array.from({ length: OTP_LENGTH }, () => ''))
const focusedIndex = ref<number | null>(null)
const inputRefs: (HTMLInputElement | null)[] = Array.from({ length: OTP_LENGTH }, () => null)

function cellClass(index: number): string {
  const filled = Boolean(digits.value[index])
  const focused = focusedIndex.value === index
  if (focused) {
    return 'border-marketing-green bg-marketing-mint'
  }
  if (filled) {
    return 'border-marketing-green/70 bg-marketing-mint/60'
  }
  return 'hover:border-black/20'
}

function setInputRef(index: number, el: unknown): void {
  inputRefs[index] = el instanceof HTMLInputElement ? el : null
}

function syncFromModelValue(val: string): void {
  const normalized = (val ?? '').replace(/\D/g, '').slice(0, OTP_LENGTH)
  const next = Array.from({ length: OTP_LENGTH }, (_, i) => normalized[i] ?? '')
  if (next.join('') !== digits.value.join('')) {
    digits.value = next
  }
}

watch(
  () => props.modelValue,
  (val) => syncFromModelValue(val),
  { immediate: true },
)

function emitValue(): void {
  const value = digits.value.join('')
  emit('update:modelValue', value)
  if (value.length === OTP_LENGTH) {
    emit('complete', value)
  }
}

function focusIndex(index: number): void {
  nextTick(() => {
    const el = inputRefs[index]
    el?.focus()
    el?.select()
  })
}

function setDigit(index: number, char: string): void {
  const digit = char.replace(/\D/g, '').slice(-1)
  digits.value[index] = digit
  emitValue()
  if (digit && index < OTP_LENGTH - 1) {
    focusIndex(index + 1)
  }
}

function fillFromPaste(text: string, startIndex = 0): void {
  const chars = text.replace(/\D/g, '').slice(0, OTP_LENGTH - startIndex).split('')
  for (let i = 0; i < chars.length; i++) {
    digits.value[startIndex + i] = chars[i] ?? ''
  }
  emitValue()
  const focusAt = Math.min(startIndex + Math.max(chars.length - 1, 0), OTP_LENGTH - 1)
  focusIndex(focusAt)
}

function onInput(index: number, event: Event): void {
  const input = event.target as HTMLInputElement
  const value = input.value
  if (value.length > 1) {
    fillFromPaste(value, index)
    input.value = digits.value[index] ?? ''
    return
  }
  setDigit(index, value)
}

function onKeydown(index: number, event: KeyboardEvent): void {
  if (event.key === 'Backspace') {
    if (digits.value[index]) {
      digits.value[index] = ''
      emitValue()
    } else if (index > 0) {
      digits.value[index - 1] = ''
      emitValue()
      focusIndex(index - 1)
    }
    event.preventDefault()
    return
  }
  if (event.key === 'ArrowLeft' && index > 0) {
    focusIndex(index - 1)
    event.preventDefault()
    return
  }
  if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
    focusIndex(index + 1)
    event.preventDefault()
  }
}

function onPaste(event: ClipboardEvent): void {
  event.preventDefault()
  fillFromPaste(event.clipboardData?.getData('text') ?? '', 0)
}

function onFocus(index: number, event: Event): void {
  focusedIndex.value = index
  ;(event.target as HTMLInputElement).select()
}

function onBlur(index: number): void {
  if (focusedIndex.value === index) {
    focusedIndex.value = null
  }
}

function focus(): void {
  focusIndex(0)
}

onMounted(() => {
  if (!props.disabled) {
    focusIndex(0)
  }
})

defineExpose({ focus })
</script>
