import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Use service role to bypass RLS — properties are public county records
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 3 || q.length > 120) {
    return NextResponse.json({ properties: [] })
  }

  const { data, error } = await supabaseAdmin
    .from('properties')
    .select('id, street_address, zip_code, county_name, current_proposed_value')
    .ilike('street_address', `${q}%`)
    .order('street_address')
    .limit(8)

  if (error) return NextResponse.json({ properties: [] })
  return NextResponse.json({ properties: data ?? [] })
}
