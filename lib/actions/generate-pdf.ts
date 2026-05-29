'use server'

import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { EvidencePacket, type EvidencePhoto } from '@/components/pdf/evidence-packet'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function mimeTypeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'png') return 'image/png'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'webp') return 'image/webp'
  return 'image/jpeg'
}

const EXHIBIT_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

async function fetchPhotos(
  deficitList: { id?: string; category: string; user_description: string }[]
): Promise<EvidencePhoto[]> {
  const deficitIds = deficitList.filter((d) => d.id).map((d) => d.id as string)
  if (deficitIds.length === 0) return []

  // Build deficit id → metadata map
  const deficitMap = new Map<string, { category: string; description: string }>()
  for (const d of deficitList) {
    if (d.id) deficitMap.set(d.id, { category: d.category, description: d.user_description })
  }

  // Fetch only photo attachments belonging to this protest's deficits
  const { data: attachments, error: attachError } = await supabaseAdmin
    .from('evidence_attachments')
    .select('id, deficit_id, storage_path, attachment_type, uploaded_at')
    .eq('attachment_type', 'photo')
    .in('deficit_id', deficitIds)
    .order('uploaded_at')

  if (attachError) {
    console.error('[fetchPhotos] query error:', attachError.message)
    return []
  }
  console.log(`[fetchPhotos] deficitIds=${deficitIds.length} attachments=${attachments?.length ?? 0}`)
  if (!attachments || attachments.length === 0) return []

  const relevant = attachments

  const photos: EvidencePhoto[] = []

  for (let i = 0; i < relevant.length; i++) {
    const att = relevant[i]
    const deficit = deficitMap.get(att.deficit_id)
    if (!deficit) continue

    try {
      // Generate a short-lived signed URL to fetch the image
      const { data: signed } = await supabaseAdmin.storage
        .from('evidence-photos')
        .createSignedUrl(att.storage_path, 60)

      if (!signed?.signedUrl) continue

      const res = await fetch(signed.signedUrl)
      if (!res.ok) continue

      const buffer = Buffer.from(await res.arrayBuffer())
      const mime = mimeTypeFromPath(att.storage_path)
      const dataUri = `data:${mime};base64,${buffer.toString('base64')}`

      const label = EXHIBIT_LABELS[i] ?? `${i + 1}`
      const uploadedAt = new Date(att.uploaded_at).toUTCString()

      photos.push({
        exhibitId: `Exhibit C-${label}`,
        deficitId: att.deficit_id,
        deficitCategory: deficit.category,
        description: deficit.description,
        uploadedAt,
        dataUri,
      })
    } catch {
      // Skip photos that fail to fetch — don't abort the whole packet
    }
  }

  return photos
}

export async function generateEvidencePacket(
  protestId: string
): Promise<{ pdfUrl?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthenticated' }

  // Fetch protest + property
  const { data: protest } = await supabase
    .from('protests')
    .select(`
      id, argument_type, target_protest_value, estimated_savings, audit_narrative,
      properties (
        id, county_account_number, county_name, street_address, zip_code,
        owner_name, year_built, total_living_area_sqft, current_proposed_value
      )
    `)
    .eq('id', protestId)
    .eq('user_id', user.id)
    .single()

  if (!protest?.properties) return { error: 'protest not found' }

  const prop = protest.properties as unknown as {
    id: string
    county_account_number: string
    county_name: string
    street_address: string
    zip_code: string
    owner_name: string | null
    year_built: number | null
    total_living_area_sqft: number
    current_proposed_value: number
  }

  // Fetch deficits (with id for photo lookup) — use admin client to avoid RLS auth edge cases
  const { data: deficits, error: deficitsError } = await supabaseAdmin
    .from('property_deficits')
    .select('id, category, user_description, estimated_cost_to_cure')
    .eq('protest_id', protestId)
    .order('created_at')

  const hasNarrative = !!(protest as unknown as { audit_narrative: string | null }).audit_narrative
  console.log(`[generateEvidencePacket] protestId=${protestId} deficits=${deficits?.length ?? 0} deficitsError=${deficitsError?.message ?? 'none'} narrative=${hasNarrative ? 'yes' : 'no'}`)

  const deficitList = deficits ?? []
  const deficitTotal = deficitList.reduce((sum, d) => sum + d.estimated_cost_to_cure, 0)

  // Re-run comp query
  const hasSqft = prop.total_living_area_sqft > 0

  let compsQuery = supabaseAdmin
    .from('properties')
    .select('street_address, zip_code, total_living_area_sqft, current_proposed_value')
    .eq('zip_code', prop.zip_code)
    .gt('current_proposed_value', 0)
    .neq('id', prop.id)
    .limit(200)

  if (hasSqft) {
    const sqftLow = prop.total_living_area_sqft * 0.85
    const sqftHigh = prop.total_living_area_sqft * 1.15
    compsQuery = compsQuery
      .gte('total_living_area_sqft', sqftLow)
      .lte('total_living_area_sqft', sqftHigh)
      .gt('total_living_area_sqft', 0)
    if (prop.year_built) {
      compsQuery = compsQuery
        .gte('year_built', prop.year_built - 5)
        .lte('year_built', prop.year_built + 5)
    }
  } else {
    const valueLow  = prop.current_proposed_value * 0.70
    const valueHigh = prop.current_proposed_value * 1.30
    compsQuery = compsQuery
      .gte('current_proposed_value', valueLow)
      .lte('current_proposed_value', valueHigh)
  }

  const { data: comps } = await compsQuery
  const compList = comps ?? []

  let equityTarget: number
  if (hasSqft) {
    const rates = compList.map((c) => c.current_proposed_value / c.total_living_area_sqft)
    const medianRate = rates.length > 0
      ? median(rates)
      : prop.current_proposed_value / prop.total_living_area_sqft
    equityTarget = Math.round(medianRate * prop.total_living_area_sqft)
  } else {
    const values = compList.map((c) => c.current_proposed_value)
    equityTarget = values.length > 0
      ? Math.round(median(values))
      : prop.current_proposed_value
  }

  const targetValue = protest.target_protest_value ?? Math.max(equityTarget - deficitTotal, 0)
  const estimatedSavings = protest.estimated_savings ?? 0
  const argumentType = (protest.argument_type ?? 'both') as 'market_value' | 'equity' | 'both'
  const auditNarrative = (protest as unknown as { audit_narrative: string | null }).audit_narrative ?? null

  const preparedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // Fetch photo evidence for annex
  const photos = await fetchPhotos(deficitList)

  // ── Render evidence packet ────────────────────────────────────────────────
  const packetBuffer = await renderToBuffer(
    createElement(EvidencePacket, {
      address: prop.street_address,
      countyAccountNumber: prop.county_account_number,
      countyName: prop.county_name,
      yearBuilt: prop.year_built,
      sqft: prop.total_living_area_sqft,
      currentValue: prop.current_proposed_value,
      equityTarget,
      deficitTotal,
      targetValue: Number(targetValue),
      estimatedSavings: Number(estimatedSavings),
      compCount: compList.length,
      comps: compList,
      deficits: deficitList,
      photos,
      preparedDate,
      argumentType,
      taxYear: '2025',
      ownerName: prop.owner_name,
      auditNarrative,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
  )

  // ── Upload to Supabase Storage ────────────────────────────────────────────
  const packetPath = `${user.id}/${protestId}/protest-packet.pdf`

  const packetUpload = await supabaseAdmin.storage
    .from('protest-pdfs')
    .upload(packetPath, packetBuffer, { contentType: 'application/pdf', upsert: true })

  if (packetUpload.error) return { error: packetUpload.error.message }

  // ── Generate 7-day signed URL ─────────────────────────────────────────────
  const packetSigned = await supabaseAdmin.storage
    .from('protest-pdfs')
    .createSignedUrl(packetPath, 60 * 60 * 24 * 7)

  if (!packetSigned.data?.signedUrl) return { error: 'signed url failed' }

  // ── Advance protest to completed_ready, store URL ─────────────────────────
  const { error: updateError } = await supabaseAdmin
    .from('protests')
    .update({
      status: 'completed_ready',
      generated_pdf_url: packetSigned.data.signedUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', protestId)

  if (updateError) console.error('[generateEvidencePacket] db update error:', updateError.message)

  return { pdfUrl: packetSigned.data.signedUrl }
}
