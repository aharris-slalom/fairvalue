'use server'

import { createClient } from '@/lib/supabase/server'
import { COUNTY_TAX_RATES } from '@/config/tax-rates'

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export interface ComputationResult {
  targetValue: number
  savings: number
  equityTarget: number
  deficitTotal: number
  compCount: number
  error?: string
}

export async function lockProtestValue(protestId: string): Promise<ComputationResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { targetValue: 0, savings: 0, equityTarget: 0, deficitTotal: 0, compCount: 0, error: 'unauthenticated' }

  // Fetch protest + property (RLS ensures user owns this protest)
  const { data: protest } = await supabase
    .from('protests')
    .select(`
      id,
      properties (
        id, zip_code, year_built, total_living_area_sqft,
        current_proposed_value, county_name
      )
    `)
    .eq('id', protestId)
    .eq('user_id', user.id)
    .single()

  if (!protest?.properties) {
    return { targetValue: 0, savings: 0, equityTarget: 0, deficitTotal: 0, compCount: 0, error: 'protest not found' }
  }

  const prop = protest.properties as unknown as {
    id: string
    zip_code: string
    year_built: number | null
    total_living_area_sqft: number
    current_proposed_value: number
    county_name: string
  }

  // Equity comp query — prefer sqft ±15% + year_built ±5 when available,
  // fall back to value range ±30% when sqft data is absent (sqft stored as 0).
  const hasSqft = prop.total_living_area_sqft > 0

  let compsQuery = supabase
    .from('properties')
    .select('current_proposed_value, total_living_area_sqft')
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

  // Equity target: median $/sqft × subject sqft (when sqft known),
  // or median comp value directly (when sqft absent).
  let equityTarget: number
  if (hasSqft) {
    const rates = (comps ?? []).map((c) => c.current_proposed_value / c.total_living_area_sqft)
    const medianRate = rates.length > 0
      ? median(rates)
      : prop.current_proposed_value / prop.total_living_area_sqft
    equityTarget = Math.round(medianRate * prop.total_living_area_sqft)
  } else {
    const values = (comps ?? []).map((c) => c.current_proposed_value)
    equityTarget = values.length > 0
      ? Math.round(median(values))
      : prop.current_proposed_value
  }

  // Sum all documented deficits for this protest
  const { data: deficits } = await supabase
    .from('property_deficits')
    .select('estimated_cost_to_cure')
    .eq('protest_id', protestId)

  const deficitTotal = (deficits ?? []).reduce((sum, d) => sum + d.estimated_cost_to_cure, 0)

  // Target value = equity comp target minus documented repair costs, floored at 0
  const targetValue = Math.max(Math.round(equityTarget - deficitTotal), 0)

  // Estimated annual savings using county composite tax rate
  const taxRate = COUNTY_TAX_RATES[prop.county_name.toLowerCase()] ?? 0.02
  const savings = Math.max(Math.round((prop.current_proposed_value - targetValue) * taxRate), 0)

  // Persist to protest row and advance status
  await supabase
    .from('protests')
    .update({
      target_protest_value: targetValue,
      estimated_savings: savings,
      status: 'payment_pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', protestId)
    .eq('user_id', user.id)

  return {
    targetValue,
    savings,
    equityTarget,
    deficitTotal,
    compCount: comps?.length ?? 0,
  }
}
