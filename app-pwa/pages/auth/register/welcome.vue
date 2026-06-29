<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'

definePageMeta({ layout: 'app' })

/** Legacy route — registration now lands on home or confirm-email. */
await navigateTo(ROUTES.home, { replace: true })
</script>
