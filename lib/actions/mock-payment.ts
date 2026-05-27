'use server'

import { createClient } from '@/lib/supabase/server'

export async function mockCompletePayment(protestId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthenticated' }

  const { error } = await supabase
    .from('protests')
    .update({ status: 'completed_ready', updated_at: new Date().toISOString() })
    .eq('id', protestId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return {}
}
