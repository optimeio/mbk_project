import MobileTrainerLayout from "@/app/layouts/MobileTrainerLayout";

function SkeletonCard({ compact = false }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="h-4 w-20 animate-pulse rounded-full bg-indigo-100" />
          <div className="mt-3 h-4 w-40 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-2 h-3 w-56 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-2 h-3 w-48 animate-pulse rounded-full bg-slate-100" />
          {!compact ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="h-9 w-28 animate-pulse rounded-lg bg-indigo-100" />
              <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ) : null}
        </div>
        <div className="h-6 w-24 animate-pulse rounded-full bg-amber-100" />
      </div>
    </div>
  );
}

export default function TrainerScheduleSkeleton({
  description = "Preparing sessions, attendance tools, and pending actions.",
}) {
  return (
    <MobileTrainerLayout>
      <div className="mb-6">
        <div className="h-8 w-44 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-3 h-4 w-72 animate-pulse rounded-full bg-slate-100" />
        <p className="mt-3 text-sm text-slate-500">{description}</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="h-11 w-full animate-pulse rounded-lg border border-slate-200 bg-white sm:w-44" />
        <div className="flex w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm sm:w-64">
          <div className="h-11 flex-1 animate-pulse bg-indigo-50" />
          <div className="h-11 w-px bg-slate-200" />
          <div className="h-11 flex-1 animate-pulse bg-slate-50" />
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="h-4 w-52 animate-pulse rounded-full bg-amber-200" />
          <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-amber-100" />
          <div className="mt-2 h-3 w-4/5 animate-pulse rounded-full bg-amber-100" />
          <div className="mt-4 space-y-3">
            <SkeletonCard compact />
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </MobileTrainerLayout>
  );
}
