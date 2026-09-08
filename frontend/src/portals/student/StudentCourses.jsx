"use client";

import { useEffect, useState } from "react";
import { BookOpen, Clock } from "lucide-react";

import PortalLoadingState from "@/components/common/PortalLoadingState";
import { usePortalRoleGuard } from "@/hooks/usePortalRoleGuard";
import { studentPortalService } from "@/services/studentPortalService";
import { useAuth } from "@/context/AuthContext";
import CTAButton from "@/components/common/CTAButton";

export default function StudentCourses() {
  const { allowed, loading: authLoading } = usePortalRoleGuard("student");
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registeringId, setRegisteringId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!allowed) return undefined;

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await studentPortalService.getCourses();
        if (!cancelled) {
          setCourses(Array.isArray(data) ? data : data?.data || []);
        }
      } catch {
        if (!cancelled) setError("Unable to load courses.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  const handleRegister = async (course) => {
    if (!user?.email && !user?.fullName) return;

    try {
      setRegisteringId(course._id);
      setMessage("");
      await studentPortalService.registerForCourse({
        studentName: user.fullName || user.name || "Student",
        phone: user.phone || user.phoneNumber || "",
        email: user.email,
        courseId: course._id,
        qualification: user.course || "",
        timing: "Flexible",
        mode: "Hybrid",
      });
      setMessage(`Registration submitted for ${course.title || course.name}. Our team will contact you soon.`);
    } catch {
      setMessage("Registration failed. Please try again.");
    } finally {
      setRegisteringId(null);
    }
  };

  if (authLoading || !allowed) {
    return <PortalLoadingState title="Loading courses" description="Preparing course catalog." />;
  }

  if (loading) {
    return <PortalLoadingState title="Loading courses" description="Fetching MBK training programs." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Training Courses</h1>
        <p className="mt-1 text-slate-600">Explore active MBK programs and register for additional training.</p>
      </div>

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <article
            key={course._id}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 inline-flex rounded-xl bg-blue-50 p-2 text-blue-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{course.title || course.name}</h2>
            <p className="mt-2 flex-1 text-sm text-slate-600 line-clamp-4">
              {course.description || "Professional hands-on training program from MBK Technology."}
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span>{course.duration || course.timing || "Flexible schedule"}</span>
            </div>
            <CTAButton
              type="button"
              variant="brand"
              size="md"
              className="mt-4 rounded-xl"
              disabled={registeringId === course._id}
              loading={registeringId === course._id}
              loadingText="Submitting..."
              onClick={() => handleRegister(course)}
            >
              Register Interest
            </CTAButton>
          </article>
        ))}
      </div>

      {!loading && courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No active courses are available right now. Check back soon.
        </div>
      ) : null}
    </div>
  );
}
