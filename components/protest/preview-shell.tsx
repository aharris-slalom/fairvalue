'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useProtestStore } from '@/lib/store/protest-store'
import type { PropertyData } from '@/lib/store/protest-store'
import { previewEquityTarget } from '@/lib/actions/preview'
import { Phase2Argument } from './phase-2-argument'
import { Phase3Audit } from './phase-3-audit'
import { Phase4Preview } from './phase-4-preview'
import { Phase5Delivery } from './phase-5-delivery'
import { AuthGateModal } from './auth-gate-modal'

type PreviewPhase = 2 | 3 | 4 | 5

const PHASE_LABELS: Record<PreviewPhase, string> = {
  2: 'Choose Your Argument',
  3: 'Home Audit',
  4: 'Review & Get Packet',
  5: 'Download Files',
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

const CHECKLIST = [
  'Walk through your home room by room, noting anything that affects its value',
  'Document defects, deferred repairs, and conditions a buyer would negotiate on',
  'Compile everything into a professional evidence packet, ready to file with the ARB',
]

interface Props {
  property: PropertyData
  mapImageUrl?: string | null
}

export function PreviewShell({ property, mapImageUrl }: Props) {
  const [phase, setPhase] = useState<PreviewPhase>(2)
  const [showIntro, setShowIntro] = useState(true)
  const [showAuthGate, setShowAuthGate] = useState(false)

  // Initialize Zustand with property data (no protest ID or DB state)
  const init = useProtestStore((s) => s.init)
  const setTargetValue = useProtestStore((s) => s.setTargetValue)
  const setPdfUrl = useProtestStore((s) => s.setPdfUrl)
  const argumentType = useProtestStore((s) => s.argumentType)
  const deficits = useProtestStore((s) => s.deficits)
  const storeProperty = useProtestStore((s) => s.property)

  useEffect(() => {
    init('preview', property, 2, null)
  }, [property.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePreviewFinish(currentDeficits: typeof deficits) {
    const sqft = storeProperty?.total_living_area_sqft ?? property.total_living_area_sqft
    const result = await previewEquityTarget(property.id, currentDeficits, sqft)
    if (!result.error) {
      setTargetValue(result.targetValue, result.estimatedSavings, result.equityTarget, result.deficitTotal, result.compCount)
    }
    setPhase(4)
  }

  function handleAuthComplete(pdfUrl: string) {
    setShowAuthGate(false)
    setPdfUrl(pdfUrl)
    setPhase(5)
  }

  if (showIntro) {
    return (
      <div className="min-h-dvh flex flex-col bg-background">
        <header className="border-b border-border px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-heading text-lg text-foreground">
            FairValue
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sign in
          </Link>
        </header>

        <main className="flex-1 flex flex-col justify-center px-6 py-14 max-w-lg mx-auto w-full space-y-10">

          {/* Map */}
          {mapImageUrl && (
            <div className="-mx-6 overflow-hidden rounded-2xl">
              <img
                src={mapImageUrl}
                alt={`Map showing ${property.street_address}`}
                className="w-full object-cover"
                width={700}
                height={280}
              />
            </div>
          )}

          {/* Property identity */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {property.county_name.charAt(0).toUpperCase() + property.county_name.slice(1)}{' '}County
              &nbsp;·&nbsp;
              {fmt(property.current_proposed_value)}{' '}assessed
            </p>
            <h1 className="font-heading text-3xl leading-snug text-foreground">
              {property.street_address}
            </h1>
          </div>

          {/* Assistant intro */}
          <div className="space-y-6">
            <div className="w-8 h-px bg-espresso" />
            <div className="space-y-2">
              <p className="font-medium text-foreground">
                Your protest case starts here.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every scratch, worn fixture, and deferred repair is potential money back in your pocket.
                Here&rsquo;s what we&rsquo;ll do together:
              </p>
            </div>

            <ul className="space-y-4">
              {CHECKLIST.map((item, i) => (
                <li key={item} className="flex items-start gap-4">
                  <span className="font-heading italic text-primary text-2xl leading-none shrink-0 w-5 select-none">
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground leading-relaxed pt-0.5">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowIntro(false)}
              className="w-full rounded-xl bg-primary text-primary-foreground py-4 text-sm font-semibold hover:bg-primary/90 active:scale-[0.97] transition-all duration-200 ease-out"
            >
              Let&rsquo;s get started
            </button>
            <p className="text-xs text-center text-muted-foreground">
              No account required — you can check out as a guest.
            </p>
          </div>

        </main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-heading text-lg text-foreground">
          FairValue
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {PHASE_LABELS[phase]}
          </span>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className={`flex-1 px-4 max-w-2xl mx-auto w-full ${phase === 3 ? 'py-4' : 'py-8'}`}>
        {phase === 2 && (
          <Phase2Argument
            property={property}
            onAdvance={() => setPhase(3)}
            previewMode
          />
        )}
        {phase === 3 && (
          <Phase3Audit
            property={property}
            previewMode={{ propertyId: property.id, argumentType }}
            onPreviewFinish={handlePreviewFinish}
          />
        )}
        {phase === 4 && (
          <Phase4Preview
            property={property}
            previewMode
            onPayClick={() => setShowAuthGate(true)}
          />
        )}
        {phase === 5 && (
          <Phase5Delivery protestId="preview" />
        )}
      </main>

      {showAuthGate && (
        <AuthGateModal
          propertyId={property.id}
          argumentType={argumentType ?? 'equity'}
          deficits={deficits}
          onComplete={handleAuthComplete}
          onClose={() => setShowAuthGate(false)}
        />
      )}
    </div>
  )
}
