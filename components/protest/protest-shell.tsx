'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useProtestStore } from '@/lib/store/protest-store'
import type { PropertyData, ArgumentType, Phase, ProtestStatus, Deficit } from '@/lib/store/protest-store'
import { Phase2Argument } from './phase-2-argument'
import { Phase3Audit } from './phase-3-audit'
import { Phase4Preview } from './phase-4-preview'
import { Phase5Delivery } from './phase-5-delivery'

function derivePhase(status: ProtestStatus, argumentType: ArgumentType | null): Phase {
  if (status === 'completed_ready') return 5
  if (status === 'processing_pdf') return 4
  if (status === 'payment_pending') return 4
  if (argumentType !== null) return 3
  return 2
}

const PHASE_LABELS: Record<Phase, string> = {
  2: 'Choose Your Argument',
  3: 'Home Audit',
  4: 'Review & Pay',
  5: 'Download Files',
}

interface ProtestData {
  id: string
  status: ProtestStatus
  argument_type: ArgumentType | null
  target_protest_value: number | null
  estimated_savings: number | null
  generated_pdf_url: string | null
}

interface Props {
  protest: ProtestData
  property: PropertyData
  userId: string
  existingDeficits: Deficit[]
}

export function ProtestShell({ protest, property, userId, existingDeficits }: Props) {
  const init = useProtestStore((s) => s.init)
  const phase = useProtestStore((s) => s.phase)
  const setPhase = useProtestStore((s) => s.setPhase)

  const initialPhase = derivePhase(protest.status, protest.argument_type)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    init(protest.id, property, initialPhase, protest.argument_type, protest.target_protest_value, protest.estimated_savings, protest.generated_pdf_url)
    setMounted(true)
  }, [protest.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentPhase: Phase = mounted ? phase : initialPhase

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-border px-4 py-3.5 flex items-center justify-between">
        <Link href="/" className="text-base font-bold text-foreground tracking-tight">
          FairValue
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {PHASE_LABELS[currentPhase]}
          </span>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            My Protests
          </Link>
        </div>
      </header>

      <main className={`flex-1 px-4 max-w-2xl mx-auto w-full ${currentPhase === 3 ? 'py-4' : 'py-8'}`}>
        {currentPhase === 2 && (
          <Phase2Argument
            protestId={protest.id}
            property={property}
            onAdvance={() => setPhase(3)}
          />
        )}
        {currentPhase === 3 && (
          <Phase3Audit
            protestId={protest.id}
            property={property}
            userId={userId}
            existingDeficits={existingDeficits}
          />
        )}
        {currentPhase === 4 && (
          <Phase4Preview
            protestId={protest.id}
            property={property}
            isProcessing={protest.status === 'processing_pdf'}
          />
        )}
        {currentPhase === 5 && (
          <Phase5Delivery protestId={protest.id} />
        )}
      </main>
    </div>
  )
}
