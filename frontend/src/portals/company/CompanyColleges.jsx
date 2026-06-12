"use client";

import { useEffect, useState } from "react";

import PortalLoadingState from "@/components/common/PortalLoadingState";
import { usePortalRoleGuard } from "@/hooks/usePortalRoleGuard";
import { companyPortalService } from "@/services/companyPortalService";

export default function CompanyColleges() {
  const { allowed, loading: authLoading } = usePortalRoleGuard("company");
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!allowed) return undefined;

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const response = await companyPortalService.getColleges();
        if (!cancelled) {
          if (response.success) setColleges(response.data || []);
          else setError(response.message || "Failed to load colleges");
        }
      } catch {
        if (!cancelled) setError("Failed to load colleges");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (authLoading || !allowed) {
    return <PortalLoadingState title="Loading colleges" description="Verifying access." />;
  }

  if (loading) {
    return <PortalLoadingState title="Loading colleges" description="Fetching partner colleges." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Partner Colleges</h1>
        <p className="mt-1 text-slate-600">Colleges linked to your company training programs.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {colleges.map((college) => (
          <article key={college._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{college.name}</h2>
            <p className="mt-2 text-sm text-slate-600">{college.address || "Address not available"}</p>
            <div className="mt-3 space-y-1 text-sm text-slate-500">
              {college.phone ? <p>Phone: {college.phone}</p> : null}
              {college.email ? <p>Email: {college.email}</p> : null}
            </div>
          </article>
        ))}
      </div>

      {!loading && colleges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No colleges are linked to your company yet.
        </div>
      ) : null}
    </div>
  );
}
