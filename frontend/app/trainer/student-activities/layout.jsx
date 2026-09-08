/* app/trainer/student-activities/layout.jsx */
"use client";

import { useAuth } from "@/context/AuthContext";
import { AUTH_ROLES, normalizeAuthRole } from "@/utils/authRoles";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function StudentActivitiesLayout({ children }) {
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const role = normalizeAuthRole(currentUser?.role, currentUser?.email);
    if (role !== AUTH_ROLES.TRAINER) {
      // redirect non‑trainers to their home page
      router.replace("/" );
    }
  }, [currentUser, router]);

  return <>{children}</>;
}
