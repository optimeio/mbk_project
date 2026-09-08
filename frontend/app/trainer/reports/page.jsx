import dynamic from "next/dynamic";

export const metadata = {
  title: 'Trainer Reports',
  description: 'View your performance reports, attendance summaries, and training analytics on MBK Carrierz.',
};

const TrainerReports = dynamic(
  () => import("@/portals/trainer/TrainerReports"),
  {
      loading: () => (
      <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
    ),
  },
);

export default function TrainerReportsPage() {
  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
      <TrainerReports />
    </div>
  );
}
