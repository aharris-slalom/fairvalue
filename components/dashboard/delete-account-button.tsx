'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { deleteAccount } from '@/lib/actions/account'

export function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setError('')
    startTransition(async () => {
      const result = await deleteAccount()
      if (result?.error) {
        setError(result.error)
        setConfirming(false)
      }
    })
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-muted-foreground hover:text-destructive transition-colors"
      >
        Delete my account and all data
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Delete your account?</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This will permanently delete your account, all protests, uploaded photos, and generated documents. This cannot be undone.
        </p>
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending}
          className="rounded-xl bg-destructive text-destructive-foreground px-4 py-2.5 text-sm font-semibold hover:bg-destructive/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting…
            </span>
          ) : (
            'Yes, delete everything'
          )}
        </button>
        <button
          type="button"
          onClick={() => { setConfirming(false); setError('') }}
          disabled={isPending}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
