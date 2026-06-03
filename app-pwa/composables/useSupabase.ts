import type { SupabaseClient } from '@supabase/supabase-js'

export function useSupabase(): SupabaseClient {
  const { $supabase } = useNuxtApp()
  return $supabase as SupabaseClient
}
