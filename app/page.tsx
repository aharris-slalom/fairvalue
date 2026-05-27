import Link from 'next/link'
import { readdirSync } from 'fs'
import { join, extname } from 'path'
import { createClient } from '@/lib/supabase/server'
import { AddressSearch } from '@/components/address-search'
import { SlideshowHero } from '@/components/slideshow-hero'
import { ChevronDown } from 'lucide-react'

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])

function getSlideshowImages(): string[] {
  const dir = join(process.cwd(), 'public', 'slideshow')
  return readdirSync(dir)
    .filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()))
    .map((f) => `/slideshow/${encodeURIComponent(f)}`)
}

const HOW_IT_WORKS = [
  {
    step: '1',
    label: 'Enter your address',
    desc: 'We pull your 2025 county assessment data instantly — no account needed to start.',
  },
  {
    step: '2',
    label: 'Walk through your home',
    desc: 'Our assistant asks about conditions, defects, and repairs. Every scratch on those countertops is money back in your pocket.',
  },
  {
    step: '3',
    label: 'Download your packet',
    desc: 'A formatted evidence packet and protest letter, ready to file with the ARB. One flat fee of $69.',
  },
]

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const slides = getSlideshowImages()

  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative min-h-dvh flex items-center justify-center bg-espresso">
        {/* Background slideshow */}
        <SlideshowHero slides={slides} />

        {/* Scrim — lifts the card off the image without killing it */}
        <div className="absolute inset-0 z-10 bg-foreground/30" />

        {/* Floating glass card */}
        <div className="relative z-20 w-full max-w-[460px] mx-auto px-4 py-16">
          <div className="glass-card rounded-2xl shadow-editorial-hover px-8 py-10 space-y-7">

            {/* Wordmark + headline */}
            <div className="text-center space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                FairValue
              </p>
              <h1 className="font-heading text-[2rem] leading-tight text-foreground">
                Counties assess your home<br />
                <em>based on a perfect world.</em>
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We help you show them the real one.
              </p>
            </div>

            {/* Address search */}
            <AddressSearch />

            {/* Footer row */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Dallas · Collin · Tarrant</span>
              {user ? (
                <Link href="/dashboard" className="text-primary font-medium hover:underline transition-colors">
                  My Protests →
                </Link>
              ) : (
                <Link href="/login" className="text-primary font-medium hover:underline transition-colors">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <a
          href="#how-it-works"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 text-white/60 hover:text-white/90 transition-colors"
        >
          <span className="text-xs font-medium uppercase tracking-[0.18em]">How it works</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </a>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section id="how-it-works" className="bg-background px-6 py-20 md:py-28">
        <div className="max-w-lg mx-auto space-y-14">

          {/* Section header */}
          <div className="space-y-4">
            <div className="w-8 h-px bg-espresso" />
            <h2 className="font-heading text-2xl text-foreground">How it works</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              From your front door to the appeals board, in one afternoon.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-10">
            {HOW_IT_WORKS.map(({ step, label, desc }) => (
              <div key={step} className="flex gap-6 items-start">
                <span className="font-heading italic text-primary text-4xl leading-none shrink-0 w-8 select-none">
                  {step}
                </span>
                <div className="space-y-1 pt-1.5">
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footnote */}
          <p className="text-xs text-muted-foreground/60 pt-4 border-t border-border">
            FairValue covers Dallas, Collin &amp; Tarrant counties · $69 one-time · No account needed to start
          </p>
        </div>
      </section>
    </main>
  )
}
