import { ClockIcon } from "@heroicons/react/24/outline";

const ActivityPanel = ({ activities }) => {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-textDark">
          Recent Activity
        </h2>
        <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-textLight">
          Latest updates
        </span>
      </div>

      <div className="space-y-3">
        {activities.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-accent/40 hover:bg-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-textDark">{item.user}</p>
                <p className="mt-0.5 text-sm text-textLight">{item.action}</p>
              </div>
              <p className="inline-flex shrink-0 items-center gap-1 text-xs text-textLight">
                <ClockIcon className="h-3.5 w-3.5" />
                {item.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ActivityPanel;
