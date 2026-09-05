"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import { useEnrollmentsEnriched, useCourses } from "@/lib/hooks/useDashboard";
import type { EnrollmentRich } from "@/lib/types";
import Toast from "@/components/ui/Toast";
import { Search, Download, Users, ExternalLink } from "lucide-react";

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-4 animate-pulse rounded" />
        </td>
      ))}
    </tr>
  );
}

function statusFor(s: EnrollmentRich) {
  if (s.is_employed === true) return { label: "Employed", className: "bg-emerald-100 text-emerald-700" };
  if (s.is_employed === false) return { label: "Seeking", className: "bg-amber-100 text-amber-700" };
  return { label: "In Training", className: "bg-slate-100 text-slate-600" };
}

export default function StudentsPage() {
  useRequireAuth("training_partner");

  const { data: enrollments, loading } = useEnrollmentsEnriched(200, 0);
  const { data: courses } = useCourses(100, 0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [toast, setToast] = useState<string | null>(null);

  const courseNames = useMemo(() => {
    const names = new Set(enrollments.map((e) => e.course_name).filter(Boolean));
    return Array.from(names).sort();
  }, [enrollments]);

  const filtered = useMemo(() => {
    let rows = enrollments;

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (e) =>
          (e.candidate_name && e.candidate_name.toLowerCase().includes(q)) ||
          (e.course_name && e.course_name.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all") {
      rows = rows.filter((e) => {
        if (statusFilter === "employed") return e.is_employed === true;
        if (statusFilter === "seeking") return e.is_employed === false;
        if (statusFilter === "training") return e.is_employed === null;
        return true;
      });
    }

    if (courseFilter !== "all") {
      rows = rows.filter((e) => e.course_name === courseFilter);
    }

    return rows;
  }, [enrollments, search, statusFilter, courseFilter]);

  function exportCSV() {
    if (filtered.length === 0) {
      setToast("No data to export");
      return;
    }
    const headers = ["Student", "Course", "Enrolled", "Status", "Salary", "Completed", "Job Title"];
    const rows = filtered.map((e) => {
      const st = statusFor(e);
      return [
        e.candidate_name,
        e.course_name,
        e.enrollment_date ? new Date(e.enrollment_date).toLocaleDateString("en-IN") : "",
        st.label,
        e.monthly_salary != null ? String(e.monthly_salary) : "",
        e.is_completed ? "Yes" : "No",
        e.current_job_title ?? "",
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setToast("CSV exported successfully");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Students" subtitle="Track enrollment, outcomes, and surveys" />
        <main className="space-y-6 p-6">
          {toast && (
            <div className="animate-fade-in">
              <Toast message={toast} tone="success" />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-up">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Student Outcomes</h1>
              <p className="text-sm text-slate-500">
                {loading ? "Loading..." : `${filtered.length} student${filtered.length !== 1 ? "s" : ""} found`}
              </p>
            </div>
            <button onClick={exportCSV} className="btn-ghost flex items-center gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>

          <div className="flex flex-wrap gap-3 animate-fade-up delay-100">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                placeholder="Search by name or course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-glass pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-glass w-auto"
            >
              <option value="all">All Statuses</option>
              <option value="employed">Employed</option>
              <option value="seeking">Seeking</option>
              <option value="training">In Training</option>
            </select>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="input-glass w-auto"
            >
              <option value="all">All Courses</option>
              {courseNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="glass p-6 overflow-hidden animate-fade-up delay-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Student</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Course</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Enrolled</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">Salary</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Completed</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                      <p className="font-medium text-slate-500">
                        {enrollments.length === 0 ? "No students enrolled yet" : "No students match your filters"}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {enrollments.length === 0
                          ? "Student data will appear once enrollments are created."
                          : "Try adjusting your search or filters."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => {
                    const st = statusFor(e);
                    return (
                      <tr
                        key={e.id}
                        className="border-b border-slate-100 hover:bg-white/70 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {e.candidate_name || "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{e.course_name || "\u2014"}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {e.enrollment_date
                            ? new Date(e.enrollment_date).toLocaleDateString("en-IN")
                            : "\u2014"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`chip text-xs ${st.className}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {e.monthly_salary != null
                            ? `\u20B9${e.monthly_salary.toLocaleString()}`
                            : "\u2014"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`chip text-xs ${
                              e.is_completed
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {e.is_completed ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/partner/enrollment/${e.id}`}
                            className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 text-xs font-medium transition-colors"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
