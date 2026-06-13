'use client';

/**
 * Generic instant skeleton shown by segment-level loading.jsx files while a
 * portal route's chunk and data load. Keeps navigation feeling immediate.
 */
export default function PortalRouteSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100 dark:border-neutral-800">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 dark:bg-neutral-800 rounded-lg" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-neutral-800 rounded-lg opacity-70" />
        </div>
        <div className="h-10 w-32 bg-gray-200 dark:bg-neutral-800 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-6 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl space-y-4 shadow-sm"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 bg-gray-200 dark:bg-neutral-800 rounded" />
              <div className="h-8 w-8 bg-gray-200 dark:bg-neutral-800 rounded-full" />
            </div>
            <div className="h-8 w-16 bg-gray-200 dark:bg-neutral-800 rounded-lg" />
            <div className="h-3 w-32 bg-gray-200 dark:bg-neutral-800 rounded opacity-60" />
          </div>
        ))}
      </div>

      <div className="p-6 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl space-y-4 shadow-sm">
        <div className="h-6 w-36 bg-gray-200 dark:bg-neutral-800 rounded" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex gap-4 items-center">
              <div className="h-10 w-10 bg-gray-200 dark:bg-neutral-800 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-neutral-800 rounded" />
                <div className="h-3 w-1/2 bg-gray-200 dark:bg-neutral-800 rounded opacity-60" />
              </div>
              <div className="h-8 w-20 bg-gray-200 dark:bg-neutral-800 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
