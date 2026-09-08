"use client";

import { useEffect, useState } from "react";

import PortalLoadingState from "@/components/common/PortalLoadingState";
import { usePortalRoleGuard } from "@/hooks/usePortalRoleGuard";
import { companyPortalService } from "@/services/companyPortalService";

const trainerName = (trainer) => {
  if (!trainer) return "Unknown";
  return (
    trainer.name ||
    [trainer.firstName, trainer.lastName].filter(Boolean).join(" ").trim() ||
    trainer.email ||
    "Unknown"
  );
};

export default function CompanyTrainers() {
  const { allowed, loading: authLoading } = usePortalRoleGuard("company");
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!allowed) return undefined;

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const response = await companyPortalService.getTrainers();
        if (!cancelled) {
          if (response.success) setTrainers(response.data || []);
          else setError(response.message || "Failed to load trainers");
        }
      } catch {
        if (!cancelled) setError("Failed to load trainers");
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
    return <PortalLoadingState title="Loading trainers" description="Verifying access." />;
  }

  if (loading) {
    return <PortalLoadingState title="Loading trainers" description="Fetching assigned trainers." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Assigned Trainers</h1>
        <p className="mt-1 text-slate-600">Trainers who have conducted sessions at your partner colleges.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {trainers.map((trainer) => (
          <article key={trainer._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{trainerName(trainer)}</h2>
            <p className="mt-1 text-sm text-slate-600">{trainer.email || "—"}</p>
            <div className="mt-3 space-y-1 text-sm text-slate-500">
              <p>Phone: {trainer.phone || trainer.mobile || "—"}</p>
              <p>City: {trainer.city || "—"}</p>
              <p>Specialization: {trainer.specialization || "—"}</p>
            </div>
          </article>
        ))}
      </div>

      {!loading && trainers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No trainers have been assigned to your programs yet.
        </div>
      ) : null}
    </div>
  );
}
