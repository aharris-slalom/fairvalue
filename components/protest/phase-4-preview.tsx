'use client'

import { useState } from 'react'
import { TrendingDown, Home, Wrench, DollarSign, Users, Loader2, X, Lock } from 'lucide-react'
import type { PropertyData } from '@/lib/store/protest-store'
import { useProtestStore } from '@/lib/store/protest-store'
import { generateEvidencePacket } from '@/lib/actions/generate-pdf'

interface Props {
  protestId?: string
  property: PropertyData
  isProcessing?: boolean
  previewMode?: boolean
  onPayClick?: () => void
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

function Row({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl ${
        highlight
          ? 'bg-primary/10 border border-primary/20'
          : 'bg-card shadow-editorial'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
            highlight ? 'bg-primary/20' : 'bg-muted'
          }`}
        >
          <Icon className={`h-4 w-4 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-medium ${highlight ? 'text-primary' : 'text-foreground'}`}>{label}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </div>
      <p className={`text-base font-bold tabular-nums shrink-0 ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  )
}

export function Phase4Preview({ protestId: _protestId, property, isProcessing, previewMode, onPayClick }: Props) {
  const targetProtestValue = useProtestStore((s) => s.targetProtestValue)
  const estimatedSavings = useProtestStore((s) => s.estimatedSavings)
  const equityTarget = useProtestStore((s) => s.equityTarget)
  const deficitTotal = useProtestStore((s) => s.deficitTotal)
  const compCount = useProtestStore((s) => s.compCount)

  const [showCheckout, setShowCheckout] = useState(false)
  const [paying, setPaying] = useState(false)
  const setPhase = useProtestStore((s) => s.setPhase)
  const setPdfUrl = useProtestStore((s) => s.setPdfUrl)

  async function runGeneration(protestId: string) {
    setPaying(true)
    setShowCheckout(false)
    const result = await generateEvidencePacket(protestId)
    setPaying(false)
    if (!result.error && result.pdfUrl) {
      setPdfUrl(result.pdfUrl)
      setPhase(5)
    }
  }

  async function handleMockPay() {
    if (!_protestId) return
    await runGeneration(_protestId)
  }

  async function handleRetry() {
    if (!_protestId) return
    await runGeneration(_protestId)
  }

  const hasResult = targetProtestValue !== null && estimatedSavings !== null

  if (paying) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Strategy Preview</p>
          <h1 className="font-heading text-2xl leading-snug text-foreground mt-1">{property.street_address}</h1>
        </div>
        <div className="rounded-2xl bg-card shadow-editorial p-10 flex flex-col items-center text-center gap-4">
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          <div className="space-y-1">
            <h2 className="font-heading text-lg text-foreground">Generating Your Evidence Packet…</h2>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Your professional evidence packet is being compiled. This usually takes under a minute.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isProcessing) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Strategy Preview</p>
          <h1 className="font-heading text-2xl leading-snug text-foreground mt-1">{property.street_address}</h1>
        </div>
        <div className="rounded-2xl bg-card shadow-editorial p-8 flex flex-col items-center text-center gap-5">
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-heading text-lg text-foreground">Your evidence packet is taking longer than expected.</h2>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              The PDF generation job did not complete. Click below to try again.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Retry PDF Generation
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Strategy Preview</p>
        <h1 className="text-xl font-bold text-foreground mt-1">{property.street_address}</h1>
      </div>

      {hasResult ? (
        <>
          <div className="space-y-2">
            <Row
              icon={Home}
              label="Current Proposed Value"
              value={fmt(property.current_proposed_value)}
              sub="HCAD's 2025 appraisal"
            />
            {equityTarget !== null && (
              <Row
                icon={Users}
                label="Equity Comp Target"
                value={fmt(equityTarget)}
                sub={compCount !== null ? `Median of ${compCount} comparable properties` : 'Comparable properties median'}
              />
            )}
            {deficitTotal !== null && deficitTotal > 0 && (
              <Row
                icon={Wrench}
                label="Documented Repair Deduction"
                value={`− ${fmt(deficitTotal)}`}
                sub="Logged defects & deficiencies"
              />
            )}
            <Row
              icon={TrendingDown}
              label="Target Protest Value"
              value={fmt(targetProtestValue!)}
              highlight
            />
          </div>

          <div className="rounded-2xl bg-primary/10 border border-primary/20 px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Estimated Annual Savings</p>
              <p className="font-heading text-3xl text-primary mt-0.5">{fmt(estimatedSavings!)}</p>
              <p className="text-xs text-muted-foreground mt-1">Based on {property.county_name} composite tax rate</p>
            </div>
            <DollarSign className="h-10 w-10 text-primary/25 shrink-0" />
          </div>

          <div className="rounded-2xl bg-card shadow-editorial p-5 space-y-4">
            <div className="space-y-1">
              <h2 className="font-heading text-lg text-foreground">Unlock Your Evidence Packet</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A $69 one-time payment generates your professional protest packet — formatted comps, condition exhibits,
                and a completed ARB filing ready to submit.
              </p>
            </div>
            <button
              type="button"
              onClick={() => previewMode ? onPayClick?.() : setShowCheckout(true)}
              className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Get My Evidence Packet — $69
            </button>
            <p className="text-xs text-muted-foreground text-center">Secure payment · Instant delivery</p>

          {/* Mock checkout modal — authenticated mode */}
          {showCheckout && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 py-4 overflow-y-auto">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="checkout-title"
                className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 space-y-5 shadow-2xl"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs font-semibold text-yellow-600 mb-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                      Test Mode — No real charge
                    </div>
                    <h2 id="checkout-title" className="text-base font-bold text-foreground">Evidence Packet · $69</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">FairValue · {property.street_address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCheckout(false)}
                    aria-label="Close"
                    className="rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Fake card form */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Name on card</label>
                    <input
                      type="text"
                      defaultValue="Jane Homeowner"
                      className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Card number</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      defaultValue="4242 4242 4242 4242"
                      className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-muted-foreground">Expiry</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        defaultValue="12/29"
                        className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium text-muted-foreground">CVV</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        defaultValue="123"
                        className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={paying}
                  onClick={handleMockPay}
                  className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {paying ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Lock className="h-3.5 w-3.5" /> Pay $69
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
          </div>
        </>
      ) : (
        <div className="rounded-2xl bg-card shadow-editorial p-10 flex flex-col items-center text-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
            <TrendingDown className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-heading text-lg text-foreground">Value Summary</h2>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Complete the home audit to see your target protest value and estimated annual savings.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
