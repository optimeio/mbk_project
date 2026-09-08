import dynamic from "next/dynamic";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export const metadata = {
  title: "Schedule Monitor & Rescheduler",
  description: "Monitor training schedules across colleges, trainers, and courses, and reschedule sessions on MBK Carrierz.",
};

const ScheduleMonitor = dynamic(() => import("@/portals/admin/ScheduleMonitor"), {
  loading: () => (
    <PortalLoadingState
      title="Initializing Schedule Monitor"
      description="Loading training session calendars, college associations, and rescheduling options. Please wait."
    />
  ),
});

export default function ScheduleMonitorPage() {
  return <ScheduleMonitor />;
}
