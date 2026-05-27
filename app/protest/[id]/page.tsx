import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProtestShell } from '@/components/protest/protest-shell'
import type { PropertyData, Deficit } from '@/lib/store/protest-store'

export default async function ProtestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [protestResult, deficitsResult] = await Promise.all([
    supabase
      .from('protests')
      .select(`
        id, status, argument_type, target_protest_value, estimated_savings, generated_pdf_url,
        properties (
          id, county_account_number, county_name, street_address, zip_code,
          owner_name, year_built, total_living_area_sqft, current_proposed_value,
          market_value_land, market_value_improvements, homestead_capped_value
        )
      `)
      .eq('id', id)
      .single(),

    supabase
      .from('property_deficits')
      .select('id, category, user_description, estimated_cost_to_cure')
      .eq('protest_id', id)
      .order('created_at'),
  ])

  if (protestResult.error || !protestResult.data || !protestResult.data.properties) {
    redirect('/dashboard')
  }

  const protest = protestResult.data
  const property = protest.properties as unknown as PropertyData
  const existingDeficits = (deficitsResult.data ?? []) as Deficit[]

  return (
    <ProtestShell
      protest={{
        id: protest.id,
        status: protest.status as 'auditing' | 'payment_pending' | 'processing_pdf' | 'completed_ready',
        argument_type: protest.argument_type as 'market_value' | 'equity' | 'both' | null,
        target_protest_value: protest.target_protest_value,
        estimated_savings: protest.estimated_savings,
        generated_pdf_url: protest.generated_pdf_url ?? null,
      }}
      property={property}
      userId={user.id}
      existingDeficits={existingDeficits}
    />
  )
}
