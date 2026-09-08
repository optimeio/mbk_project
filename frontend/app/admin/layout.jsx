"use client";

import ProtectedRoute from "@/components/common/ProtectedRoute";

export default function AdminLayout({ children }) {
  return (
    <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
      {children}
    </ProtectedRoute>
  );
}
