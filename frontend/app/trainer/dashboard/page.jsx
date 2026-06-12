"use client";

import MobileTrainerLayout from "@/app/layouts/MobileTrainerLayout";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import TrainerDashboard from "@/portals/trainer/TrainerDashboard";

export default function TrainerDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["trainer"]}>
      <MobileTrainerLayout>
        <TrainerDashboard />
      </MobileTrainerLayout>
    </ProtectedRoute>
  );
}
