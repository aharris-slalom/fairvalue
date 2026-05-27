import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { PreviewShell } from '@/components/protest/preview-shell'
import type { PropertyData } from '@/lib/store/protest-store'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function getMapImageUrl(address: string, zipCode: string): Promise<string | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  if (!token) return null

  const query = encodeURIComponent(`${address}, ${zipCode}, Texas, US`)
  const geoRes = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}&limit=1&country=US`,
    { next: { revalidate: 86400 } }
  )
  if (!geoRes.ok) return null

  const geoData = await geoRes.json()
  const center = geoData.features?.[0]?.center as [number, number] | undefined
  if (!center) return null

  const [lon, lat] = center
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/pin-s+ffffff(${lon},${lat})/${lon},${lat},18,0/700x280@2x?access_token=${token}`
}

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params

  const { data: property } = await supabaseAdmin
    .from('properties')
    .select(`
      id, county_account_number, county_name, street_address, zip_code,
      owner_name, year_built, total_living_area_sqft, current_proposed_value,
      market_value_land, market_value_improvements, homestead_capped_value
    `)
    .eq('id', propertyId)
    .single()

  if (!property) notFound()

  const mapImageUrl = await getMapImageUrl(property.street_address, property.zip_code)

  return <PreviewShell property={property as PropertyData} mapImageUrl={mapImageUrl} />
}
