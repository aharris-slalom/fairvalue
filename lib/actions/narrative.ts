'use server'

import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const SYSTEM_PROMPT = `You are a professional property tax protest specialist drafting a formal "Owner's Statement of Property Condition" for use in a Texas property tax protest proceeding before the Appraisal Review Board.

Convert the audit conversation below into a concise, first-person declaration in the property owner's voice. Rules:
- Address the 8 home systems in this exact order: Foundation, Roof, HVAC, Plumbing, Electrical, Windows & Doors, Interior, Exterior
- For systems with no issues, write one brief sentence only: "The [system] is in good condition with no issues to report."
- For systems with documented defects, describe the condition clearly and factually in 2–3 sentences. Mention repair cost estimates where they appeared in the conversation.
- Professional, declarative tone — this is a sworn legal attestation, not casual writing
- Begin the body (after a blank line) with: "I, the undersigned property owner, hereby declare the following regarding the condition of the property located at the above address, as of the date of this protest:"
- Close the statement with: "I declare under penalty of perjury under the laws of the State of Texas that the foregoing is true and correct to the best of my knowledge."
- Total length: 400–600 words
- Output ONLY the statement body — no preamble, no commentary, no markdown formatting`

export async function saveAuditNarrative(
  protestId: string,
  transcript: string
): Promise<{ narrative?: string; error?: string }> {
  if (!transcript.trim()) return { error: 'empty transcript' }

  try {
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcript }],
      maxOutputTokens: 900,
    })

    const narrative = text.trim()

    const { error: dbError } = await supabaseAdmin
      .from('protests')
      .update({ audit_narrative: narrative, updated_at: new Date().toISOString() })
      .eq('id', protestId)

    if (dbError) {
      console.error('[saveAuditNarrative] db error:', dbError.message)
      return { error: dbError.message }
    }

    return { narrative }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[saveAuditNarrative]', message)
    return { error: message }
  }
}
