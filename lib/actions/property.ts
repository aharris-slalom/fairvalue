'use server'

import { createClient } from '@/lib/supabase/server'
import type { ArgumentType, ProtestStatus } from '@/lib/store/protest-store'

export async function createProtest(
  propertyId: string
): Promise<{ protestId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthenticated' }

  const { data, error } = await supabase
    .from('protests')
    .insert({ user_id: user.id, property_id: propertyId })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'failed' }
  return { protestId: data.id }
}

export async function selectArgument(
  protestId: string,
  argumentType: ArgumentType
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('protests')
    .update({ argument_type: argumentType, updated_at: new Date().toISOString() })
    .eq('id', protestId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function advanceProtestStatus(
  protestId: string,
  status: ProtestStatus
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('protests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', protestId)

  if (error) return { error: error.message }
  return { success: true }
}
