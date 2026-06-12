const GlobalLoadingScreen = ({
  overlay = false,
  title = "Loading page",
  subtitle = "Preparing your workspace...",
}) => {
  return (
    <div
      className={
        overlay
          ? "pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-white/55 px-4"
          : "flex min-h-screen items-center justify-center bg-[#eef2f5] px-4"
      }
    >
      <div className="flex w-full max-w-xs items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <span
          className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-[#1d5f87]"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {subtitle ? (
            <p className="text-xs text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default GlobalLoadingScreen;
