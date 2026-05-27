'use client'

import { useState, useRef } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { selectArgument } from '@/lib/actions/property'
import { useProtestStore } from '@/lib/store/protest-store'
import type { PropertyData, ArgumentType } from '@/lib/store/protest-store'
import { toast } from 'sonner'

interface Props {
  protestId?: string
  property: PropertyData
  onAdvance: () => void
  previewMode?: boolean
}


const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

export function Phase2Argument({ protestId, property, onAdvance, previewMode }: Props) {
  const [selecting, setSelecting] = useState<ArgumentType | null>(null)
  const setArgumentType = useProtestStore((s) => s.setArgumentType)
  const updatePropertySqft = useProtestStore((s) => s.updatePropertySqft)

  const isSqftMissing = property.total_living_area_sqft === 0
  const [editingSqft, setEditingSqft] = useState(isSqftMissing)
  const [sqftInput, setSqftInput] = useState(isSqftMissing ? '' : String(property.total_living_area_sqft))
  const [displaySqft, setDisplaySqft] = useState(property.total_living_area_sqft)
  const sqftInputRef = useRef<HTMLInputElement>(null)

  function commitSqft() {
    const val = parseInt(sqftInput, 10)
    if (!val || val <= 0) {
      toast.error('Please enter a valid square footage.')
      sqftInputRef.current?.focus()
      return
    }
    setDisplaySqft(val)
    updatePropertySqft(val)
    setEditingSqft(false)
  }

  function cancelSqft() {
    if (isSqftMissing && displaySqft === 0) return
    setSqftInput(String(displaySqft))
    setEditingSqft(false)
  }

  const ratePerSqft = displaySqft > 0
    ? (property.current_proposed_value / displaySqft).toFixed(2)
    : null
  const countyDisplay =
    property.county_name.charAt(0).toUpperCase() + property.county_name.slice(1)

  async function handleSelect(type: ArgumentType) {
    setSelecting(type)
    if (!previewMode && protestId) {
      const result = await selectArgument(protestId, type)
      if ('error' in result) {
        toast.error('Something went wrong. Please try again.')
        setSelecting(null)
        return
      }
    }
    setArgumentType(type)
    onAdvance()
  }

  return (
    <div className="space-y-7">
      {/* Property summary */}
      <div className="rounded-2xl bg-card shadow-editorial p-6 space-y-5">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Your Property
          </p>
          <h1 className="font-heading text-2xl leading-snug text-foreground">
            {property.street_address}
          </h1>
          <p className="text-sm text-muted-foreground">
            {property.zip_code} · {countyDisplay} County
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-secondary px-3 py-2.5">
            <p className="text-xs text-muted-foreground">2025 Assessment</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              {fmt(property.current_proposed_value)}
            </p>
          </div>
          <div className="rounded-xl bg-secondary px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Living Area</p>
            {editingSqft ? (
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  ref={sqftInputRef}
                  type="number"
                  min={1}
                  value={sqftInput}
                  onChange={(e) => setSqftInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { commitSqft(); return }
                    if (e.key === 'Escape') { cancelSqft(); return }
                    if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault()
                  }}
                  placeholder="e.g. 2400"
                  autoFocus
                  className="w-20 text-sm font-semibold bg-transparent text-foreground border-b border-primary focus:outline-none placeholder:text-muted-foreground/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button onClick={commitSqft} className="text-primary hover:text-primary/80 transition-colors"><Check className="h-3.5 w-3.5" /></button>
                {!isSqftMissing && <button onClick={cancelSqft} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-3.5 w-3.5" /></button>}
              </div>
            ) : (
              <button
                onClick={() => { setSqftInput(String(displaySqft)); setEditingSqft(true) }}
                className="flex items-center gap-1.5 mt-0.5 group"
              >
                <span className="text-sm font-semibold text-foreground">{displaySqft.toLocaleString()} sqft</span>
                <Pencil className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              </button>
            )}
          </div>
          {ratePerSqft && (
            <div className="rounded-xl bg-secondary px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Rate / Sqft</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">${ratePerSqft}</p>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
          <p className="text-sm text-foreground leading-relaxed">
            {ratePerSqft
              ? <>Your home is assessed at <span className="font-semibold text-primary">${ratePerSqft}/sqft</span>{property.year_built ? ` · Built ${property.year_built}` : ''}. </>
              : <>Your home is assessed at <span className="font-semibold text-primary">{fmt(property.current_proposed_value)}</span>. </>
            }
            We&rsquo;ll compare this against similar homes in your area to build your strongest case.
          </p>
        </div>
      </div>

      {/* Argument selection */}
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="w-6 h-px bg-espresso" />
          <h2 className="font-heading text-xl text-foreground">
            We&rsquo;ll make your strongest case.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We&rsquo;ll build your case around two simple truths: your neighbors may be paying
            less per square foot than you, and the county&rsquo;s number may be higher than what
            your home would actually sell for today. Most successful Texas protests use both —
            so that&rsquo;s exactly what we&rsquo;ll do.
          </p>
        </div>

        <button
          onClick={() => handleSelect('both')}
          disabled={selecting !== null}
          className="w-full rounded-xl bg-primary text-primary-foreground py-4 text-sm font-semibold hover:bg-primary/90 active:scale-[0.97] transition-all duration-200 ease-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {selecting !== null ? (
            <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
          ) : (
            'Build my case'
          )}
        </button>
      </div>
    </div>
  )
}
