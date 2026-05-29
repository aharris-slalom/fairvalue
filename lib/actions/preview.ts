'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { COUNTY_TAX_RATES } from '@/config/tax-rates'
import type { ArgumentType } from '@/lib/store/protest-store'
import { lockProtestValue } from './computation'
import { generateEvidencePacket } from './generate-pdf'
import { saveAuditNarrative } from './narrative'

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

export interface PreviewResult {
  equityTarget: number
  deficitTotal: number
  targetValue: number
  estimatedSavings: number
  compCount: number
  error?: string
}

export async function previewEquityTarget(
  propertyId: string,
  deficits: Array<{ estimated_cost_to_cure: number }>,
  sqftOverride?: number
): Promise<PreviewResult> {
  const { data: prop } = await supabaseAdmin
    .from('properties')
    .select('id, zip_code, year_built, total_living_area_sqft, current_proposed_value, county_name')
    .eq('id', propertyId)
    .single()

  if (!prop) return { equityTarget: 0, deficitTotal: 0, targetValue: 0, estimatedSavings: 0, compCount: 0, error: 'property not found' }

  const sqft = (sqftOverride && sqftOverride > 0) ? sqftOverride : prop.total_living_area_sqft
  const hasSqft = sqft > 0

  let compsQuery = supabaseAdmin
    .from('properties')
    .select('current_proposed_value, total_living_area_sqft')
    .eq('zip_code', prop.zip_code)
    .gt('current_proposed_value', 0)
    .neq('id', prop.id)
    .limit(200)

  if (hasSqft) {
    compsQuery = compsQuery
      .gte('total_living_area_sqft', sqft * 0.85)
      .lte('total_living_area_sqft', sqft * 1.15)
      .gt('total_living_area_sqft', 0)
    if (prop.year_built) {
      compsQuery = compsQuery
        .gte('year_built', prop.year_built - 5)
        .lte('year_built', prop.year_built + 5)
    }
  } else {
    compsQuery = compsQuery
      .gte('current_proposed_value', prop.current_proposed_value * 0.70)
      .lte('current_proposed_value', prop.current_proposed_value * 1.30)
  }

  const { data: comps } = await compsQuery

  let equityTarget: number
  if (hasSqft) {
    const rates = (comps ?? []).map((c) => c.current_proposed_value / c.total_living_area_sqft)
    const medianRate = rates.length > 0 ? median(rates) : prop.current_proposed_value / sqft
    equityTarget = Math.round(medianRate * sqft)
  } else {
    const values = (comps ?? []).map((c) => c.current_proposed_value)
    equityTarget = values.length > 0 ? Math.round(median(values)) : prop.current_proposed_value
  }

  const deficitTotal = deficits.reduce((sum, d) => sum + d.estimated_cost_to_cure, 0)
  const targetValue = Math.max(Math.round(equityTarget - deficitTotal), 0)
  const taxRate = COUNTY_TAX_RATES[prop.county_name.toLowerCase()] ?? 0.02
  const estimatedSavings = Math.max(Math.round((prop.current_proposed_value - targetValue) * taxRate), 0)

  return { equityTarget, deficitTotal, targetValue, estimatedSavings, compCount: comps?.length ?? 0 }
}

export interface ClaimResult {
  protestId: string
  pdfUrl: string
  error?: string
}

export async function claimPreviewSession(
  propertyId: string,
  argumentType: ArgumentType,
  deficits: Array<{ category: string; user_description: string; estimated_cost_to_cure: number }>,
  transcript?: string
): Promise<ClaimResult | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthenticated' }

  // Create protest record
  const { data: protest, error: protestError } = await supabase
    .from('protests')
    .insert({ user_id: user.id, property_id: propertyId, argument_type: argumentType })
    .select('id')
    .single()

  if (protestError || !protest) return { error: protestError?.message ?? 'failed to create protest' }

  // Save deficits
  if (deficits.length > 0) {
    await supabaseAdmin.from('property_deficits').insert(
      deficits.map((d) => ({ protest_id: protest.id, ...d }))
    )
  }

  // Run computation + narrative in parallel
  const [computation] = await Promise.all([
    lockProtestValue(protest.id),
    transcript ? saveAuditNarrative(protest.id, transcript) : Promise.resolve({ narrative: undefined }),
  ])
  if (computation.error) return { error: computation.error }

  // Generate PDF (sets status = completed_ready + stores pdf url)
  const pdf = await generateEvidencePacket(protest.id)
  if (pdf.error || !pdf.pdfUrl) return { error: pdf.error ?? 'pdf generation failed' }

  return { protestId: protest.id, pdfUrl: pdf.pdfUrl }
}
