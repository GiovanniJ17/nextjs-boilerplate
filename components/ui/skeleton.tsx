/**
 * Skeleton Loader Components
 * Componenti per mostrare loading states eleganti
 */

export function StatsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Hero skeleton - Sky Blue theme */}
      <div className="rounded-3xl bg-[linear-gradient(135deg,rgba(15,41,67,0.6),rgba(22,40,60,0.6))] p-5 h-64">
        <div className="h-6 bg-[rgba(255,255,255,0.04)] rounded w-48 mb-4"></div>
        <div className="h-8 bg-[rgba(255,255,255,0.04)] rounded w-64 mb-2"></div>
        <div className="h-4 bg-[rgba(255,255,255,0.03)] rounded w-96 mb-6"></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-2xl bg-[rgba(255,255,255,0.03)] h-24"></div>
            ))}
        </div>
      </div>

      {/* Cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-2xl border border-default bg-[rgba(255,255,255,0.02)] p-5 h-32">
              <div className="h-4 bg-[rgba(255,255,255,0.03)] rounded w-24 mb-3"></div>
              <div className="h-8 bg-[rgba(255,255,255,0.04)] rounded w-full mb-2"></div>
              <div className="h-3 bg-[rgba(255,255,255,0.03)] rounded w-32"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SessionsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="rounded-2xl border border-default bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-6 bg-[rgba(255,255,255,0.03)] rounded w-32"></div>
            <div className="h-5 bg-[rgba(255,255,255,0.03)] rounded-full w-20"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-[rgba(255,255,255,0.03)] rounded w-full"></div>
            <div className="h-4 bg-[rgba(255,255,255,0.03)] rounded w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 bg-slate-200 rounded w-24"></div>
        <div className="h-10 bg-slate-100 rounded-xl w-full"></div>
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-slate-200 rounded w-32"></div>
        <div className="h-10 bg-slate-100 rounded-xl w-full"></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <div className="h-4 bg-slate-200 rounded w-20"></div>
          <div className="h-10 bg-slate-100 rounded-xl w-full"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-slate-200 rounded w-24"></div>
          <div className="h-10 bg-slate-100 rounded-xl w-full"></div>
        </div>
      </div>
    </div>
  );
}
