'use client'

import { useState } from 'react'
import { X, Loader2, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { claimPreviewSession } from '@/lib/actions/preview'
import type { ArgumentType, Deficit } from '@/lib/store/protest-store'

interface Props {
  propertyId: string
  argumentType: ArgumentType
  deficits: Deficit[]
  onComplete: (pdfUrl: string) => void
  onClose: () => void
}

type Step = 'auth' | 'payment' | 'claiming' | 'done'
type AuthMode = 'signup' | 'signin'

export function AuthGateModal({ propertyId, argumentType, deficits, onComplete, onClose }: Props) {
  const [mode, setMode] = useState<AuthMode>('signup')
  const [step, setStep] = useState<Step>('auth')
  const [statusText, setStatusText] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [paying, setPaying] = useState(false)

  const supabase = createClient()

  const deficitPayload = deficits.map((d) => ({
    category: d.category,
    user_description: d.user_description,
    estimated_cost_to_cure: d.estimated_cost_to_cure,
  }))

  async function claimSession() {
    setStep('claiming')
    setStatusText('Saving your audit…')
    const result = await claimPreviewSession(propertyId, argumentType, deficitPayload)
    if ('error' in result) {
      setStep('payment')
      setError(result.error ?? 'An error occurred')
      return
    }
    setStatusText('Generating your evidence packet…')
    onComplete(result.pdfUrl)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { first_name: firstName, last_name: lastName } },
        })
        if (signUpError) { setError(signUpError.message ?? 'Sign up failed'); return }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) { setError(signInError.message ?? 'Sign in failed'); return }
      }

      // Auth succeeded — show payment before generating the packet
      setStep('payment')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleContinueAsGuest() {
    setError('')
    setSubmitting(true)
    try {
      const { error: anonError } = await supabase.auth.signInAnonymously()
      if (anonError) { setError(anonError.message ?? 'Could not continue as guest'); return }
      // Auth succeeded — show payment before generating the packet
      setStep('payment')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMockPay() {
    setPaying(true)
    await claimSession()
    setPaying(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-gate-title"
        className="w-full max-w-sm rounded-2xl bg-background p-6 space-y-5 shadow-2xl"
      >
        {step === 'claiming' ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">{statusText}</p>
          </div>

        ) : step === 'payment' ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs font-semibold text-yellow-600 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                  Test Mode — No real charge
                </div>
                <h2 id="auth-gate-title" className="font-heading text-base text-foreground">
                  Evidence Packet · $69
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">FairValue · One-time payment</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
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

            {error && (
              <p className="text-xs text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="button"
              disabled={paying}
              onClick={handleMockPay}
              className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold hover:bg-primary/90 active:scale-[0.97] disabled:opacity-60 transition-all duration-200 ease-out"
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
          </>

        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 id="auth-gate-title" className="font-heading text-lg text-foreground">
                  {mode === 'signup' ? 'Create your account' : 'Sign in to continue'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {mode === 'signup'
                    ? 'Your audit is saved. Create an account to get your evidence packet.'
                    : 'Welcome back — sign in to retrieve your packet.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground">First name</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground">Last name</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold hover:bg-primary/90 active:scale-[0.97] disabled:opacity-60 transition-all duration-200 ease-out"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Please wait…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Lock className="h-3.5 w-3.5" />
                    {mode === 'signup' ? 'Create Account & Get Packet' : 'Sign In & Get Packet'}
                  </span>
                )}
              </button>
            </form>

            <p className="text-xs text-center text-muted-foreground">
              {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
              <button
                type="button"
                onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError('') }}
                className="text-primary hover:underline font-medium"
              >
                {mode === 'signup' ? 'Sign in' : 'Create one'}
              </button>
            </p>

            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 border-t border-border" />
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleContinueAsGuest}
              className="w-full rounded-xl bg-secondary py-2.5 text-sm font-medium text-foreground hover:bg-secondary/70 active:scale-[0.97] disabled:opacity-60 transition-all duration-200 ease-out"
            >
              Continue without an account
            </button>
          </>
        )}
      </div>
    </div>
  )
}
