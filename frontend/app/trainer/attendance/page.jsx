"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PortalLoadingState from "@/components/common/PortalLoadingState";

export default function TrainerAttendanceRoute() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/trainer/daily-visit");
  }, [router]);

  return (
    <PortalLoadingState
      title="Redirecting"
      description="Redirecting you to the unified Daily Visit Workflow..."
    />
  );
}
