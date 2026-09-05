"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, useRef } from "react";
import {
  BookOpen,
  Users,
  Sparkles,
  ArrowUpRight,
  BookMarked,
  GraduationCap,
  TrendingUp,
  Clock,
  ChevronRight,
  LayoutGrid,
  Target,
  FileText,
  UserCheck,
  UserX,
  Loader2,
  IndianRupee,
  Briefcase,
  ExternalLink,
  BarChart3,
  Upload,
  Download,
  CircleCheck,
  TriangleAlert,
  FileCheck2,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  useCourses,
  useEnrollments,
  useEnrollmentsEnriched,
  usePlacementHealth,
  useDashboardStats,
  useTopSkills,
  importOutcomesCsv,
} from "@/lib/hooks/useDashboard";
import type { CourseListItem, OutcomeImportResult } from "@/lib/types";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";

function useAnimatedNumber(target: number | null, duration = 1200) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (target === null) {
      setDisplay(0);
      return;
    }
    const finalValue = target;
    const startTime = performance.now();
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * finalValue));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target, duration]);
  return display;
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton animate-pulse rounded-lg ${className ?? ""}`} />;
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatLakhs(value: number) {
  const lakh = 100000;
  if (value >= lakh) {
    const l = value / lakh;
    return `${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)}L`;
  }
  return value.toLocaleString("en-IN");
}

interface CoursePerformanceRow {
  id: string;
  name: string;
  enrolled: number;
  completed: number;
  inProgress: number;
  completionRate: number;
  latestEnrollment: string | null;
}

type OccupancyStatus = "nearly_full" | "filling" | "available" | "no_data";

interface CourseOccupancyRow {
  id: string;
  name: string;
  capacity: number | null;
  filled: number;
  occupancyPct: number | null;
  status: OccupancyStatus;
}

interface SeatCapacityCourse extends CourseListItem {
  total_seats?: number;
  capacity?: number;
  seats_available?: number;
}

const OCCUPANCY_BAR_COLORS: Record<OccupancyStatus, string> = {
  nearly_full: "linear-gradient(90deg, #f59e0b, #f97316)",
  filling: "linear-gradient(90deg, #7c3aed, #38bdf8)",
  available: "linear-gradient(90deg, #0ea5e9, #38bdf8)",
  no_data: "#cbd5e1",
};

const OCCUPANCY_CHIP_CLASSES: Record<OccupancyStatus, string> = {
  nearly_full: "bg-amber-100 text-amber-700",
  filling: "bg-violet-100 text-violet-700",
  available: "bg-sky-100 text-sky-700",
  no_data: "bg-slate-100 text-slate-500",
};

const OCCUPANCY_LABELS: Record<OccupancyStatus, string> = {
  nearly_full: "Nearly full (>80%)",
  filling: "Filling (50-80%)",
  available: "Seats available (<50%)",
  no_data: "Seat data unavailable",
};

const OUTCOME_CSV_HEADERS = [
  "candidate_phone",
  "survey_date",
  "is_employed",
  "survey_interval",
  "current_job_title",
  "monthly_salary",
  "job_location",
  "is_self_employed",
  "enrollment_id",
] as const;

const OUTCOME_CSV_EXAMPLE_ROWS = [
  "9876543210,2026-09-01,yes,3_month,Front Desk Executive,18000,Mumbai,no,",
  "9876543211,2026-09-01,no,3_month,,,Mumbai,no,",
];

function OutcomeImportPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<OutcomeImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function downloadTemplate() {
    const csv = [OUTCOME_CSV_HEADERS.join(","), ...OUTCOME_CSV_EXAMPLE_ROWS].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "employment-outcomes-template.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null);
    setResult(null);
    setError(null);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setResult(null);
    setError(null);
    try {
      const res = await importOutcomesCsv(selectedFile);
      setResult(res);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="glass mb-8 p-6 animate-fade-up delay-300">
      <div className="flex items-center justify-between mb-1">
        <h2 className="panel-title flex items-center gap-2">
          <FileCheck2 className="h-5 w-5 text-indigo-500" />
          Import Employment Outcomes
        </h2>
        <span className="chip bg-indigo-100 text-indigo-700 text-xs shrink-0">
          Bulk CSV upload
        </span>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Upload a CSV of employment outcomes for your students. Download the template,
        fill in the rows, and import them in bulk.
      </p>

      <label className="glass-inner flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-white/15 bg-white/[0.03] px-6 py-8 text-center transition hover:border-brand-400/50 hover:bg-white/[0.06]">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
        {selectedFile ? (
          <FileCheck2 className="h-8 w-8 text-emerald-400" />
        ) : (
          <Upload className="h-8 w-8 text-brand-400" />
        )}
        <p className="text-sm font-medium text-slate-200">
          {selectedFile ? selectedFile.name : "Drop your CSV here or click to browse"}
        </p>
        <p className="max-w-xl text-xs text-slate-500">
          Accepts .csv — columns: candidate_phone, survey_date, is_employed,
          survey_interval, current_job_title, monthly_salary, job_location,
          is_self_employed, enrollment_id
        </p>
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="btn-glass disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Import CSV
            </>
          )}
        </button>
        <button
          type="button"
          onClick={downloadTemplate}
          disabled={uploading}
          className="btn-ghost text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Download CSV template
        </button>
      </div>

      {error && (
        <div className="glass-inner mt-4 flex items-start gap-2 border-rose-300/40 p-3 text-sm text-rose-300">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          {error}
        </div>
      )}

      {result && !error && (
        <div className="mt-4 space-y-3 animate-fade-in">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-emerald-100 text-emerald-700">
              <CircleCheck className="h-3.5 w-3.5" />
              {result.imported} outcome{result.imported === 1 ? "" : "s"} imported
            </span>
            {result.errors.length > 0 && (
              <span className="chip bg-amber-100 text-amber-700">
                <TriangleAlert className="h-3.5 w-3.5" />
                {result.errors.length} row error{result.errors.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="glass-inner max-h-44 overflow-y-auto p-3">
              {result.errors.map((e, idx) => (
                <div
                  key={`${e.row}-${idx}`}
                  className="flex items-start gap-2 border-b border-white/10 px-1 py-1.5 text-sm last:border-0"
                >
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span className="min-w-0 text-slate-300">
                    <span className="font-semibold text-rose-400">Row {e.row}:</span>{" "}
                    {e.error}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PIE_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#94a3b8"];

const navCards = [
  {
    href: "/partner/courses",
    title: "Courses",
    desc: "Manage and view all training programs",
    icon: LayoutGrid,
    tint: "from-sky-500 to-cyan-500",
  },
  {
    href: "/partner/students",
    title: "Students",
    desc: "Track enrollment, outcomes, and surveys",
    icon: Users,
    tint: "from-emerald-500 to-teal-500",
  },
  {
    href: "/partner/curriculum-gap",
    title: "Curriculum Gaps",
    desc: "See how your curriculum aligns with market demand",
    icon: Target,
    tint: "from-violet-500 to-fuchsia-500",
  },
  {
    href: "/partner/enrollment",
    title: "Enrollments",
    desc: "Register and manage student enrollments",
    icon: FileText,
    tint: "from-amber-500 to-orange-500",
  },
];

export default function PartnerDashboard() {
  useRequireAuth("training_partner");

  const { data: courses, loading: coursesLoading } = useCourses(100, 0);
  const { data: enrollments, loading: enrollmentsLoading } = useEnrollments(100, 0);
  const { data: enriched, loading: enrichedLoading } = useEnrollmentsEnriched(200, 0);
  const { data: stats, loading: statsLoading } = useDashboardStats();
  const { ready } = usePlacementHealth();
  const { data: topSkillsData, loading: topSkillsLoading } = useTopSkills(15);

  const courseCount = useAnimatedNumber(coursesLoading ? null : courses.length);
  const enrollmentCount = useAnimatedNumber(enrollmentsLoading ? null : enrollments.length);
  const placementValue = stats?.overall_placement_rate;
  const placementDisplay = useAnimatedNumber(
    placementValue !== null && placementValue !== undefined ? Math.round(placementValue) : null,
  );

  /* ── Derived: Student Outcome Snapshot ───────────────────────────────── */
  const outcomeSnapshot = useMemo(() => {
    if (!enriched || enriched.length === 0) return null;
    const employed = enriched.filter((e) => e.is_employed === true);
    const seeking = enriched.filter((e) => e.is_employed === false);
    const inTraining = enriched.filter((e) => e.is_employed === null);
    const salaries = employed
      .map((e) => e.monthly_salary)
      .filter((s): s is number => s !== null && s !== undefined);
    const avgSalary = salaries.length > 0
      ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length)
      : null;
    return {
      total: enriched.length,
      employed: employed.length,
      seeking: seeking.length,
      inTraining: inTraining.length,
      avgSalary,
    };
  }, [enriched]);

  /* ── Derived: Pie chart data ─────────────────────────────────────────── */
  const pieData = useMemo(() => {
    if (!outcomeSnapshot) return [];
    return [
      { name: "Employed", value: outcomeSnapshot.employed },
      { name: "Seeking", value: outcomeSnapshot.seeking },
      { name: "In Training", value: outcomeSnapshot.inTraining },
    ].filter((d) => d.value > 0);
  }, [outcomeSnapshot]);

  /* ── Derived: Top skills offered ─────────────────────────────────────── */
  const topSkillsOffered = useMemo(() => {
    if (!courses || courses.length === 0) return [];
    const counts: Record<string, number> = {};
    for (const course of courses) {
      for (const skill of course.skills_taught) {
        const key = skill.trim().toLowerCase();
        if (key) counts[key] = (counts[key] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [courses]);

  const marketDemandSet = useMemo(() => {
    if (!topSkillsData?.skills) return new Set<string>();
    return new Set(topSkillsData.skills.map((s) => s.skill.trim().toLowerCase()));
  }, [topSkillsData]);

  /* ── Derived: Recent students ────────────────────────────────────────── */
  const recentStudents = useMemo(() => {
    if (!enriched || enriched.length === 0) return [];
    return [...enriched]
      .sort((a, b) => {
        const da = a.enrollment_date ?? "";
        const db = b.enrollment_date ?? "";
        return db.localeCompare(da);
      })
      .slice(0, 4);
  }, [enriched]);

  /* ── Derived: Course performance (enrollments vs completions) ────────── */
  const coursePerformance = useMemo<CoursePerformanceRow[]>(() => {
    if (!courses || courses.length === 0) return [];
    const grouped = new Map<
      string,
      { enrolled: number; completed: number; inProgress: number; latest: string | null }
    >();
    for (const enr of enriched ?? []) {
      const g = grouped.get(enr.course_id) ?? {
        enrolled: 0,
        completed: 0,
        inProgress: 0,
        latest: null,
      };
      g.enrolled += 1;
      if (enr.is_completed === true) g.completed += 1;
      else g.inProgress += 1;
      const enrDate = enr.enrollment_date ?? "";
      if (enrDate && (!g.latest || enrDate > g.latest)) g.latest = enrDate;
      grouped.set(enr.course_id, g);
    }
    return courses.map((course) => {
      const g = grouped.get(course.id) ?? {
        enrolled: 0,
        completed: 0,
        inProgress: 0,
        latest: null,
      };
      const completionRate = g.enrolled > 0 ? Math.round((g.completed / g.enrolled) * 100) : 0;
      return {
        id: course.id,
        name: course.name,
        enrolled: g.enrolled,
        completed: g.completed,
        inProgress: g.inProgress,
        completionRate,
        latestEnrollment: g.latest,
      };
    });
  }, [courses, enriched]);

  const performanceRows = useMemo(
    () => [...coursePerformance].sort((a, b) => b.enrolled - a.enrolled),
    [coursePerformance],
  );

  const performanceChartData = useMemo(
    () => performanceRows.filter((r) => r.enrolled > 0).slice(0, 6),
    [performanceRows],
  );

  const overallCompletionRate = useMemo(() => {
    const totalEnrolled = performanceRows.reduce((s, r) => s + r.enrolled, 0);
    const totalCompleted = performanceRows.reduce((s, r) => s + r.completed, 0);
    return totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : null;
  }, [performanceRows]);

  const performanceLoading = coursesLoading || enrichedLoading;

  /* ── Derived: Placement rate by course ──────────────────────────────── */
  interface CoursePlacementRow {
    courseId: string;
    courseName: string;
    totalSurveyed: number;
    placedCount: number;
    placementRate: number;
    avgSalary: number | null;
    bestInterval: string | null;
  }

  const coursePlacementData = useMemo<CoursePlacementRow[]>(() => {
    if (!courses || courses.length === 0) return [];
    const grouped = new Map<
      string,
      { surveyed: number; placed: number; salaries: number[]; intervalPlacements: Map<string, { total: number; placed: number }> }
    >();
    for (const enr of enriched ?? []) {
      if (enr.is_employed === null) continue;
      const g = grouped.get(enr.course_id) ?? {
        surveyed: 0,
        placed: 0,
        salaries: [] as number[],
        intervalPlacements: new Map<string, { total: number; placed: number }>(),
      };
      g.surveyed += 1;
      if (enr.is_employed === true) {
        g.placed += 1;
        if (enr.monthly_salary !== null && enr.monthly_salary !== undefined) {
          g.salaries.push(enr.monthly_salary);
        }
      }
      if (enr.survey_interval) {
        const ip = g.intervalPlacements.get(enr.survey_interval) ?? { total: 0, placed: 0 };
        ip.total += 1;
        if (enr.is_employed === true) ip.placed += 1;
        g.intervalPlacements.set(enr.survey_interval, ip);
      }
      grouped.set(enr.course_id, g);
    }

    const rows: CoursePlacementRow[] = courses.map((course) => {
      const g = grouped.get(course.id) ?? {
        surveyed: 0,
        placed: 0,
        salaries: [] as number[],
        intervalPlacements: new Map<string, { total: number; placed: number }>(),
      };
      const placementRate = g.surveyed > 0 ? Math.round((g.placed / g.surveyed) * 100) : 0;
      const avgSalary =
        g.salaries.length > 0
          ? Math.round(g.salaries.reduce((a, b) => a + b, 0) / g.salaries.length)
          : null;

      let bestInterval: string | null = null;
      let bestRate = -1;
      for (const [interval, ip] of g.intervalPlacements) {
        if (ip.total >= 2) {
          const rate = ip.placed / ip.total;
          if (rate > bestRate || (rate === bestRate && interval.includes("12"))) {
            bestRate = rate;
            bestInterval = interval;
          }
        }
      }
      if (bestInterval === null) {
        for (const [interval] of g.intervalPlacements) {
          bestInterval = interval;
          break;
        }
      }

      return {
        courseId: course.id,
        courseName: course.name,
        totalSurveyed: g.surveyed,
        placedCount: g.placed,
        placementRate,
        avgSalary,
        bestInterval,
      };
    });

    rows.sort((a, b) => {
      if (a.totalSurveyed === 0 && b.totalSurveyed === 0) return 0;
      if (a.totalSurveyed === 0) return 1;
      if (b.totalSurveyed === 0) return -1;
      return b.placementRate - a.placementRate;
    });

    return rows;
  }, [courses, enriched]);

  const overallPlacementRate = useMemo(() => {
    const surveyed = coursePlacementData.reduce((s, r) => s + r.totalSurveyed, 0);
    const placed = coursePlacementData.reduce((s, r) => s + r.placedCount, 0);
    return surveyed > 0 ? Math.round((placed / surveyed) * 100) : null;
  }, [coursePlacementData]);

  const placementLoading = enrichedLoading;

  /* ── Derived: Course seats & occupancy ─────────────────────────────── */
  const courseOccupancy = useMemo<CourseOccupancyRow[]>(() => {
    if (!courses || courses.length === 0) return [];
    const activeByCourse = new Map<string, number>();
    for (const enr of enriched ?? []) {
      if (enr.is_completed !== true) {
        activeByCourse.set(enr.course_id, (activeByCourse.get(enr.course_id) ?? 0) + 1);
      }
    }
    return courses.map((course) => {
      const withSeats = course as SeatCapacityCourse;
      const filled = activeByCourse.get(course.id) ?? 0;
      const explicit =
        typeof withSeats.total_seats === "number" && withSeats.total_seats > 0
          ? withSeats.total_seats
          : typeof withSeats.capacity === "number" && withSeats.capacity > 0
          ? withSeats.capacity
          : null;
      const capacity =
        explicit !== null
          ? explicit
          : typeof withSeats.seats_available === "number"
          ? withSeats.seats_available + filled
          : null;
      const occupancyPct =
        capacity !== null && capacity > 0 ? Math.round((filled / capacity) * 100) : null;
      const status: OccupancyStatus =
        occupancyPct === null
          ? "no_data"
          : occupancyPct > 80
          ? "nearly_full"
          : occupancyPct >= 50
          ? "filling"
          : "available";
      return { id: course.id, name: course.name, capacity, filled, occupancyPct, status };
    });
  }, [courses, enriched]);

  const occupancyRows = useMemo(() => {
    return [...courseOccupancy].sort((a, b) => {
      if (a.occupancyPct === null && b.occupancyPct === null) return 0;
      if (a.occupancyPct === null) return 1;
      if (b.occupancyPct === null) return -1;
      return b.occupancyPct - a.occupancyPct;
    });
  }, [courseOccupancy]);

  const occupancyTotals = useMemo(() => {
    const withCapacity = courseOccupancy.filter(
      (r) => r.capacity !== null && (r.capacity ?? 0) > 0,
    );
    const totalSeats = withCapacity.reduce((s, r) => s + (r.capacity ?? 0), 0);
    const totalFilled = withCapacity.reduce((s, r) => s + r.filled, 0);
    return {
      totalCourses: courseOccupancy.length,
      courseCount: withCapacity.length,
      totalSeats,
      totalFilled,
      overallPct: totalSeats > 0 ? Math.round((totalFilled / totalSeats) * 100) : null,
    };
  }, [courseOccupancy]);

  const occupancyLoading = coursesLoading || enrichedLoading;

  /* ── Derived: Program value / cost summary ───────────────────────────── */
  const costSummary = useMemo(() => {
    if (!courses || courses.length === 0) return null;
    const withCost = courses.filter(
      (c) => c.cost_per_candidate !== null && c.cost_per_candidate !== undefined,
    );
    if (withCost.length === 0) return null;
    const avgCost = Math.round(
      withCost.reduce((s, c) => s + (c.cost_per_candidate ?? 0), 0) / withCost.length,
    );
    return {
      avgCost,
      coursesWithCost: withCost.length,
      totalCourses: courses.length,
      placementRate: placementValue,
    };
  }, [courses, placementValue]);

  const statCards = [
    {
      label: "Active Courses",
      value: coursesLoading ? null : courseCount,
      suffix: "",
      icon: BookOpen,
      tint: "from-brand-500 to-indigo-500",
      text: "text-brand-600",
      loading: coursesLoading,
    },
    {
      label: "Enrolled Students",
      value: enrollmentsLoading ? null : enrollmentCount,
      suffix: "",
      icon: Users,
      tint: "from-emerald-500 to-teal-500",
      text: "text-emerald-600",
      loading: enrollmentsLoading,
    },
    {
      label: "Placement Rate",
      value: statsLoading ? null : placementDisplay,
      suffix: placementValue !== null && placementValue !== undefined ? "%" : "",
      icon: TrendingUp,
      tint: "from-violet-500 to-fuchsia-500",
      text: "text-violet-600",
      loading: statsLoading,
    },
  ];

  const displayCourses = courses.slice(0, 4);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">

        {/* ── Welcome Banner ─────────────────────────────── */}
        <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-brand-600 to-violet-600 p-[1px] animate-fade-up">
          <div className="glass rounded-2xl px-8 py-10">
            <div className="flex items-center gap-3 mb-1">
              <GraduationCap className="h-7 w-7 text-indigo-600" />
              <h1 className="text-3xl font-extrabold gradient-text">
                Training Partner Dashboard
              </h1>
            </div>
            <p className="text-slate-500 ml-10">
              Monitor courses, track student outcomes, and align your curriculum with market demand.
            </p>
          </div>
        </div>

        {/* ── Dynamic Stat Cards ─────────────────────────── */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {statCards.map(({ label, value, suffix, icon: Icon, tint, text, loading: isLoading }, i) => (
            <div
              key={label}
              className="glass p-6 transition-transform duration-300 hover:-translate-y-1 animate-fade-up"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tint} shadow-md`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              {isLoading ? (
                <SkeletonBlock className="h-8 w-20 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-slate-800">
                  {value !== null ? `${value.toLocaleString()}${suffix}` : "--%"}
                </p>
              )}
              <p className={`text-sm ${text} font-medium`}>{label}</p>
            </div>
          ))}
        </div>

        {/* ── Courses Panel ──────────────────────────────── */}
        <div className="mb-8 animate-fade-up delay-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="panel-title flex items-center gap-2">
              <BookMarked className="h-5 w-5 text-indigo-500" />
              Your Courses
            </h2>
            <Link
              href="/partner/courses"
              className="btn-ghost flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800 transition-colors"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {coursesLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="glass p-5 space-y-3">
                  <SkeletonBlock className="h-5 w-3/4" />
                  <SkeletonBlock className="h-4 w-1/2" />
                  <div className="flex gap-2 pt-1">
                    <SkeletonBlock className="h-6 w-16 rounded-full" />
                    <SkeletonBlock className="h-6 w-12 rounded-full" />
                  </div>
                  <SkeletonBlock className="h-3 w-full" />
                  <SkeletonBlock className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : displayCourses.length === 0 ? (
            <div className="glass p-10 text-center">
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-slate-500 font-medium">No courses yet</p>
              <p className="text-sm text-slate-400 mt-1">Create your first training program to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {displayCourses.map((course, i) => (
                <Link
                  key={course.id}
                  href="/partner/courses"
                  className="glass card-hover p-5 group animate-fade-up"
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  <h3 className="font-bold text-slate-800 group-hover:text-brand-700 transition-colors truncate">
                    {course.name}
                  </h3>
                  <span className="chip mt-2 inline-block bg-indigo-100 text-indigo-700 text-xs">
                    {course.sector}
                  </span>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {course.duration_weeks}w
                    </span>
                    {course.scheme_id && (
                      <span className="truncate">{course.scheme_id}</span>
                    )}
                    {course.cost_per_candidate !== null && (
                      <span className="font-medium text-slate-600">
                        &#8377;{course.cost_per_candidate.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {course.skills_taught.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {course.skills_taught.slice(0, 3).map((skill) => (
                        <span key={skill} className="chip bg-slate-100 text-slate-600 text-[11px]">
                          {skill}
                        </span>
                      ))}
                      {course.skills_taught.length > 3 && (
                        <span className="chip bg-slate-100 text-slate-400 text-[11px]">
                          +{course.skills_taught.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Navigation Cards ───────────────────────────── */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {navCards.map(({ href, title, desc, icon: Icon, tint }, i) => (
            <Link
              key={href}
              href={href}
              className="group glass card-hover animate-fade-up p-6"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${tint} shadow-md transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-slate-300 transition-all group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-brand-500" />
              </div>
              <h3 className="mt-4 font-bold text-slate-800 group-hover:text-brand-700">
                {title}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-500 opacity-0 transition-opacity group-hover:opacity-100">
                Open <ChevronRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            NEW FEATURES — 5 panels added below existing content
           ═══════════════════════════════════════════════════════════════ */}

        {/* ── 1. Student Outcome Snapshot ─────────────────── */}
        <div className="mb-8 animate-fade-up delay-200">
          <h2 className="panel-title flex items-center gap-2 mb-4">
            <Briefcase className="h-5 w-5 text-emerald-500" />
            Student Outcome Snapshot
          </h2>
          {enrichedLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="glass p-5 space-y-3">
                  <SkeletonBlock className="h-4 w-3/4" />
                  <SkeletonBlock className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : !outcomeSnapshot || outcomeSnapshot.total === 0 ? (
            <div className="glass p-10 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-slate-500 font-medium">No enrollment outcome data yet</p>
              <p className="text-sm text-slate-400 mt-1">Outcomes will appear here once students complete surveys.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="glass p-5 card-hover">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                    <UserCheck className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-slate-500">Employed</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{outcomeSnapshot.employed}</p>
              </div>
              <div className="glass p-5 card-hover">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                    <UserX className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-slate-500">Seeking Work</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{outcomeSnapshot.seeking}</p>
              </div>
              <div className="glass p-5 card-hover">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
                    <Loader2 className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-slate-500">In Training</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{outcomeSnapshot.inTraining}</p>
              </div>
              <div className="glass p-5 card-hover">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-indigo-500">
                    <IndianRupee className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-slate-500">Avg Salary</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {outcomeSnapshot.avgSalary !== null
                    ? `\u20B9${outcomeSnapshot.avgSalary.toLocaleString()}`
                    : "--"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── 2. Employment Status Donut Chart ────────────── */}
        <div className="mb-8 animate-fade-up delay-300">
          <h2 className="panel-title flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            Employment Status Distribution
          </h2>
          {enrichedLoading ? (
            <div className="glass p-6">
              <div className="flex items-center justify-center h-64">
                <SkeletonBlock className="h-48 w-48 rounded-full" />
              </div>
            </div>
          ) : pieData.length === 0 ? (
            <div className="glass p-10 text-center">
              <BarChart3 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-slate-500 font-medium">No outcome data to chart</p>
              <p className="text-sm text-slate-400 mt-1">The donut chart will populate once enrollment outcomes are recorded.</p>
            </div>
          ) : (
            <div className="glass p-6">
              <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                <ResponsiveContainer width="100%" height={260} className="min-w-0">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "rgba(255,255,255,0.95)",
                        border: "none",
                        borderRadius: 12,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-3 min-w-[160px]">
                  {pieData.map((entry, idx) => (
                    <div key={entry.name} className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      <span className="text-sm text-slate-600 font-medium">{entry.name}</span>
                      <span className="text-sm font-bold text-slate-800 ml-auto">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 3. Top Skills Offered ───────────────────────── */}
        <div className="mb-8 animate-fade-up delay-200">
          <h2 className="panel-title flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-violet-500" />
            Top Skills Offered
          </h2>
          {coursesLoading ? (
            <div className="glass p-6 space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : topSkillsOffered.length === 0 ? (
            <div className="glass p-10 text-center">
              <Target className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-slate-500 font-medium">No skills data yet</p>
              <p className="text-sm text-slate-400 mt-1">Add skills to your courses to see them here.</p>
            </div>
          ) : (
            <div className="glass p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <ResponsiveContainer width="100%" height={Math.max(200, topSkillsOffered.length * 32)}>
                  <BarChart
                    data={topSkillsOffered}
                    layout="vertical"
                    margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="skill"
                      width={120}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 15) + "\u2026" : v}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(255,255,255,0.95)",
                        border: "none",
                        borderRadius: 12,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {topSkillsOffered.map((entry) => {
                        const inDemand = marketDemandSet.has(entry.skill.toLowerCase());
                        return (
                          <Cell
                            key={entry.skill}
                            fill={inDemand ? "#6366f1" : "#cbd5e1"}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-indigo-500" />
                  In market demand
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-slate-300" />
                  Not in top demand
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── 4. Recent Students List ────────────────────── */}
        <div className="mb-8 animate-fade-up delay-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="panel-title flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" />
              Recent Students
            </h2>
            <Link
              href="/partner/students"
              className="btn-ghost flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800 transition-colors"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {enrichedLoading ? (
            <div className="glass p-6 space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <SkeletonBlock className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-1/3" />
                    <SkeletonBlock className="h-3 w-1/2" />
                  </div>
                  <SkeletonBlock className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentStudents.length === 0 ? (
            <div className="glass p-10 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-slate-500 font-medium">No students enrolled yet</p>
              <p className="text-sm text-slate-400 mt-1">Student data will appear here after enrollment.</p>
            </div>
          ) : (
            <div className="glass overflow-hidden">
              <div className="divide-y divide-slate-100">
                {recentStudents.map((student, i) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors animate-fade-up"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-xs font-bold text-white">
                      {student.candidate_name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 truncate">
                        {student.candidate_name || "Unknown Student"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {student.course_name || "Unassigned course"}
                      </p>
                    </div>
                    <span
                      className={`chip shrink-0 text-[11px] ${
                        student.is_employed === true
                          ? "bg-emerald-100 text-emerald-700"
                          : student.is_employed === false
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {student.is_employed === true
                        ? "Employed"
                        : student.is_employed === false
                        ? "Seeking"
                        : "In Training"}
                    </span>
                    {student.monthly_salary != null && (
                      <span className="text-sm font-semibold text-slate-700 shrink-0">
                        {"\u20B9"}{student.monthly_salary.toLocaleString()}
                      </span>
                    )}
                    <Link
                      href={`/partner/enrollment/${student.id}`}
                      className="shrink-0 text-brand-500 hover:text-brand-700 transition-colors"
                      title="View enrollment"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── 5. Course Performance ─────────────────────── */}
        <div className="mb-8 animate-fade-up delay-200">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="panel-title flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-violet-500" />
                Course performance
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">Enrollments vs completions</p>
            </div>
            {overallCompletionRate !== null && (
              <span className="chip bg-violet-100 text-violet-700">
                {overallCompletionRate}% overall completion
              </span>
            )}
          </div>

          {performanceLoading ? (
            <div className="glass p-6 space-y-3">
              <SkeletonBlock className="h-64 w-full" />
              <SkeletonBlock className="h-10 w-full" />
            </div>
          ) : performanceChartData.length === 0 ? (
            <div className="glass p-10 text-center">
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-slate-500 font-medium">
                No enrollments recorded yet &mdash; batches will appear here
              </p>
            </div>
          ) : (
            <>
              <div className="glass p-6">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={performanceChartData}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        stroke="#94a3b8"
                        tickFormatter={(v: string) =>
                          v.length > 14 ? `${v.slice(0, 13)}\u2026` : v
                        }
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(255,255,255,0.95)",
                          border: "none",
                          borderRadius: 12,
                          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar
                        dataKey="completed"
                        name="Completed"
                        fill="#7c3aed"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                      />
                      <Bar
                        dataKey="inProgress"
                        name="In progress"
                        fill="#38bdf8"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="glass mt-4 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-6 py-3 font-medium">Course</th>
                        <th className="px-4 py-3 text-right font-medium">Enrolled</th>
                        <th className="px-4 py-3 text-right font-medium">Completed</th>
                        <th className="px-4 py-3 text-right font-medium">In progress</th>
                        <th className="px-4 py-3 text-right font-medium w-44">Completion</th>
                        <th className="hidden px-6 py-3 text-right font-medium md:table-cell">
                          Latest enrollment
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {performanceRows.map((row) => (
                        <tr key={row.id} className="transition-colors hover:bg-slate-50/50">
                          <td className="max-w-[220px] truncate px-6 py-3 font-semibold text-slate-800">
                            {row.name}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">{row.enrolled}</td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-600">
                            {row.completed}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-sky-600">
                            {row.inProgress}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 sm:block">
                                <div
                                  className="h-full rounded-full bg-violet-500 transition-all"
                                  style={{ width: `${row.completionRate}%` }}
                                />
                              </div>
                              <span className="w-10 text-right text-xs font-medium text-slate-600">
                                {row.completionRate}%
                              </span>
                            </div>
                          </td>
                          <td className="hidden px-6 py-3 text-right text-xs text-slate-500 md:table-cell">
                            {formatShortDate(row.latestEnrollment)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── 5b. Course seats & occupancy ───────────────── */}
        <div className="mb-8 animate-fade-up delay-300">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="panel-title flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                Course seats &amp; occupancy
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Batch capacity vs currently enrolled students
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {occupancyTotals.overallPct !== null ? (
                <span className="chip bg-purple-100 text-purple-700">
                  {occupancyTotals.overallPct}% overall occupancy
                </span>
              ) : occupancyTotals.totalCourses > 0 ? (
                <span className="chip bg-slate-100 text-slate-500">No seat capacity data</span>
              ) : null}
              {occupancyTotals.totalSeats > 0 ? (
                <span className="text-sm font-medium text-slate-500">
                  {occupancyTotals.totalFilled} / {occupancyTotals.totalSeats} seats filled
                  {occupancyTotals.courseCount > 0
                    ? ` across ${occupancyTotals.courseCount} course${occupancyTotals.courseCount === 1 ? "" : "s"}`
                    : ""}
                </span>
              ) : occupancyTotals.totalCourses > 0 ? (
                <span className="text-xs text-slate-400">
                  Add seat capacity to your courses to track occupancy
                </span>
              ) : null}
            </div>
          </div>

          {occupancyLoading ? (
            <div className="glass p-6 space-y-5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <SkeletonBlock className="h-4 w-40" />
                  <SkeletonBlock className="h-2.5 w-full" />
                </div>
              ))}
            </div>
          ) : occupancyRows.length === 0 ? (
            <div className="glass p-10 text-center">
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-slate-500 font-medium">No batches published yet</p>
              <p className="text-sm text-slate-400 mt-1">
                Seat occupancy will appear here once you publish course batches.
              </p>
            </div>
          ) : (
            <div className="glass p-6">
              <div className="space-y-5">
                {occupancyRows.map((row, i) => {
                  const hasData = row.occupancyPct !== null;
                  return (
                    <div
                      key={row.id}
                      className="animate-fade-up"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                        <span className="truncate font-semibold text-slate-800">{row.name}</span>
                        <span className={`chip text-[11px] shrink-0 ${OCCUPANCY_CHIP_CLASSES[row.status]}`}>
                          {OCCUPANCY_LABELS[row.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                          {hasData && row.occupancyPct !== 0 && (
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${row.occupancyPct}%`,
                                background: OCCUPANCY_BAR_COLORS[row.status],
                              }}
                            />
                          )}
                        </div>
                        <span
                          className={`w-12 text-right text-sm font-bold ${
                            hasData ? "text-slate-800" : "text-slate-400"
                          }`}
                        >
                          {hasData ? `${row.occupancyPct}%` : "--"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {hasData
                          ? `${row.filled} / ${row.capacity} seats filled`
                          : "Seat capacity unavailable"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── 6. Placement rate by course ────────────────── */}
        <div className="mb-8 animate-fade-up delay-200">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="panel-title flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                Placement rate by course
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Employment outcomes from student surveys
              </p>
            </div>
            {overallPlacementRate !== null && (
              <span className="chip bg-purple-100 text-purple-700">
                {overallPlacementRate}% overall placement
              </span>
            )}
          </div>

          {placementLoading ? (
            <div className="glass p-6 space-y-5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <SkeletonBlock className="h-4 w-40" />
                  <SkeletonBlock className="h-2.5 w-full" />
                </div>
              ))}
            </div>
          ) : coursePlacementData.length === 0 || overallPlacementRate === null ? (
            <div className="glass p-10 text-center">
              <TrendingUp className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-slate-500 font-medium">
                No employment surveys recorded yet &mdash; placement data will appear here
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Ask students to complete outcome surveys to see per-course placement rates.
              </p>
            </div>
          ) : (
            <div className="glass p-6">
              <div className="space-y-5">
                {coursePlacementData.map((row, i) => {
                  const surveyed = row.totalSurveyed;
                  const hasData = surveyed > 0;
                  return (
                    <div key={row.courseId} className="animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate font-semibold text-slate-800">
                            {row.courseName}
                          </span>
                          {row.bestInterval && hasData && (
                            <span className="chip bg-purple-50 text-purple-600 text-[11px] shrink-0">
                              best {row.bestInterval.replace("_", " ")}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="chip bg-slate-100 text-slate-600 text-[11px]">
                            {row.placedCount} placed
                          </span>
                          {row.avgSalary !== null && (
                            <span className="chip bg-emerald-100 text-emerald-700 text-[11px]">
                              &#8377;{formatLakhs(row.avgSalary)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                          {hasData && (
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${row.placementRate}%`,
                                background: "linear-gradient(90deg, #7c3aed, #e879f9)",
                              }}
                            />
                          )}
                        </div>
                        <span
                          className={`w-12 text-right text-sm font-bold ${
                            hasData ? "text-slate-800" : "text-slate-400"
                          }`}
                        >
                          {hasData ? `${row.placementRate}%` : "--"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {surveyed} outcome{surveyed === 1 ? "" : "s"} surveyed
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── 7. Program Value / Cost Summary ─────────────── */}
        <div className="mb-8 animate-fade-up delay-300">
          <h2 className="panel-title flex items-center gap-2 mb-4">
            <IndianRupee className="h-5 w-5 text-amber-500" />
            Program Value Summary
          </h2>
          {coursesLoading ? (
            <div className="glass p-6 space-y-3">
              <SkeletonBlock className="h-5 w-48" />
              <SkeletonBlock className="h-4 w-64" />
              <SkeletonBlock className="h-4 w-56" />
            </div>
          ) : !costSummary ? (
            <div className="glass p-10 text-center">
              <IndianRupee className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-slate-500 font-medium">No cost data available</p>
              <p className="text-sm text-slate-400 mt-1">Add cost-per-candidate to your courses to see program value metrics.</p>
            </div>
          ) : (
            <div className="glass p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Avg Program Cost</p>
                  <p className="text-3xl font-extrabold text-slate-800">
                    {"\u20B9"}{costSummary.avgCost.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    per candidate ({costSummary.coursesWithCost} of {costSummary.totalCourses} courses with cost data)
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Current Placement Rate</p>
                  <p className="text-3xl font-extrabold text-slate-800">
                    {costSummary.placementRate !== null && costSummary.placementRate !== undefined
                      ? `${Math.round(costSummary.placementRate)}%`
                      : "--"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {costSummary.placementRate !== null && costSummary.placementRate !== undefined && costSummary.avgCost > 0
                      ? `~\u20B9${Math.round(costSummary.avgCost / Math.max(costSummary.placementRate, 1) * 100)} effective cost per placement`
                      : "Insufficient data to compute cost-per-placement"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Courses Offering Skills</p>
                  <p className="text-3xl font-extrabold text-slate-800">
                    {costSummary.totalCourses}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Training programs currently active on the platform
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── ML Placement Prediction Engine Banner ──────── */}
        <div className="glass mt-8 border-brand-200/60 p-6 animate-fade-up delay-300">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-lg ${
                  ready
                    ? "bg-gradient-to-br from-emerald-500 to-teal-500"
                    : ready === null
                    ? "bg-gradient-to-br from-slate-400 to-slate-500"
                    : "bg-gradient-to-br from-amber-500 to-orange-500"
                }`}
              >
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  ML Placement Prediction Engine
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      ready
                        ? "bg-emerald-500 animate-pulse"
                        : ready === null
                        ? "bg-slate-400"
                        : "bg-amber-500"
                    }`}
                  />
                </h3>
                <p className="text-sm text-slate-500 max-w-lg">
                  {ready === null
                    ? "Checking model status\u2026"
                    : ready
                    ? "AI model live \u2014 forecast placement likelihood for your students."
                    : "Placement model not loaded yet. Run the training script to enable forecasts."}
                </p>
              </div>
            </div>
            <span
              className={`chip shrink-0 ${
                ready
                  ? "bg-emerald-100 text-emerald-700"
                  : ready === null
                  ? "bg-slate-100 text-slate-500"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {ready === null ? "Checking" : ready ? "Active" : "Offline"}
            </span>
          </div>
        </div>

        {/* ── 8. Import Employment Outcomes ──────────────── */}
        <OutcomeImportPanel />
      </div>
    </main>
  );
}
