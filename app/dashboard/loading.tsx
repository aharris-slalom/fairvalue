export default function DashboardLoading() {
  return (
    <div className="min-h-dvh px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header skeleton */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-32 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-44 rounded-lg bg-muted animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-9 w-28 rounded-xl bg-muted animate-pulse" />
            <div className="h-9 w-20 rounded-xl bg-muted animate-pulse" />
          </div>
        </div>

        {/* Protest card skeletons */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-card shadow-editorial p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="h-4 w-3/5 rounded-lg bg-muted animate-pulse" />
                  <div className="h-3 w-2/5 rounded-lg bg-muted animate-pulse" />
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="h-5 w-24 rounded-full bg-muted animate-pulse" />
                  <div className="h-3 w-20 rounded-lg bg-muted animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
