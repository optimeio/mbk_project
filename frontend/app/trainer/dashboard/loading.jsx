export default function Loading() {
  return (
    <div className="animate-pulse p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-200 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-gray-200 rounded w-40" />
          <div className="h-3 bg-gray-100 rounded w-24" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-16" />
            <div className="h-6 bg-gray-200 rounded w-12" />
          </div>
        ))}
      </div>

      {/* Schedule section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-28" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>

      {/* Notifications section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-24" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
