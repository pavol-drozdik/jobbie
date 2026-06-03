import { createClient } from '@supabase/supabase-js'
import { createJobbieSupabaseAuthStorage } from '~/utils/supabase-auth-storage'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      storage: createJobbieSupabaseAuthStorage(),
      autoRefreshToken: true,
      experimental: {
        passkey: true,
      },
    },
  })
  return {
    provide: {
      supabase,
    },
  }
})
