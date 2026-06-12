import Link from 'next/link';

import {
  Building2,
  BadgeCheck,
  MapPin,
  Users,
} from "lucide-react";

const actions = [
  {
    id: "companies",
    label: "Manage Companies",
    href: "/dashboard/companies",
    icon: Building2,
  },
  {
    id: "trainers",
    label: "Review Trainers",
    href: "/dashboard/trainers",
    icon: Users,
  },
  {
    id: "documents",
    label: "Verify Documents",
    href: "/dashboard/documents",
    icon: BadgeCheck,
  },
  {
    id: "cities",
    label: "City Management",
    href: "/dashboard/cities",
    icon: MapPin,
  },
];

const QuickActions = () => {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <h2 className="text-lg font-semibold tracking-tight text-textDark">
        Quick Actions
      </h2>
      <p className="mt-1 text-sm text-textLight">
        Jump into frequently used admin modules.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className="group rounded-xl border border-border bg-background px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-card hover:shadow"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent/15 p-2 text-accent transition-colors group-hover:bg-accent/25">
                <action.icon className="h-4.5 w-4.5" />
              </div>
              <span className="text-sm font-semibold text-textDark">
                {action.label}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default QuickActions;
