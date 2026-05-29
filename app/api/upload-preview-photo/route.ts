import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const propertyId = formData.get('propertyId') as string | null

  if (!file || !propertyId) {
    return Response.json({ error: 'missing file or propertyId' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const storagePath = `temp/${propertyId}/${crypto.randomUUID()}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from('evidence-photos')
    .upload(storagePath, buffer, { contentType: file.type || 'image/jpeg', upsert: false })

  if (error) {
    console.error('[upload-preview-photo]', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ storagePath })
}
