"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, GraduationCap, LogIn } from "lucide-react";

import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export default function LearningHub() {
  const { isAuthenticated, userRole } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.get("/web/courses");
        if (!cancelled) setCourses(Array.isArray(data) ? data : data?.data || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const studentLoggedIn = isAuthenticated && String(userRole).toLowerCase() === "student";

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-slate-50">
      <header className="border-b border-orange-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-500 p-2 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">MBK Carrierz</p>
              <h1 className="text-lg font-bold text-slate-900">Learning Hub</h1>
            </div>
          </div>
          {studentLoggedIn ? (
            <Link
              href="/student/dashboard"
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              My Portal
            </Link>
          ) : (
            <Link
              href="/login?type=student"
              className="inline-flex items-center gap-2 rounded-xl border border-orange-200 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50"
            >
              <LogIn className="h-4 w-4" />
              Student Login
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <section className="rounded-3xl bg-gradient-to-br from-orange-500 to-amber-400 p-8 text-white shadow-lg">
          <h2 className="text-3xl font-bold">Explore MBK Training Programs</h2>
          <p className="mt-3 max-w-2xl text-orange-50">
            Browse active courses, register your interest, and access your student portal for enrolled programs.
          </p>
          {studentLoggedIn ? (
            <Link
              href="/student/courses"
              className="mt-6 inline-flex rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-50"
            >
              Register for a course →
            </Link>
          ) : null}
        </section>

        <section className="mt-8">
          <h3 className="text-xl font-bold text-slate-900">Available Courses</h3>
          {loading ? (
            <p className="mt-4 text-slate-500">Loading courses...</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <article
                  key={course._id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <BookOpen className="h-5 w-5 text-orange-500" />
                  <h4 className="mt-3 text-lg font-semibold text-slate-900">{course.title || course.name}</h4>
                  <p className="mt-2 line-clamp-4 text-sm text-slate-600">
                    {course.description || "Professional training from MBK Technology."}
                  </p>
                </article>
              ))}
            </div>
          )}
          {!loading && courses.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              No courses are published yet. Please check back soon.
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
