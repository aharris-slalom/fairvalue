'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'
import { login } from '@/app/(auth)/login/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Signing in…' : 'Sign in'}
    </Button>
  )
}

export function LoginForm({ verified }: { verified: boolean }) {
  const [error, setError] = useState<string | null>(null)

  async function handleAction(formData: FormData) {
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      toast.error(result.error)
    }
  }

  return (
    <div className="glass-card rounded-2xl w-full px-8 py-10 shadow-editorial-hover space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          FairValue
        </p>
        <h2 className="font-heading text-2xl text-foreground">Welcome back</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {verified
            ? 'Check your email to confirm your account, then sign in.'
            : 'Sign in to continue your property tax protest.'}
        </p>
      </div>

      {verified && (
        <div className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary">
          A confirmation link has been sent to your email. Please verify before signing in.
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form action={handleAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            className="rounded-xl"
          />
        </div>

        <SubmitButton />
      </form>

      <p className="text-sm text-muted-foreground text-center">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-primary font-medium hover:underline">
          Create one
        </Link>
      </p>
    </div>
  )
}
