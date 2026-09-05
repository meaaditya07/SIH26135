"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import {
  Users, Building2, Briefcase, GraduationCap, TrendingUp, AlertTriangle,
  BarChart3, ShieldCheck, BookOpen, Clock, ChevronRight, Activity,
  CheckCircle2, XCircle, AlertCircle, MapPin, PieChart, Download,
  FileText, Table, ClipboardList, Settings2, Map as MapIcon, Award, School,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend, PieChart as RePieChart, Pie,
} from "recharts";
import {
  useDashboardStats, useEnrollmentTrends, useTopSkills,
  useSchemeROI, usePolicyAlerts, useCandidates, useEnrollments,
  useCourses, useEmployers, useTrainingPartners,
  downloadReport,
} from "@/lib/hooks/useDashboard";
import type { DashboardStats, PolicyAlert, SchemeAnalytics, CandidateListItem, EnrollmentListItem, ReportFormat } from "@/lib/types";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import Toast from "@/components/ui/Toast";

// ── CountUp animated counter ────────────────────────────────────────────────

function CountUp({ end, suffix = "", duration = 1200, decimals = 0 }: {
  end: number;
  suffix?: string;
  duration?: number;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * end);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [end, duration]);

  return (
    <span>
      {decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString()}
      {suffix}
    </span>
  );
}

// ── Relative time helper ────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── CSV export helper ───────────────────────────────────────────────────────

function CsvButton({ data, filename }: { data: Record<string, unknown>[]; filename: string }) {
  const handleDownload = useCallback(() => {
    if (!data || data.length === 0) return;
    const keys = Object.keys(data[0]);
    const csvEscape = (val: unknown) => {
      if (val === null || val === undefined) return "";
      const s = String(val);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const header = keys.map(csvEscape).join(",");
    const rows = data.map((row) => keys.map((k) => csvEscape(row[k])).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, filename]);

  return (
    <button
      onClick={handleDownload}
      className="btn-ghost flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:text-brand-600"
      title={`Download ${filename}`}
    >
      <Download className="h-3 w-3" />
      CSV
    </button>
  );
}

// ── Server-side report export button ────────────────────────────────────────

function ReportButton({
  reportType,
  format,
  label,
  icon: Icon,
  disabled,
  onToast,
}: {
  reportType: string;
  format: ReportFormat;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled: boolean;
  onToast: (message: string, tone: "success" | "error" | "info") => void;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (disabled || downloading) return;
    setDownloading(true);
    onToast(`Downloading ${label} report…`, "info");
    try {
      await downloadReport(reportType, format);
      onToast(`${label} report downloaded.`, "success");
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Download failed. Check your permissions.";
      onToast(msg, "error");
    } finally {
      setDownloading(false);
    }
  }, [reportType, format, label, disabled, downloading, onToast]);

  return (
    <button
      onClick={handleDownload}
      disabled={disabled || downloading}
      title={`Download ${label}`}
      className={`btn-ghost flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:text-brand-600 ${
        disabled ? "cursor-not-allowed opacity-40" : ""
      }`}
    >
      {downloading ? (
        <span className="h-3 w-3 animate-spin rounded-full border border-slate-400 border-t-transparent" />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {label}
    </button>
  );
}

// ── KPI card config ─────────────────────────────────────────────────────────

const kpiConfig = [
  { label: "Total Candidates", key: "total_candidates" as keyof DashboardStats, icon: Users, tint: "from-brand-500 to-indigo-500", text: "text-brand-600", href: "#" },
  { label: "Training Partners", key: "total_training_partners" as keyof DashboardStats, icon: Building2, tint: "from-emerald-500 to-teal-500", text: "text-emerald-600", href: "#" },
  { label: "Active Employers", key: "total_employers" as keyof DashboardStats, icon: Briefcase, tint: "from-violet-500 to-fuchsia-500", text: "text-violet-600", href: "#" },
  { label: "Enrollments", key: "total_enrollments" as keyof DashboardStats, icon: GraduationCap, tint: "from-orange-500 to-amber-500", text: "text-orange-600", href: "#" },
  { label: "Courses", key: "total_courses" as keyof DashboardStats, icon: BookOpen, tint: "from-cyan-500 to-sky-500", text: "text-cyan-600", href: "#" },
  { label: "Placement Rate", key: "overall_placement_rate" as keyof DashboardStats, icon: TrendingUp, tint: "from-sky-500 to-cyan-500", text: "text-sky-600", href: "#", isPercent: true },
];

// ── Chart tooltip style ─────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(12px)",
    fontSize: 12,
    boxShadow: "0 12px 40px rgba(15,23,42,0.12)",
  },
};

// ── ROI badge color helper ──────────────────────────────────────────────────

function roiBadge(score: number | null) {
  if (score === null || score === undefined) return "bg-slate-100 text-slate-500";
  if (score > 3) return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
  if (score >= 2) return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
  return "bg-rose-100 text-rose-700 ring-1 ring-rose-200";
}

function alertChip(status: string) {
  if (status === "alert") return "bg-rose-100 text-rose-700 ring-1 ring-rose-200";
  if (status === "underperforming") return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
  return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
}

// ── Sector donut palette ────────────────────────────────────────────────────

const SECTOR_COLORS = [
  "#4f46e5", "#7c3aed", "#06b6d4", "#10b981",
  "#f59e0b", "#f43f5e", "#8b5cf6", "#14b8a6",
  "#6366f1", "#84cc16",
];

// ── Completion progress bar color helper ────────────────────────────────────

function completionColor(rate: number | null) {
  if (rate === null || rate === undefined) return "bg-slate-300";
  if (rate >= 75) return "bg-gradient-to-r from-emerald-500 to-teal-400";
  if (rate >= 50) return "bg-gradient-to-r from-amber-500 to-orange-400";
  return "bg-gradient-to-r from-rose-500 to-red-400";
}

// ── Skeleton components ─────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="glass p-5 animate-pulse">
      <div className="mb-3 h-10 w-10 rounded-xl skeleton" />
      <div className="mb-2 h-7 w-20 rounded-lg skeleton" />
      <div className="h-4 w-24 rounded skeleton" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="glass p-6 animate-pulse">
      <div className="mb-4 h-5 w-40 rounded skeleton" />
      <div className="h-72 w-full rounded-xl skeleton" />
    </div>
  );
}

function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass-inner p-4 animate-pulse">
          <div className="h-4 w-3/4 rounded skeleton mb-2" />
          <div className="h-3 w-1/2 rounded skeleton" />
        </div>
      ))}
    </div>
  );
}

// ── Quick action tile ───────────────────────────────────────────────────────

function QuickActionTile({ href, icon: Icon, title, subtitle, tint }: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  tint: string;
}) {
  return (
    <Link
      href={href}
      className="glass card-hover group flex items-center gap-3 p-4 animate-fade-up"
    >
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tint} shadow-md transition-transform duration-300 group-hover:scale-110`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="font-bold text-slate-800">{title}</p>
        <p className="truncate text-xs text-slate-500">{subtitle}</p>
      </div>
      <ChevronRight className="ml-auto h-4 w-4 flex-shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-500" />
    </Link>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────

export default function GovDashboard() {
  useRequireAuth("gov_admin");

  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);

  const showToast = useCallback(
    (message: string, tone: "success" | "error" | "info") => {
      setToast({ message, tone });
    },
    []
  );

  const { data: stats, loading: statsLoading } = useDashboardStats();
  const { data: trends, loading: trendsLoading } = useEnrollmentTrends(6);
  const { data: topSkills, loading: skillsLoading } = useTopSkills(10);
  const { data: schemes, loading: schemesLoading } = useSchemeROI();
  const { data: alerts, loading: alertsLoading } = usePolicyAlerts();
  const { data: candidates, loading: candidatesLoading } = useCandidates(5);
  const { data: enrollments, loading: enrollmentsLoading } = useEnrollments(5);
  const { data: courses, loading: coursesLoading } = useCourses(200);
  const { data: employers, loading: employersLoading } = useEmployers(20);
  const { data: partners, loading: partnersLoading } = useTrainingPartners(20);

  // Merged recent activity feed
  const activityFeed = useMemo(() => {
    const items: { type: "candidate" | "enrollment"; name: string; detail: string; time: string }[] = [];

    for (const c of (candidates ?? []).slice(0, 5)) {
      items.push({
        type: "candidate",
        name: c.full_name,
        detail: c.state ?? "Unknown state",
        time: c.created_at,
      });
    }
    for (const e of (enrollments ?? []).slice(0, 5)) {
      items.push({
        type: "enrollment",
        name: `Enrollment #${e.id.slice(0, 8)}`,
        detail: e.is_completed ? "Completed" : "In progress",
        time: e.created_at,
      });
    }
    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return items.slice(0, 8);
  }, [candidates, enrollments]);

  // ── NEW: Regional breakdown (candidates grouped by state) ──────────────
  const regionalData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of candidates ?? []) {
      const state = c.state?.trim() || "Unknown";
      counts.set(state, (counts.get(state) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [candidates]);

  const stateCount = useMemo(
    () => new Set((candidates ?? []).map((c) => c.state?.trim() || "Unknown")).size,
    [candidates]
  );

  // ── NEW: Sector distribution donut (courses grouped by sector) ──────────
  const sectorData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const course of courses ?? []) {
      const sector = course.sector?.trim() || "Unclassified";
      counts.set(sector, (counts.get(sector) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, value], i) => ({
        name,
        value,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [courses]);

  // ── NEW: Top employers / partners leaderboards (recently added) ────────
  const recentEmployers = useMemo(
    () => [...(employers ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
    [employers]
  );
  const recentPartners = useMemo(
    () => [...(partners ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
    [partners]
  );

  // ── NEW: Scheme progress widgets (reuse schemes) ────────────────────────
  const schemesForProgress = useMemo(() => schemes.slice(0, 6), [schemes]);

  // ── NEW: Scheme-by-state comparison ──────────────────────────────────────
  const stateComparison = useMemo(() => {
    if (schemes.length === 0) return { chartData: [], tableRows: [], states: [], topSchemes: [] };

    type Row = { scheme_id: string; state: string; total_enrolled: number; completion_rate: number | null; placed_12m: number; roi_score: number | null; alert_status: string };

    const map = new Map<string, Row>();
    for (const s of schemes) {
      const st = s.state?.trim() || "Unknown";
      const key = `${s.scheme_id}|||${st}`;
      const existing = map.get(key);
      if (existing) {
        existing.total_enrolled += s.total_enrolled;
        existing.placed_12m += s.total_placed_12m;
      } else {
        map.set(key, {
          scheme_id: s.scheme_id,
          state: st,
          total_enrolled: s.total_enrolled,
          completion_rate: s.completion_rate,
          placed_12m: s.total_placed_12m,
          roi_score: s.roi_score,
          alert_status: s.alert_status,
        });
      }
    }

    const allRows = Array.from(map.values());

    const schemeTotals = new Map<string, number>();
    for (const r of allRows) {
      schemeTotals.set(r.scheme_id, (schemeTotals.get(r.scheme_id) ?? 0) + r.total_enrolled);
    }
    const topSchemes = Array.from(schemeTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => id);

    const stateTotals = new Map<string, number>();
    for (const r of allRows) {
      if (topSchemes.includes(r.scheme_id)) {
        stateTotals.set(r.state, (stateTotals.get(r.state) ?? 0) + r.total_enrolled);
      }
    }
    const states = Array.from(stateTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([s]) => s);

    const filteredRows = allRows.filter(
      (r) => topSchemes.includes(r.scheme_id) && states.includes(r.state)
    );

    const chartMap = new Map<string, Record<string, number | string>>();
    for (const sid of topSchemes) {
      chartMap.set(sid, { scheme_id: sid });
    }
    for (const r of filteredRows) {
      const entry = chartMap.get(r.scheme_id);
      if (entry) entry[r.state] = r.total_enrolled;
    }
    const chartData = Array.from(chartMap.values());

    return { chartData, tableRows: filteredRows, states, topSchemes };
  }, [schemes]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Admin Console" subtitle="National outcome analytics" />
        <main className="space-y-6 p-6">

          {toast && <Toast message={toast.message} tone={toast.tone} />}

          {/* ── Welcome Banner ──────────────────────────────────────────── */}
          <div className="glass animate-fade-up overflow-hidden p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 via-brand-700 to-brand-500 shadow-lg shadow-brand-700/30">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-slate-900">
                      {statsLoading ? "National Overview" : "Welcome back, Administrator"}
                    </h2>
                    <span className="chip bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm">
                      Admin
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    Live snapshot of learning, placement, and labor intelligence across schemes.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="chip bg-emerald-100 text-emerald-700">
                  <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live data
                </span>
              </div>
            </div>
          </div>

          {/* ── Content Management CTA ─────────────────────────────────── */}
          <Link
            href="/gov/manage"
            className="glass card-hover group flex flex-wrap items-center justify-between gap-4 p-6 animate-fade-up delay-100"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30 transition-transform duration-300 group-hover:scale-110">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  Manage Portal Content
                  <span className="chip bg-brand-100 text-brand-700">Editable</span>
                </h3>
                <p className="text-sm text-slate-500">
                  Add, edit, or remove candidates, courses, employers, training partners, enrollments, and job postings.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-600">
              Open Manager
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* ── Animated KPI Cards ──────────────────────────────────────── */}
          {statsLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {kpiConfig.map(({ label, key, icon: Icon, tint, text, href, isPercent }, i) => (
                <Link
                  key={label}
                  href={href}
                  className="glass card-hover p-5 animate-fade-up"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tint} shadow-md`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">
                    <CountUp end={stats?.[key] ?? 0} suffix={isPercent ? "%" : ""} decimals={isPercent ? 1 : 0} />
                  </p>
                  <p className={`text-sm font-medium ${text}`}>{label}</p>
                  {isPercent && typeof stats?.overall_placement_rate === "number" && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-1000 ease-out"
                        style={{ width: `${stats.overall_placement_rate}%` }}
                      />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}

          {/* ── Charts Row ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Enrollment Trend Area Chart */}
            {trendsLoading ? <SkeletonChart /> : (
              <div className="glass p-6 animate-fade-up delay-100">
                <h3 className="panel-title mb-4">
                  <Activity className="h-4 w-4 text-brand-600" />
                  Enrollment &amp; Completion Trends
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends?.months ?? []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <defs>
                        <linearGradient id="gradEnroll" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradComp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <Tooltip {...tooltipStyle} />
                      <Legend verticalAlign="top" height={36} />
                      <Area
                        type="monotone"
                        dataKey="enrollments"
                        name="Enrollments"
                        stroke="#4f46e5"
                        strokeWidth={2.5}
                        fill="url(#gradEnroll)"
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="completions"
                        name="Completions"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fill="url(#gradComp)"
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Top Skills Horizontal Bar Chart */}
            {skillsLoading ? <SkeletonChart /> : (
              <div className="glass p-6 animate-fade-up delay-200">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="panel-title">
                    <BarChart3 className="h-4 w-4 text-violet-600" />
                    Top In-Demand Skills
                  </h3>
                  {topSkills?.skills && topSkills.skills.length > 0 && (
                    <CsvButton
                      data={topSkills.skills.map((s) => ({ skill: s.skill, demand: s.demand }))}
                      filename="skills-demand.csv"
                    />
                  )}
                </div>
                {(!topSkills?.skills || topSkills.skills.length === 0) ? (
                  <div className="flex h-72 flex-col items-center justify-center text-slate-400">
                    <BarChart3 className="mb-3 h-12 w-12 opacity-30" />
                    <p className="text-sm font-medium">No skill data available yet</p>
                    <p className="mt-1 text-xs text-slate-300">Data will appear as candidates complete training</p>
                  </div>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topSkills.skills}
                        layout="vertical"
                        margin={{ left: 10, right: 20 }}
                      >
                        <defs>
                          <linearGradient id="gradSkill" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#4f46e5" />
                            <stop offset="100%" stopColor="#7c3aed" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="skill" width={120} tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} />
                        <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
                        <Bar
                          dataKey="demand"
                          name="Demand"
                          fill="url(#gradSkill)"
                          radius={[0, 6, 6, 0]}
                          maxBarSize={24}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Bottom Row: Scheme Performance + Policy Alerts ──────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-fade-up delay-300">

            {/* Scheme Performance Panel */}
            <div className="glass p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="panel-title">
                  <BarChart3 className="h-4 w-4 text-amber-500" />
                  Scheme Performance
                </h3>
                <div className="flex items-center gap-2">
                  {schemes.length > 0 && (
                    <CsvButton
                      data={schemes.map((s) => ({
                        scheme_id: s.scheme_id,
                        total_enrolled: s.total_enrolled,
                        completion_rate: s.completion_rate,
                        cost_per_placement: s.cost_per_placement,
                        roi_score: s.roi_score,
                        alert_status: s.alert_status,
                      }))}
                      filename="scheme-performance.csv"
                    />
                  )}
                  <ReportButton
                    reportType="scheme-roi"
                    format="pdf"
                    label="PDF"
                    icon={FileText}
                    disabled={schemesLoading || schemes.length === 0}
                    onToast={showToast}
                  />
                  <Link href="/gov/scheme-roi" className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-xs font-medium">
                    View all <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
              {schemesLoading ? (
                <SkeletonList rows={4} />
              ) : schemes.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center text-slate-400">
                  <BarChart3 className="mb-2 h-10 w-10 opacity-30" />
                  <p className="text-sm font-medium">No scheme data yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {schemes.slice(0, 5).map((s, i) => (
                    <div
                      key={s.scheme_id}
                      className="glass-inner flex items-center justify-between p-4 transition hover:bg-white/80 animate-fade-up"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <div className="flex-1">
                        <p className="font-bold text-slate-800">{s.scheme_id}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                          <span>{s.total_enrolled.toLocaleString()} enrolled</span>
                          <span>&middot;</span>
                          <span>{s.completion_rate !== null ? `${s.completion_rate}%` : "—"} completion</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${roiBadge(s.roi_score)}`}>
                          ROI {s.roi_score !== null ? s.roi_score.toFixed(1) : "—"}
                        </span>
                        <span className={`chip text-[10px] ${alertChip(s.alert_status)}`}>
                          {s.alert_status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Policy Alerts Panel */}
            <div className="glass p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="panel-title">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  Policy Alerts
                </h3>
                <Link href="/gov/alerts" className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-xs font-medium">
                  View all <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              {alertsLoading ? (
                <SkeletonList rows={3} />
              ) : alerts.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                  </div>
                  <p className="font-semibold text-slate-700">All systems healthy</p>
                  <p className="mt-1 text-sm text-slate-400">No policy alerts at this time</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((a, i) => (
                    <div
                      key={a.scheme_id}
                      className="glass-inner flex items-start gap-3 p-4 animate-fade-up"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {a.alert_status === "alert" ? (
                          <span className="relative flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
                          </span>
                        ) : (
                          <span className="relative flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800">{a.scheme_id}</p>
                          <span className={`chip text-[10px] ${alertChip(a.alert_status)}`}>
                            {a.alert_status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                          {a.alert_reason ?? "No reason provided"}
                        </p>
                        <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
                          {a.roi_score !== null && (
                            <span className={`font-semibold ${a.roi_score < 2 ? "text-rose-500" : a.roi_score < 3 ? "text-amber-500" : "text-emerald-500"}`}>
                              ROI {a.roi_score.toFixed(1)}
                            </span>
                          )}
                          {a.cost_per_placement !== null && (
                            <span>₹{a.cost_per_placement.toLocaleString()}/placement</span>
                          )}
                          {a.computed_at && (
                            <span>{timeAgo(a.computed_at)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Recent Activity Feed ────────────────────────────────────── */}
          <div className="glass p-6 animate-fade-up delay-300">
            <h3 className="panel-title mb-4">
              <Clock className="h-4 w-4 text-indigo-500" />
              Recent Activity
            </h3>
            {(candidatesLoading || enrollmentsLoading) ? (
              <SkeletonList rows={5} />
            ) : activityFeed.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-slate-400">
                <Clock className="mb-2 h-8 w-8 opacity-30" />
                <p className="text-sm font-medium">No recent activity</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-brand-200 via-indigo-200 to-transparent" />
                <div className="space-y-1">
                  {activityFeed.map((item, i) => (
                    <div
                      key={`${item.type}-${item.name}-${i}`}
                      className="relative flex items-center gap-4 rounded-xl py-3 pl-10 pr-4 transition hover:bg-white/50 animate-fade-up"
                      style={{ animationDelay: `${i * 0.04}s` }}
                    >
                      <div className="absolute left-2 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-100">
                        {item.type === "candidate" ? (
                          <Users className="h-2.5 w-2.5 text-brand-500" />
                        ) : (
                          <BookOpen className="h-2.5 w-2.5 text-emerald-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.detail}</p>
                      </div>
                      <span className="flex-shrink-0 text-xs text-slate-400">{timeAgo(item.time)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── NEW: Export / Quick Actions Row ────────────────────────── */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-400">
              <Download className="h-4 w-4" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <QuickActionTile
                href="/gov/reports"
                icon={FileText}
                title="Reports & Exports"
                subtitle="CSV / XLSX / PDF analytics"
                tint="from-brand-500 to-indigo-500"
              />
              <QuickActionTile
                href="/gov/surveys"
                icon={ClipboardList}
                title="Outcome Surveys"
                subtitle="Track post-training outcomes"
                tint="from-emerald-500 to-teal-500"
              />
              <QuickActionTile
                href="/gov/manage"
                icon={Settings2}
                title="Content Manager"
                subtitle="Edit portal entities"
                tint="from-violet-500 to-fuchsia-500"
              />
              <QuickActionTile
                href="/gov/heatmap"
                icon={MapIcon}
                title="Skill-Gap Map"
                subtitle="Regional labor heatmap"
                tint="from-orange-500 to-amber-500"
              />
            </div>
          </div>

          {/* ── NEW: Regional Breakdown + Sector Donut row ──────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-fade-up delay-200">

            {/* Regional Breakdown */}
            <div className="glass p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="panel-title">
                  <MapPin className="h-4 w-4 text-sky-600" />
                  Regional Candidate Breakdown
                </h3>
                <div className="flex items-center gap-2">
                  {regionalData.length > 0 && (
                    <CsvButton
                      data={regionalData.map((r) => ({ state: r.state, count: r.count }))}
                      filename="regional-breakdown.csv"
                    />
                  )}
                  <ReportButton
                    reportType="regional-candidates"
                    format="pdf"
                    label="PDF"
                    icon={FileText}
                    disabled={candidatesLoading || regionalData.length === 0}
                    onToast={showToast}
                  />
                  <ReportButton
                    reportType="regional-candidates"
                    format="xlsx"
                    label="XLSX"
                    icon={Table}
                    disabled={candidatesLoading || regionalData.length === 0}
                    onToast={showToast}
                  />
                  {!candidatesLoading && stateCount > 0 && (
                    <span className="chip bg-sky-100 text-sky-700">{stateCount} states</span>
                  )}
                </div>
              </div>
              {candidatesLoading ? (
                <SkeletonChart />
              ) : regionalData.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-slate-400">
                  <MapPin className="mb-3 h-12 w-12 opacity-30" />
                  <p className="text-sm font-medium">No candidate geo-data yet</p>
                  <p className="mt-1 text-xs text-slate-300">Candidates will appear once profiles are created</p>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={regionalData}
                      layout="vertical"
                      margin={{ left: 10, right: 20 }}
                    >
                      <defs>
                        <linearGradient id="gradState" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#0ea5e9" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="state" width={130} tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} />
                      <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(14,165,233,0.06)" }} />
                      <Bar
                        dataKey="count"
                        name="Candidates"
                        fill="url(#gradState)"
                        radius={[0, 6, 6, 0]}
                        maxBarSize={22}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Sector Distribution Donut */}
            <div className="glass p-6">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="panel-title">
                  <PieChart className="h-4 w-4 text-fuchsia-600" />
                  Course Sector Mix
                </h3>
                {sectorData.length > 0 && (
                  <CsvButton
                    data={sectorData.map((s) => ({ name: s.name, value: s.value }))}
                    filename="sector-distribution.csv"
                  />
                )}
              </div>
              {coursesLoading ? (
                <SkeletonChart />
              ) : sectorData.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-slate-400">
                  <PieChart className="mb-3 h-12 w-12 opacity-30" />
                  <p className="text-sm font-medium">No course sector data yet</p>
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center gap-2 sm:flex-row sm:justify-center">
                  <div className="h-56 w-56 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={sectorData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={80}
                          paddingAngle={2}
                          strokeWidth={0}
                        >
                          {sectorData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="max-h-56 w-full flex-1 space-y-1.5 overflow-auto pr-1 sm:max-h-64">
                    {sectorData.slice(0, 8).map((s) => (
                      <div key={s.name} className="flex items-center gap-2 text-xs">
                        <span
                          className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="truncate font-medium text-slate-700">{s.name}</span>
                        <span className="ml-auto flex-shrink-0 font-semibold text-slate-500">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── NEW: Scheme Completion Progress Widgets ─────────────────── */}
          <div className="glass p-6 animate-fade-up delay-300">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="panel-title">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Scheme Completion Progress
              </h3>
              <span className="chip bg-emerald-100 text-emerald-700">{schemesForProgress.length} schemes</span>
            </div>
            {schemesLoading ? (
              <SkeletonList rows={4} />
            ) : schemesForProgress.length === 0 ? (
              <div className="flex h-24 flex-col items-center justify-center text-slate-400">
                <TrendingUp className="mb-2 h-8 w-8 opacity-30" />
                <p className="text-sm font-medium">No scheme completion data yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {schemesForProgress.map((s, i) => {
                  const rate = s.completion_rate ?? 0;
                  return (
                    <div
                      key={s.scheme_id}
                      className="glass-inner p-4 transition hover:bg-white/80 animate-fade-up"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="truncate font-bold text-slate-800" title={s.scheme_id}>{s.scheme_id}</p>
                        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${roiBadge(s.roi_score)}`}>
                          ROI {s.roi_score !== null ? s.roi_score.toFixed(1) : "—"}
                        </span>
                      </div>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span>{s.total_completed.toLocaleString()} / {s.total_enrolled.toLocaleString()} completed</span>
                        <span className="font-bold text-slate-700">{rate}%</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${completionColor(s.completion_rate)}`}
                          style={{ width: `${Math.min(rate, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── NEW: Scheme Performance by State ─────────────────────────── */}
          <div className="glass p-6 animate-fade-up delay-300">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="panel-title">
                <MapPin className="h-4 w-4 text-violet-600" />
                Scheme Performance by State
              </h3>
              <div className="flex items-center gap-2">
                {stateComparison.tableRows.length > 0 && (
                  <CsvButton
                    data={stateComparison.tableRows.map((r) => ({
                      scheme_id: r.scheme_id,
                      state: r.state,
                      total_enrolled: r.total_enrolled,
                      completion_rate: r.completion_rate,
                      placed_12m: r.placed_12m,
                      roi_score: r.roi_score,
                      alert_status: r.alert_status,
                    }))}
                    filename="scheme-by-state.csv"
                  />
                )}
                {!schemesLoading && stateComparison.states.length > 0 && (
                  <span className="chip bg-violet-100 text-violet-700">{stateComparison.states.length} states</span>
                )}
              </div>
            </div>
            {schemesLoading ? (
              <SkeletonChart />
            ) : stateComparison.chartData.length === 0 ? (
              <div className="flex h-72 flex-col items-center justify-center text-slate-400">
                <MapPin className="mb-3 h-12 w-12 opacity-30" />
                <p className="text-sm font-medium">No state-level scheme data yet</p>
                <p className="mt-1 text-xs text-slate-300">Data will appear as schemes report across regions</p>
              </div>
            ) : (
              <>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stateComparison.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                      <XAxis dataKey="scheme_id" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <Tooltip {...tooltipStyle} />
                      <Legend verticalAlign="top" height={36} />
                      {stateComparison.states.map((st, idx) => {
                        const colors = ["#7c3aed", "#6366f1", "#e879f9", "#38bdf8"];
                        return (
                          <Bar key={st} dataKey={st} name={st} fill={colors[idx % colors.length]} radius={[4, 4, 0, 0]} maxBarSize={32} />
                        );
                      })}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-2 pr-3 text-left font-semibold text-slate-600">Scheme</th>
                        <th className="py-2 pr-3 text-left font-semibold text-slate-600">State</th>
                        <th className="py-2 pr-3 text-right font-semibold text-slate-600">Enrolled</th>
                        <th className="py-2 pr-3 text-right font-semibold text-slate-600">Completion</th>
                        <th className="py-2 pr-3 text-right font-semibold text-slate-600">Placed 12m</th>
                        <th className="py-2 pr-3 text-right font-semibold text-slate-600">ROI</th>
                        <th className="py-2 text-right font-semibold text-slate-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stateComparison.tableRows.map((r, i) => (
                        <tr key={`${r.scheme_id}-${r.state}`} className="border-b border-slate-100 transition hover:bg-white/60" style={{ animationDelay: `${i * 0.03}s` }}>
                          <td className="py-2 pr-3 font-medium text-slate-800">{r.scheme_id}</td>
                          <td className="py-2 pr-3 text-slate-600">{r.state}</td>
                          <td className="py-2 pr-3 text-right font-semibold text-slate-700">{r.total_enrolled.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-right text-slate-600">{r.completion_rate !== null ? `${r.completion_rate}%` : "—"}</td>
                          <td className="py-2 pr-3 text-right text-slate-600">{r.placed_12m.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-right">
                            <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${roiBadge(r.roi_score)}`}>
                              {r.roi_score !== null ? r.roi_score.toFixed(1) : "—"}
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            <span className={`chip text-[10px] ${alertChip(r.alert_status)}`}>{r.alert_status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* ── NEW: Top Employers / Training Partners Leaderboard ──────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-fade-up delay-300">

            {/* Top Employers */}
            <div className="glass p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="panel-title">
                  <Award className="h-4 w-4 text-violet-500" />
                  Recently Added Employers
                </h3>
                <div className="flex items-center gap-2">
                  {recentEmployers.length > 0 && (
                    <CsvButton
                      data={recentEmployers.map((e) => ({
                        name: e.name,
                        industry: e.industry ?? "",
                        state: e.state ?? "",
                        is_verified: e.is_verified,
                      }))}
                      filename="employers.csv"
                    />
                  )}
                  <Link href="/gov/manage" className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-xs font-medium">
                    Manage <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
              {employersLoading ? (
                <SkeletonList rows={5} />
              ) : recentEmployers.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-slate-400">
                  <Briefcase className="mb-2 h-9 w-9 opacity-30" />
                  <p className="text-sm font-medium">No employers registered yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentEmployers.map((e, i) => (
                    <div
                      key={e.id}
                      className="glass-inner flex items-center gap-3 p-3 animate-fade-up"
                      style={{ animationDelay: `${i * 0.04}s` }}
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-sm">
                        <Briefcase className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800">{e.name}</p>
                        <p className="truncate text-xs text-slate-400">
                          {[e.industry, e.state].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-1">
                        {e.is_verified && (
                          <span className="chip bg-emerald-100 text-emerald-700 text-[10px]">Verified</span>
                        )}
                        <span className="text-xs text-slate-400">{timeAgo(e.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Training Partners */}
            <div className="glass p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="panel-title">
                  <School className="h-4 w-4 text-emerald-600" />
                  Recently Added Training Partners
                </h3>
                <Link href="/gov/manage" className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-xs font-medium">
                  Manage <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              {partnersLoading ? (
                <SkeletonList rows={5} />
              ) : recentPartners.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-slate-400">
                  <Building2 className="mb-2 h-9 w-9 opacity-30" />
                  <p className="text-sm font-medium">No training partners registered yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPartners.map((p, i) => (
                    <div
                      key={p.id}
                      className="glass-inner flex items-center gap-3 p-3 animate-fade-up"
                      style={{ animationDelay: `${i * 0.04}s` }}
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm">
                        <School className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800">{p.name}</p>
                        <p className="truncate text-xs text-slate-400">
                          {[p.state, p.district].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-1">
                        {p.is_approved ? (
                          <span className="chip bg-emerald-100 text-emerald-700 text-[10px]">Approved</span>
                        ) : (
                          <span className="chip bg-amber-100 text-amber-700 text-[10px]">Pending</span>
                        )}
                        <span className="text-xs text-slate-400">{timeAgo(p.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
