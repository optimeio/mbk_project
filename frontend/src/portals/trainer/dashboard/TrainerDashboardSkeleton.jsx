export default function TrainerDashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-3 sm:space-y-6 sm:px-6 lg:px-8">
      <section className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-8 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 animate-pulse rounded-2xl bg-slate-200" />
            <div className="space-y-3">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:gap-3">
            <div className="h-11 w-full animate-pulse rounded-xl bg-slate-200 sm:w-36" />
            <div className="h-11 w-full animate-pulse rounded-xl bg-slate-200 sm:w-36" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`dashboard-stat-skeleton-${index}`}
            className="min-h-[120px] animate-pulse rounded-[18px] bg-slate-200 sm:min-h-[140px] sm:rounded-[24px]"
          />
        ))}
      </section>

      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <section
          key={`dashboard-section-skeleton-${sectionIndex}`}
          className="rounded-[24px] border border-slate-200 bg-white shadow-sm sm:rounded-[28px]"
        >
          <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
            <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-56 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="space-y-3 px-4 py-4 sm:px-6 sm:py-5">
            {Array.from({ length: 3 }).map((_, itemIndex) => (
              <div
                key={`dashboard-section-skeleton-item-${sectionIndex}-${itemIndex}`}
                className="h-24 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
