import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { DeleteAccountButton } from '@/components/dashboard/delete-account-button'

const STATUS_LABELS: Record<string, string> = {
  auditing: 'In Progress',
  payment_pending: 'Ready to Purchase',
  processing_pdf: 'Generating Report',
  completed_ready: 'Complete',
}

const STATUS_STYLES: Record<string, string> = {
  auditing: 'bg-muted text-muted-foreground',
  payment_pending: 'bg-amber-100 text-amber-800',
  processing_pdf: 'bg-accent/15 text-accent',
  completed_ready: 'bg-primary/15 text-primary',
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

async function signOut() {
  'use server'
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: protests } = await supabase
    .from('protests')
    .select(`
      id, status, estimated_savings, created_at,
      properties (street_address, current_proposed_value)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-heading text-lg text-foreground">FairValue</Link>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl text-foreground">My Protests</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className={buttonVariants({ className: 'rounded-xl text-sm' })}>
              New Protest
            </Link>
            <form action={signOut}>
              <button type="submit" className={buttonVariants({ variant: 'outline', className: 'rounded-xl text-sm' })}>
                Sign out
              </button>
            </form>
          </div>
        </div>

        {!protests?.length ? (
          <div className="rounded-2xl bg-card shadow-editorial p-10 flex flex-col items-center text-center space-y-4">
            <h2 className="font-heading text-lg text-foreground">No protests yet</h2>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Enter your property address to start building your evidence packet and protest your
              assessment.
            </p>
            <Link href="/" className={buttonVariants({ className: 'rounded-xl' })}>
              Protest My Property Tax →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {protests.map((protest) => {
              const property = protest.properties as unknown as {
                street_address: string
                current_proposed_value: number
              } | null

              return (
                <Link
                  key={protest.id}
                  href={`/protest/${protest.id}`}
                  className="block rounded-2xl bg-card shadow-editorial hover:shadow-editorial-hover p-5 transition-all duration-200 ease-out"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-heading text-base text-foreground truncate">
                        {property?.street_address ?? 'Unknown property'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {property ? fmt(property.current_proposed_value) + ' assessed' : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[protest.status] ?? 'bg-muted text-muted-foreground'}`}
                      >
                        {STATUS_LABELS[protest.status] ?? protest.status}
                      </span>
                      {protest.estimated_savings ? (
                        <p className="text-xs text-primary font-medium">
                          {fmt(protest.estimated_savings)} est. savings
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
        <div className="border-t border-border pt-6 flex justify-center">
          <DeleteAccountButton />
        </div>
      </div>
    </div>
  )
}
