'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function deleteAccount(): Promise<{ error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const userId = user.id

  // Get all protest IDs for storage + cascade setup
  const { data: protests } = await supabaseAdmin
    .from('protests')
    .select('id')
    .eq('user_id', userId)

  const protestIds = (protests ?? []).map((p) => p.id)

  if (protestIds.length > 0) {
    // Get photo storage paths before cascade wipes evidence_attachments
    const { data: deficits } = await supabaseAdmin
      .from('property_deficits')
      .select('id')
      .in('protest_id', protestIds)

    const deficitIds = (deficits ?? []).map((d) => d.id)

    if (deficitIds.length > 0) {
      const { data: attachments } = await supabaseAdmin
        .from('evidence_attachments')
        .select('storage_path')
        .in('deficit_id', deficitIds)

      const photoPaths = (attachments ?? []).map((a) => a.storage_path as string).filter(Boolean)
      if (photoPaths.length > 0) {
        await supabaseAdmin.storage.from('evidence-photos').remove(photoPaths)
      }
    }

    // Delete PDF files — stored under {userId}/{protestId}/
    const { data: folders } = await supabaseAdmin.storage
      .from('protest-pdfs')
      .list(userId, { limit: 1000 })

    if (folders && folders.length > 0) {
      const allPdfPaths: string[] = []
      for (const folder of folders) {
        const { data: files } = await supabaseAdmin.storage
          .from('protest-pdfs')
          .list(`${userId}/${folder.name}`)
        if (files) {
          for (const f of files) {
            allPdfPaths.push(`${userId}/${folder.name}/${f.name}`)
          }
        }
      }
      if (allPdfPaths.length > 0) {
        await supabaseAdmin.storage.from('protest-pdfs').remove(allPdfPaths)
      }
    }

    // Delete protests — cascades to property_deficits and evidence_attachments
    await supabaseAdmin.from('protests').delete().eq('user_id', userId)
  }

  // Sign out first so the session cookie is cleared before the user record is gone
  await supabase.auth.signOut()

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (deleteError) return { error: deleteError.message }

  redirect('/')
}
