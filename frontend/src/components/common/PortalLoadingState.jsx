"use client";

const SkeletonBar = ({ className = "" }) => (
  <div className={`animate-pulse rounded-full bg-slate-200 ${className}`} />
);

export default function PortalLoadingState({
  title = "Loading portal",
  description = "Preparing your workspace.",
}) {

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:rounded-[28px] sm:px-6">
        <div className="flex items-start gap-4">
          <div className="mt-1 h-12 w-12 animate-pulse rounded-2xl bg-slate-200" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            {description ? (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            ) : null}
            <div className="mt-4 space-y-2">
              <SkeletonBar className="h-3 w-40 max-w-full" />
              <SkeletonBar className="h-3 w-64 max-w-full bg-slate-100" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <article
            key={`portal-loading-stat-${index}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <SkeletonBar className="h-3 w-24" />
                <div className="h-8 w-20 animate-pulse rounded-xl bg-slate-200" />
                <SkeletonBar className="h-3 w-28 bg-slate-100" />
              </div>
              <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SkeletonBar className="h-4 w-28" />
          <SkeletonBar className="mt-3 h-3 w-40 bg-slate-100" />
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`portal-loading-action-${index}`}
                className="h-16 animate-pulse rounded-xl border border-slate-100 bg-slate-50"
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-3">
            <SkeletonBar className="h-4 w-32" />
            <SkeletonBar className="h-8 w-24 bg-slate-100" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`portal-loading-activity-${index}`}
                className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonBar className="h-3 w-24" />
                    <SkeletonBar className="h-3 w-3/4 bg-slate-100" />
                  </div>
                  <SkeletonBar className="h-3 w-16 bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
