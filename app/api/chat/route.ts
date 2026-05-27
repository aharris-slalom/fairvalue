import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { buildAuditSystemPrompt } from '@/lib/prompts/audit'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const MAX_MESSAGES = 60
const MAX_BODY_BYTES = 32_000

export async function POST(request: Request) {
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return new Response('Request too large', { status: 413 })
  }

  const body = await request.json()
  const { messages, protestId, propertyId, mode, argumentType } = body

  if (!Array.isArray(messages) || messages.length > MAX_MESSAGES) {
    return new Response('Invalid messages', { status: 400 })
  }

  const isPreview = mode === 'preview'

  let property: {
    street_address: string
    zip_code: string
    county_name: string
    year_built: number | null
    total_living_area_sqft: number
    current_proposed_value: number
  }
  let resolvedArgumentType: 'market_value' | 'equity' | 'both' | null = argumentType ?? null

  if (isPreview) {
    // Preview mode: no auth required, load property directly
    const { data: prop } = await supabaseAdmin
      .from('properties')
      .select('street_address, zip_code, county_name, year_built, total_living_area_sqft, current_proposed_value')
      .eq('id', propertyId)
      .single()
    if (!prop) return new Response('Property not found', { status: 404 })
    property = prop as unknown as typeof property
  } else {
    // Authenticated mode: verify user owns the protest
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[chat] auth result — user:', user?.id ?? 'none', '| error:', authError?.message ?? 'none')
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { data: protest, error } = await supabase
      .from('protests')
      .select(`
        id, argument_type,
        properties (
          street_address, zip_code, county_name,
          year_built, total_living_area_sqft, current_proposed_value
        )
      `)
      .eq('id', protestId)
      .single()

    if (error || !protest?.properties) return new Response('Protest not found', { status: 404 })
    property = protest.properties as unknown as typeof property
    resolvedArgumentType = protest.argument_type as typeof resolvedArgumentType
  }

  const systemPrompt = buildAuditSystemPrompt(property, resolvedArgumentType)

  try {
    const result = streamText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      maxOutputTokens: 500,
      stopWhen: stepCountIs(20),
      tools: {
        signal_audit_complete: tool({
          description: 'Signal that the home condition audit is complete — all major categories have been covered. Call this once, after going through all 8 categories.',
          inputSchema: z.object({
            summary: z.string().describe('2–3 sentence summary of what was documented'),
            total_deficits_logged: z.number().int().describe('Total number of deficits that were logged during this audit'),
          }),
          execute: async ({ summary, total_deficits_logged }) => {
            return { success: true, summary, total_deficits_logged }
          },
        }),
        log_deficit: tool({
          description: 'Log a documented property defect or deficiency to the official protest record.',
          inputSchema: z.object({
            category: z
              .enum([
                'Foundation',
                'Roof',
                'HVAC',
                'Plumbing',
                'Electrical',
                'Windows & Doors',
                'Interior',
                'Exterior',
                'Other',
              ])
              .describe('The system or area of the home affected'),
            user_description: z
              .string()
              .describe('Clear description of the defect in the homeowner\'s own words'),
            estimated_cost_to_cure: z
              .number()
              .describe('Estimated repair or replacement cost in US dollars'),
          }),
          execute: async ({ category, user_description, estimated_cost_to_cure }) => {
            if (isPreview) {
              // In preview mode: don't write to DB — client stores in Zustand
              return {
                success: true,
                deficitId: `preview-${crypto.randomUUID()}`,
                category,
                user_description,
                estimated_cost_to_cure,
              }
            }

            const { data, error: dbError } = await supabaseAdmin
              .from('property_deficits')
              .insert({ protest_id: protestId, category, user_description, estimated_cost_to_cure })
              .select('id')
              .single()

            if (dbError || !data) return { success: false, error: dbError?.message }
            return { success: true, deficitId: data.id }
          },
        }),
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err)
    console.error('[chat route]', message)
    return new Response(message, { status: 500 })
  }
}
