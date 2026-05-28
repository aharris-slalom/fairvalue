'use client'

import { FileDown, CheckCircle, ExternalLink } from 'lucide-react'
import { useProtestStore } from '@/lib/store/protest-store'

interface Props {
  protestId: string
}

export function Phase5Delivery({ protestId: _protestId }: Props) {
  const pdfUrl = useProtestStore((s) => s.pdfUrl)
  const property = useProtestStore((s) => s.property)
  const targetProtestValue = useProtestStore((s) => s.targetProtestValue)
  const estimatedSavings = useProtestStore((s) => s.estimatedSavings)

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Protest Packet Ready
        </p>
        <h1 className="font-heading text-2xl leading-snug text-foreground">Your Protest is Ready to File</h1>
      </div>

      {/* Success banner */}
      <div className="rounded-2xl bg-primary/10 border border-primary/20 px-5 py-4 flex items-center gap-4">
        <CheckCircle className="h-6 w-6 text-primary shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Protest packet generated</p>
          {property && (
            <p className="text-xs text-muted-foreground mt-0.5">{property.street_address}</p>
          )}
        </div>
        {targetProtestValue !== null && estimatedSavings !== null && (
          <div className="ml-auto text-right shrink-0">
            <p className="text-xs text-muted-foreground">Est. annual savings</p>
            <p className="font-heading text-lg text-primary">{fmt(estimatedSavings)}</p>
          </div>
        )}
      </div>

      {/* Download card */}
      <div className="rounded-2xl bg-card shadow-editorial p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <FileDown className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Protest Packet (PDF)</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Notice of Protest · Comparable sales · Condition report · Photo annex
            </p>
          </div>
        </div>
        {pdfUrl ? (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 active:scale-[0.97] transition-all duration-200 ease-out"
          >
            <FileDown className="h-4 w-4" />
            Download Protest Packet
          </a>
        ) : (
          <div className="w-full rounded-xl bg-muted py-2.5 text-center text-sm text-muted-foreground">
            PDF link unavailable — please refresh the page
          </div>
        )}
      </div>

      {/* Next steps */}
      <div className="rounded-2xl bg-card shadow-editorial p-5 space-y-4">
        <div className="space-y-1">
          <div className="w-6 h-px bg-espresso" />
          <h2 className="font-heading text-lg text-foreground">Next Steps</h2>
        </div>
        <ol className="space-y-4 text-sm text-muted-foreground list-none">
          {[
            'Download your protest packet. Page 1 is the official Notice of Protest — sign it before filing.',
            'File your Notice of Protest online or by mail before the deadline — Texas protests are due May 15 or 30 days after your notice, whichever is later.',
            'Bring the full packet to your informal hearing. Most cases settle at this stage — no ARB hearing required.',
            'If your protest succeeds, the reduction will appear in your fall tax bill.',
          ].map((step, i) => (
            <li key={i} className="flex gap-4 items-start">
              <span className="font-heading italic text-primary text-2xl leading-none shrink-0 w-5 select-none">
                {i + 1}
              </span>
              <span className="leading-relaxed pt-0.5">{step}</span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-3 pt-1 border-t border-border">
          <a
            href="https://www.dallascad.org/efile/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline transition-colors"
          >
            Dallas CAD eFile <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://www.collincad.org/propertysearch"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline transition-colors"
          >
            Collin CAD Protest <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://www.tad.org/protest/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline transition-colors"
          >
            Tarrant CAD Protest <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
