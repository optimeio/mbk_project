import { ArrowTrendingUpIcon } from "@heroicons/react/24/outline";

const StatCard = ({ title, value, icon: Icon, tone = "indigo", index = 0 }) => {
  const toneClasses = {
    indigo: "bg-primary/10 text-primary",
    sky: "bg-secondary/15 text-secondary",
    emerald: "bg-accent/15 text-accent",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    slate: "bg-background text-textLight",
  };

  return (
    <article
      className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      style={{ transitionDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-textLight">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-textDark">
            {value}
          </p>
          <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-textLight">
            <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
            Live dashboard
          </p>
        </div>
        <div
          className={`rounded-xl p-3 transition-transform duration-300 group-hover:scale-105 ${toneClasses[tone] || toneClasses.indigo}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </article>
  );
};

export default StatCard;
