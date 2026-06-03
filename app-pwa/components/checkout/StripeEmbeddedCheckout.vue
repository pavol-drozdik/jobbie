<template>
  <div class="relative w-full min-h-[360px]">
    <p
      v-if="loadError"
      class="mb-3 text-sm text-red-600"
      role="alert"
    >
      {{ loadError }}
    </p>
    <p
      v-if="mounting && !loadError"
      class="pointer-events-none absolute inset-x-0 top-0 z-[1] text-sm text-black/55"
    >
      {{ S.checkoutLoadingPayment }}
    </p>
    <div ref="mountRef" class="w-full min-h-[360px]" />
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

const props = defineProps<{
  clientSecret: string
}>()

const emit = defineEmits<{
  mountError: [message: string]
}>()

const config = useRuntimeConfig().public
const stripePublishableKey = config.stripePublishableKey as string

const mountRef = ref<HTMLDivElement | null>(null)
const loadError = ref<string | null>(null)
const mounting = ref(false)

let checkoutInstance: { destroy: () => void } | null = null
let mountGeneration = 0

async function waitForMountEl(maxAttempts = 12): Promise<HTMLDivElement | null> {
  for (let i = 0; i < maxAttempts; i += 1) {
    await nextTick()
    const el = mountRef.value
    if (el) return el
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }
  return mountRef.value
}

async function mountEmbeddedCheckout(secret: string): Promise<void> {
  const generation = ++mountGeneration
  loadError.value = null
  mounting.value = true

  if (!stripePublishableKey?.trim()) {
    const msg = S.checkoutStripeNotConfigured
    loadError.value = msg
    emit('mountError', msg)
    mounting.value = false
    return
  }

  const trimmed = secret.trim()
  if (!trimmed) {
    mounting.value = false
    return
  }

  const el = await waitForMountEl()
  if (!el) {
    const msg = S.checkoutPaymentFailed
    loadError.value = msg
    emit('mountError', msg)
    mounting.value = false
    if (import.meta.dev) {
      console.error('[checkout] embedded mount: mountRef missing after retries')
    }
    return
  }

  if (generation !== mountGeneration) return

  checkoutInstance?.destroy()
  checkoutInstance = null
  el.innerHTML = ''

  try {
    const { loadStripe } = await import('@stripe/stripe-js')
    const stripe = await loadStripe(stripePublishableKey)
    if (!stripe) {
      throw new Error(S.checkoutStripeLoadFailed)
    }
    if (generation !== mountGeneration) return

    const checkout = await stripe.initEmbeddedCheckout({
      clientSecret: trimmed,
    })
    if (generation !== mountGeneration) {
      checkout.destroy()
      return
    }

    checkout.mount(el)
    checkoutInstance = checkout
  } catch (e) {
    if (generation !== mountGeneration) return
    const msg = e instanceof Error ? e.message : S.checkoutPaymentFailed
    loadError.value = msg
    emit('mountError', msg)
    if (import.meta.dev) {
      console.error('[checkout] embedded mount failed', e)
    }
  } finally {
    if (generation === mountGeneration) {
      mounting.value = false
    }
  }
}

function scheduleMount(secret: string): void {
  if (!import.meta.client || !secret.trim()) return
  void mountEmbeddedCheckout(secret)
}

onMounted(() => {
  scheduleMount(props.clientSecret)
})

watch(
  () => props.clientSecret,
  (secret, previous) => {
    if (!secret || secret === previous) return
    scheduleMount(secret)
  },
)

onUnmounted(() => {
  mountGeneration += 1
  checkoutInstance?.destroy()
  checkoutInstance = null
})
</script>
