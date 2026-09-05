"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import Link from "next/link";
import {
  Briefcase, Users, Target, ArrowUpRight, MapPin, IndianRupee,
  BarChart3, ChevronRight, PlusCircle, FileSearch, Sparkles, Clock,
  CheckCircle2, XCircle, TrendingUp, TrendingDown, Zap, UserCheck,
  Layers, Rabbit, BadgeCheck, FileText, Wand2, User, Phone, Copy,
  Bookmark, Bell, X, CalendarDays,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import { formatISODate, formatISODateTime, formatINR } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import {
  useJobPostings, useDashboardStats, usePolicyAlerts, useJobApplicants,
  useCandidates, useEmployerShortlist, unshortlistCandidate, updateShortlistNote,
  useEmployerNotifications, markEmployerNotificationRead, useSectorBenchmark,
  notifyShortlistedCandidates, useEmployerApplicationsOverview,
} from "@/lib/hooks/useDashboard";
import type { JobPostingListItem, JobApplicant, CandidateListItem, ShortlistCandidate, NotificationItem, SectorBenchmark, FunnelStage } from "@/lib/types";

/* ── Animated counter ────────────────────────────────────────────────────── */

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

/* ── Helpers ─────────────────────────────────────────────────────────────── */

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

function formatSalary(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Not specified";
  const fmt = (n: number) => {
    if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toString();
  };
  if (min !== null && max !== null) return `₹${fmt(min)} – ₹${fmt(max)}`;
  if (min !== null) return `From ₹${fmt(min)}`;
  return `Up to ₹${fmt(max!)}`;
}

function formatRupees(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value.toLocaleString()}`;
}

function daysFromNow(dateStr: string): { days: number; label: string; late: boolean } {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  const days = Math.round((target - now) / 86400000);
  if (days <= -1) return { days, label: `Passed ${Math.abs(days)}d ago`, late: true };
  if (days === 0) return { days: 0, label: "Today", late: false };
  if (days === 1) return { days: 1, label: "Tomorrow", late: false };
  return { days, label: `In ${days} days`, late: false };
}

const STATUS_TONE: Record<string, string> = {
  applied: "bg-sky-100 text-sky-700 ring-1 ring-sky-200",
  shortlisted: "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200",
  interview: "bg-violet-100 text-violet-700 ring-1 ring-violet-200",
  offered: "bg-fuchsia-100 text-fuchsia-700 ring-1 ring-fuchsia-200",
  hired: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  rejected: "bg-rose-100 text-rose-600 ring-1 ring-rose-200",
};

/* ── Chart tooltip ───────────────────────────────────────────────────────── */

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

/* ── Skeleton components ─────────────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="glass p-5 animate-pulse">
      <div className="mb-3 h-10 w-10 rounded-xl skeleton" />
      <div className="mb-2 h-7 w-20 rounded-lg skeleton" />
      <div className="h-4 w-24 rounded skeleton" />
    </div>
  );
}

function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass-inner p-4 animate-pulse">
          <div className="h-4 w-3/4 rounded skeleton mb-2" />
          <div className="h-3 w-1/2 rounded skeleton" />
          <div className="mt-2 flex gap-2">
            <div className="h-5 w-14 rounded-full skeleton" />
            <div className="h-5 w-14 rounded-full skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="glass p-6 animate-pulse">
      <div className="mb-4 h-5 w-40 rounded skeleton" />
      <div className="h-52 w-full rounded-xl skeleton" />
    </div>
  );
}

/* ── Color palette for chart bars ────────────────────────────────────────── */

const CHART_COLORS = [
  "#4f46e5", "#7c3aed", "#2563eb", "#0ea5e9", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#06b6d4",
];

/* ── Hiring funnel stage config ──────────────────────────────────────────── */

const FUNNEL_STAGES: { key: string; label: string; tint: string }[] = [
  { key: "applied", label: "Applied", tint: "bg-sky-500" },
  { key: "shortlisted", label: "Shortlisted", tint: "bg-indigo-500" },
  { key: "interview", label: "Interview", tint: "bg-violet-500" },
  { key: "offered", label: "Offered", tint: "bg-fuchsia-500" },
  { key: "hired", label: "Hired", tint: "bg-emerald-500" },
  { key: "rejected", label: "Rejected", tint: "bg-rose-400" },
];

/* ── Sector benchmark stage config ───────────────────────────────────────── */

const BENCHMARK_STAGES: { key: FunnelStage; label: string }[] = [
  { key: "applied", label: "Applied" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview", label: "Interview" },
  { key: "offered", label: "Offered" },
  { key: "hired", label: "Hired" },
];

/* ── Sector benchmark panel ─────────────────────────────────────────────── */

function SectorBenchmarkPanel({ data, loading }: { data: SectorBenchmark | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="glass p-6 mb-8 animate-fade-up delay-200 animate-pulse">
        <div className="mb-4 h-5 w-48 rounded skeleton" />
        <div className="mb-3 h-4 w-64 rounded skeleton" />
        <div className="mb-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-full rounded-lg skeleton" />
          ))}
        </div>
        <div className="h-10 w-full rounded-lg skeleton" />
      </div>
    );
  }

  if (!data || data.sector.total === 0) {
    return (
      <div className="glass p-6 mb-8 animate-fade-up delay-200">
        <h3 className="panel-title mb-4">
          <TrendingUp className="h-4 w-4 text-violet-600" />
          Hiring benchmark vs sector
        </h3>
        <div className="flex h-44 flex-col items-center justify-center text-slate-400">
          <TrendingUp className="mb-2 h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">No sector application data yet</p>
          <p className="mt-1 text-xs text-slate-300">
            Benchmark appears as candidates apply
          </p>
        </div>
      </div>
    );
  }

  const { industry, sector, own } = data;

  const matchDiff =
    own.avg_match_score != null && sector.avg_match_score != null
      ? own.avg_match_score - sector.avg_match_score
      : null;

  const hiredDiff = own.hired_rate - sector.hired_rate;
  const hiredAhead = hiredDiff >= 0;
  const hiredAbs = Math.abs(hiredDiff);

  return (
    <div className="glass p-6 mb-8 animate-fade-up delay-200">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="panel-title">
          <TrendingUp className="h-4 w-4 text-violet-600" />
          Hiring benchmark vs sector
        </h3>
        <div className="flex items-center gap-2">
          <span className="chip bg-violet-100 text-violet-700 ring-1 ring-violet-200">
            {industry}
          </span>
          <span
            className={`chip ${hiredAhead ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-100 text-amber-700 ring-1 ring-amber-200"}`}
          >
            {hiredAhead ? (
              <TrendingUp className="mr-1 inline h-3 w-3" />
            ) : (
              <TrendingDown className="mr-1 inline h-3 w-3" />
            )}
            {hiredAhead ? "+" : "−"}{hiredAbs.toFixed(1)}% vs sector
          </span>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <p>
          <span className="font-semibold text-slate-700">{own.job_count} jobs</span> ·{" "}
          {own.total} application{own.total !== 1 ? "s" : ""} in your pipeline
        </p>
        <p>
          Sector: <span className="font-semibold text-slate-600">{sector.job_count} jobs</span> ·{" "}
          {sector.total} application{sector.total !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="mb-4 flex items-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
          Your fill rate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-gradient-to-r from-indigo-400 to-sky-400" />
          Sector average
        </span>
      </div>

      <div className="space-y-4">
        {BENCHMARK_STAGES.map((stage, i) => {
          const ownPct = own.pct[stage.key] ?? 0;
          const sectorPct = sector.pct[stage.key] ?? 0;
          const ownWidth = ownPct > 0 ? Math.max(4, Math.min(ownPct, 100)) : 0;
          const sectorWidth = sectorPct > 0 ? Math.max(4, Math.min(sectorPct, 100)) : 0;
          return (
            <div key={stage.key} className="animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">{stage.label}</span>
                <span className="font-semibold text-slate-700">
                  {ownPct.toFixed(1)}%
                  <span className="mx-1 font-normal text-slate-300">|</span>
                  <span className="font-normal text-slate-500">{sectorPct.toFixed(1)}%</span>
                </span>
              </div>
              <div className="space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
                    style={{ width: `${ownWidth}%` }}
                  />
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-sky-400 transition-all duration-700"
                    style={{ width: `${sectorWidth}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 md:grid-cols-2">
        {matchDiff != null ? (
          <div className="glass-inner flex items-center justify-between gap-2 p-3">
            <span className="text-xs text-slate-500">Avg match score</span>
            <span className={`text-sm font-bold ${matchDiff >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
              {own.avg_match_score!.toFixed(1)}
              <span className="ml-1.5 text-xs font-medium text-slate-400">
                vs sector {sector.avg_match_score!.toFixed(1)}
                <span className="ml-1">
                  ({matchDiff >= 0 ? "+" : "−"}{Math.abs(matchDiff).toFixed(1)})
                </span>
              </span>
            </span>
          </div>
        ) : (
          <div className="glass-inner flex items-center justify-between gap-2 p-3">
            <span className="text-xs text-slate-500">Avg match score</span>
            <span className="text-xs text-slate-400">Not enough data yet</span>
          </div>
        )}
        <div className="glass-inner flex items-center justify-between gap-2 p-3">
          <span className="text-xs text-slate-500">Hired rate</span>
          <span className="text-sm font-bold text-slate-700">
            {own.hired_rate.toFixed(1)}%
            <span className="ml-1.5 text-xs font-medium text-slate-400">
              vs sector {sector.hired_rate.toFixed(1)}%
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Saved Candidate Card with inline note editor ──────────────────────── */

function SavedCandidateCard({
  candidate,
  index,
  onRemove,
  pendingRemove,
  onNoteSaved,
  setToast,
}: {
  candidate: ShortlistCandidate;
  index: number;
  onRemove: (id: string) => void;
  pendingRemove: MutableRefObject<Set<string>>;
  onNoteSaved: () => void;
  setToast: (t: { message: string; tone: "success" | "error" } | null) => void;
}) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(candidate.note ?? "");
  const [savingNote, setSavingNote] = useState(false);

  const saveNote = async () => {
    setSavingNote(true);
    try {
      await updateShortlistNote(candidate.candidate_id, noteDraft.trim() || null);
      setToast({ message: "Note saved", tone: "success" });
      setEditingNote(false);
      onNoteSaved();
    } catch {
      setToast({ message: "Failed to save note", tone: "error" });
    } finally {
      setSavingNote(false);
    }
  };

  const clearNote = async () => {
    setSavingNote(true);
    try {
      await updateShortlistNote(candidate.candidate_id, null);
      setNoteDraft("");
      setToast({ message: "Note cleared", tone: "success" });
      setEditingNote(false);
      onNoteSaved();
    } catch {
      setToast({ message: "Failed to clear note", tone: "error" });
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div
      className="glass-inner p-4 animate-fade-up"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-sm font-bold text-white">
            {candidate.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-800">{candidate.full_name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3 w-3" />
              {candidate.state || "Location not set"}
            </p>
          </div>
        </div>
        <button
          onClick={() => onRemove(candidate.candidate_id)}
          disabled={pendingRemove.current.has(candidate.candidate_id)}
          className="btn-ghost flex items-center gap-1 px-2 py-1 text-xs"
        >
          <XCircle className="h-3.5 w-3.5 text-rose-500" />
          Remove
        </button>
      </div>

      {candidate.skill_tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {candidate.skill_tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="chip bg-brand-50 text-brand-600 ring-1 ring-brand-100 text-[10px]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Private note */}
      <div className="mt-3 border-t border-slate-100 pt-3">
        {editingNote ? (
          <div className="space-y-2">
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Add a private note…"
              rows={2}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder-slate-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={saveNote}
                disabled={savingNote}
                className="rounded-lg bg-gradient-to-r from-brand-500 to-indigo-500 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
              >
                {savingNote ? "Saving…" : "Save"}
              </button>
              {candidate.note && (
                <button
                  onClick={clearNote}
                  disabled={savingNote}
                  className="rounded-lg px-3 py-1 text-[11px] font-medium text-rose-500 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => { setEditingNote(false); setNoteDraft(candidate.note ?? ""); }}
                className="rounded-lg px-3 py-1 text-[11px] font-medium text-slate-400 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditingNote(true)}
            className="w-full rounded-lg px-3 py-1.5 text-left text-xs transition hover:bg-slate-50"
          >
            {candidate.note ? (
              <span className="text-slate-600">{candidate.note}</span>
            ) : (
              <span className="text-slate-300 italic">Add a private note…</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Main Dashboard ──────────────────────────────────────────────────────── */

export default function EmployerDashboard() {
  useRequireAuth("employer");

  const { data: postings, loading: postingsLoading } = useJobPostings(50);
  const { data: stats, loading: statsLoading } = useDashboardStats();
  const { data: alerts } = usePolicyAlerts();
  const { data: candidates, loading: candidatesLoading } = useCandidates(20);
  const { data: savedShortlist, loading: savedLoading, refresh: refreshSavedShortlist } = useEmployerShortlist();
  const { data: notifications, loading: notificationsLoading, refresh: refreshNotifications } = useEmployerNotifications();
  const { data: benchmark, loading: benchmarkLoading } = useSectorBenchmark();
  const { data: overview, loading: overviewLoading } = useEmployerApplicationsOverview();

  const [selectedCandidate, setSelectedCandidate] = useState<CandidateListItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyingJob, setNotifyingJob] = useState<string | null>(null);
  const pendingRemove = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!notifyOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotifyOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [notifyOpen]);

  const activeJobs = useMemo(() => postings.filter((p) => p.is_active), [postings]);

  const sendJobAlert = async (jobId: string) => {
    setNotifyingJob(jobId);
    try {
      const { notified } = await notifyShortlistedCandidates(jobId);
      setToast({
        message: `Alert sent to ${notified} shortlisted candidate${notified !== 1 ? "s" : ""}`,
        tone: "success",
      });
      setNotifyOpen(false);
    } catch {
      setToast({ message: "Failed to send job alert", tone: "error" });
    } finally {
      setNotifyingJob(null);
    }
  };

  const markRead = async (notification: NotificationItem) => {
    if (notification.read_at !== null) return;
    try {
      await markEmployerNotificationRead(notification.id);
      await refreshNotifications();
    } catch {
      setToast({ message: "Failed to mark notification read", tone: "error" });
    }
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.read_at === null).length,
    [notifications],
  );

  const removeSaved = async (candidateId: string) => {
    if (pendingRemove.current.has(candidateId)) return;
    pendingRemove.current.add(candidateId);
    try {
      await unshortlistCandidate(candidateId);
      setToast({ message: "Removed from shortlist", tone: "success" });
      await refreshSavedShortlist();
    } catch {
      setToast({ message: "Failed to remove", tone: "error" });
    } finally {
      pendingRemove.current.delete(candidateId);
    }
  };

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone).then(() => {
      setCopied(true);
      setToast({ message: "Phone number copied!", tone: "success" });
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      setToast({ message: "Failed to copy.", tone: "error" });
    });
  };

  const digilockerTone = (status: string) => {
    if (status === "verified") return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
    if (status === "rejected") return "bg-rose-100 text-rose-700 ring-1 ring-rose-200";
    return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
  };

  const digilockerLabel = (status: string) => {
    if (status === "verified") return "Verified";
    if (status === "rejected") return "Rejected";
    return "Pending";
  };

  /* Derived counts */
  const activePostings = useMemo(
    () => postings.filter((p) => p.is_active).length,
    [postings],
  );

  const totalCandidates = stats?.total_candidates ?? 0;

  /* Skills demand aggregation from all active job postings */
  const skillsDemand = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of postings) {
      for (const s of p.required_skills) {
        map[s] = (map[s] || 0) + 1;
      }
    }
    return Object.entries(map)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [postings]);

  const recentPostings = useMemo(() => {
    return [...postings]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [postings]);

  /* Pick the first active posting to power the hiring funnel */
  const funnelJobId = useMemo(() => {
    const active = postings.find((p) => p.is_active) ?? postings[0];
    return active?.id;
  }, [postings]);

  const { data: funnelData, loading: funnelLoading } = useJobApplicants(funnelJobId);

  const funnelCounts = useMemo(() => {
    // Prefer the employer-wide overview so every posting feeds the funnel.
    if (overview && overview.applications.length > 0) {
      const map: Record<string, number> = {};
      for (const a of overview.applications) {
        map[a.status] = (map[a.status] || 0) + 1;
      }
      return FUNNEL_STAGES.map((s) => ({ key: s.key, label: s.label, count: map[s.key] ?? 0 }));
    }
    if (!funnelData?.applicants) {
      return FUNNEL_STAGES.map((s) => ({ key: s.key, label: s.label, count: 0 }));
    }
    const map: Record<string, number> = {};
    for (const a of funnelData.applicants) {
      map[a.status] = (map[a.status] || 0) + 1;
    }
    return FUNNEL_STAGES.map((s) => ({ key: s.key, label: s.label, count: map[s.key] ?? 0 }));
  }, [funnelData, overview]);

  const funnelTotal = useMemo(
    () => funnelCounts.reduce((sum, s) => sum + s.count, 0),
    [funnelCounts],
  );

  /* Salary benchmark across all postings */
  const salaryStats = useMemo(() => {
    const lows: number[] = [];
    const highs: number[] = [];
    for (const p of postings) {
      if (p.salary_min !== null) lows.push(p.salary_min);
      if (p.salary_max !== null) highs.push(p.salary_max);
    }
    const low = lows.length ? Math.min(...lows) : null;
    const high = highs.length ? Math.max(...highs) : null;
    const mean = lows.length
      ? lows.reduce((s, v) => s + v, 0) / lows.length
      : null;
    return { low, high, mean, count: lows.length };
  }, [postings]);

  const salaryBench = useMemo(() => {
    const base = salaryStats.low ?? salaryStats.high ?? 0;
    const span = (salaryStats.high ?? base) - (salaryStats.low ?? 0) || 1;
    return [
      {
        key: "avg",
        label: "Average",
        value: Math.round(salaryStats.mean ?? base),
        pct: Math.max(8, Math.round(((salaryStats.mean ?? base) - (salaryStats.low ?? base)) / span * 100)),
        tint: "bg-gradient-to-r from-brand-500 to-indigo-500",
        icon: TrendingUp,
      },
      {
        key: "high",
        label: "Highest",
        value: salaryStats.high ?? 0,
        pct: 100,
        tint: "bg-gradient-to-r from-emerald-500 to-teal-500",
        icon: TrendingUp,
      },
      {
        key: "low",
        label: "Lowest",
        value: salaryStats.low ?? 0,
        pct: 12,
        tint: "bg-gradient-to-r from-amber-500 to-orange-500",
        icon: TrendingDown,
      },
    ];
  }, [salaryStats]);

  /* Required-skills cloud across all postings */
  const skillsCloud = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of postings) {
      for (const s of p.required_skills) {
        map[s] = (map[s] || 0) + 1;
      }
    }
    const entries = Object.entries(map);
    if (entries.length === 0) return [];
    const counts = entries.map(([, c]) => c);
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    const span = max - min || 1;
    return entries
      .map(([skill, count]) => ({ skill, count, weight: 0.6 + 0.9 * ((count - min) / span) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 18);
  }, [postings]);

  /* Candidate pool spotlight */
  const spotlightCandidates = useMemo(() => {
    return candidates
      .filter((c) => c.is_active)
      .slice(0, 4);
  }, [candidates]);

  /* KPI config */
  const kpiConfig = [
    {
      label: "Active Postings",
      value: activePostings,
      icon: Briefcase,
      tint: "from-brand-500 to-indigo-500",
      text: "text-brand-600",
    },
    {
      label: "Skill Pool",
      value: totalCandidates,
      icon: Users,
      tint: "from-emerald-500 to-teal-500",
      text: "text-emerald-600",
    },
    {
      label: "Total Postings",
      value: postings.length,
      icon: Target,
      tint: "from-violet-500 to-fuchsia-500",
      text: "text-violet-600",
    },
  ];

  /* Nav cards */
  const navCards = [
    {
      href: "/employer/jobs",
      title: "Job Postings",
      desc: "Create, edit, and manage your job listings",
      icon: PlusCircle,
      tint: "from-sky-500 to-cyan-500",
    },
    {
      href: "/employer/matches",
      title: "Candidate Matches",
      desc: "AI-ranked candidate recommendations for your roles",
      icon: Sparkles,
      tint: "from-brand-500 to-indigo-500",
    },
    {
      href: "/employer/pipeline",
      title: "Hiring Pipeline",
      desc: "Track applicants from shortlist to offer",
      icon: FileSearch,
      tint: "from-emerald-500 to-teal-500",
    },
  ];

  /* Quick actions row */
  const quickActions = [
    { href: "/employer/jobs", label: "Manage Jobs", icon: FileText, tint: "from-sky-500 to-cyan-500" },
    { href: "/employer/matches", label: "Find Talent", icon: Wand2, tint: "from-brand-500 to-indigo-500" },
    { href: "/employer/pipeline", label: "Review Pipeline", icon: Layers, tint: "from-emerald-500 to-teal-500" },
  ];

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">

        {/* ── Welcome Banner ─────────────────────────────────────────── */}
        <div className="glass animate-fade-up overflow-hidden p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-500 shadow-lg shadow-indigo-500/30">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Welcome to the Employer Portal
                </h2>
                <p className="text-sm text-slate-500">
                  Post jobs, discover talent, and manage your hiring pipeline — all in one place.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {alerts && alerts.length > 0 && (
                <span className="chip bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                  {alerts.length} policy alert{alerts.length !== 1 && "s"}
                </span>
              )}
              <span className="chip bg-emerald-100 text-emerald-700">
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live data
              </span>
            </div>
          </div>
        </div>

        {/* ── Dynamic KPI Cards ──────────────────────────────────────── */}
        {statsLoading || postingsLoading ? (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {kpiConfig.map(({ label, value, icon: Icon, tint, text }, i) => (
              <div
                key={label}
                className="glass card-hover p-6 transition-transform duration-300 hover:-translate-y-1 animate-fade-up"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tint} shadow-md`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  <CountUp end={value} />
                </p>
                <p className={`text-sm ${text} font-medium`}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── New Activity (Notifications) Panel ────────────────────── */}
        <div className="glass p-6 mb-8 animate-fade-up delay-100">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="panel-title">
              <Bell className="h-4 w-4 text-violet-600" />
              New Activity
            </h3>
            {unreadCount > 0 && (
              <span className="chip bg-violet-100 text-violet-700 ring-1 ring-violet-200">
                {unreadCount} unread
              </span>
            )}
          </div>
          {notificationsLoading ? (
            <SkeletonList rows={3} />
          ) : notifications.length === 0 ? (
            <div className="flex h-44 flex-col items-center justify-center text-slate-400">
              <Bell className="mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No new activity yet</p>
              <p className="mt-1 text-xs text-slate-300">
                When a candidate applies to your job, you'll be alerted here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n, i) => {
                const unread = n.read_at === null;
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n)}
                    type="button"
                    className={`glass-inner flex w-full items-start gap-3 p-4 text-left transition animate-fade-up ${unread ? "cursor-pointer hover:bg-white/80" : "cursor-default opacity-80"}`}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <span className="mt-1 flex flex-shrink-0 items-center justify-center">
                      {unread ? (
                        <span className="block h-2.5 w-2.5 rounded-full bg-violet-500 shadow-sm shadow-violet-500/40" />
                      ) : (
                        <span className="block h-2.5 w-2.5 rounded-full border border-slate-300 bg-transparent" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${unread ? "font-bold text-slate-800" : "font-medium text-slate-500"}`}>
                        {n.title || "Notification"}
                      </span>
                      {n.body && (
                        <span className="mt-0.5 block text-xs text-slate-500">{n.body}</span>
                      )}
                      <span className="mt-1 block text-[11px] text-slate-400">
                        {timeAgo(n.created_at)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Job Postings Panel ─────────────────────────────────────── */}
        <div className="glass p-6 mb-8 animate-fade-up delay-100">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="panel-title">
              <Clock className="h-4 w-4 text-indigo-500" />
              Recent Job Postings
            </h3>
            <Link
              href="/employer/jobs"
              className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-xs font-medium"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {postingsLoading ? (
            <SkeletonList rows={3} />
          ) : recentPostings.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-slate-400">
              <Briefcase className="mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No job postings yet</p>
              <p className="mt-1 text-xs text-slate-300">Create your first posting to start hiring</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPostings.map((job, i) => (
                <Link
                  key={job.id}
                  href="/employer/jobs"
                  className="glass-inner flex flex-col gap-3 p-4 transition hover:bg-white/80 animate-fade-up group"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-bold text-slate-800 group-hover:text-brand-700">
                          {job.title}
                        </p>
                        {job.is_active ? (
                          <span className="chip bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 flex-shrink-0">
                            <CheckCircle2 className="mr-1 inline h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="chip bg-slate-100 text-slate-500 ring-1 ring-slate-200 flex-shrink-0">
                            <XCircle className="mr-1 inline h-3 w-3" />
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {(job.state || job.district) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[job.district, job.state].filter(Boolean).join(", ")}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <IndianRupee className="h-3 w-3" />
                          {formatSalary(job.salary_min, job.salary_max)}
                        </span>
                        <span>{timeAgo(job.created_at)}</span>
                      </div>
                    </div>
                    <ArrowUpRight className="mt-1 h-4 w-4 flex-shrink-0 text-slate-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-500" />
                  </div>
                  {job.required_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {job.required_skills.map((skill) => (
                        <span
                          key={skill}
                          className="chip bg-brand-50 text-brand-600 ring-1 ring-brand-100 text-[10px]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Skills Demand Chart ────────────────────────────────────── */}
        {skillsDemand.length > 0 && (
          postingsLoading ? <SkeletonChart /> : (
            <div className="glass p-6 mb-8 animate-fade-up delay-200">
              <h3 className="panel-title mb-4">
                <BarChart3 className="h-4 w-4 text-violet-600" />
                Top Skills in Demand
              </h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={skillsDemand}
                    margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                  >
                    <defs>
                      <linearGradient id="gradSkillEmp" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#4f46e5" />
                        <stop offset="100%" stopColor="#7c3aed" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                    <XAxis
                      dataKey="skill"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      {...tooltipStyle}
                      cursor={{ fill: "rgba(99,102,241,0.06)" }}
                      formatter={(value: number) => [`${value} posting${value !== 1 ? "s" : ""}`, "Demand"]}
                    />
                    <Bar dataKey="count" name="Postings" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {skillsDemand.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        )}

        {/* ── NEW: Hiring Funnel Summary ─────────────────────────────── */}
        <div className="glass p-6 mb-8 animate-fade-up delay-200">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="panel-title">
              <Layers className="h-4 w-4 text-indigo-500" />
              Hiring Funnel
            </h3>
            {(overview || (funnelData && !funnelLoading)) && (
              <Link
                href="/employer/pipeline"
                className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-xs font-medium"
              >
                Open pipeline <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          {funnelLoading || (overviewLoading && !overview) ? (
            <SkeletonChart />
          ) : !overview && !funnelData ? (
            <div className="flex h-44 flex-col items-center justify-center text-slate-400">
              <Layers className="mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No applicants to show</p>
              <p className="mt-1 text-xs text-slate-300">
                {funnelJobId ? "This posting has no applicants yet" : "Create a posting to start receiving applicants"}
              </p>
            </div>
          ) : funnelTotal === 0 ? (
            <div className="flex h-44 flex-col items-center justify-center text-slate-400">
              <UserCheck className="mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No applicants yet</p>
              <p className="mt-1 text-xs text-slate-300">
                Applicants for <span className="font-semibold text-slate-500">{overview ? "your postings" : funnelData?.title}</span> will appear here
              </p>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-sm text-slate-500">
                <span className="font-semibold text-slate-700">
                  {overview ? "Across all your postings" : funnelData?.title}
                </span>
                {" · "}
                {funnelTotal} applicant{funnelTotal !== 1 ? "s" : ""}
              </p>
              <div className="space-y-3">
                {funnelCounts.map((stage, i) => {
                  const pct = funnelTotal > 0 ? Math.round((stage.count / funnelTotal) * 100) : 0;
                  const cfg = FUNNEL_STAGES[i];
                  return (
                    <div key={stage.key} className="animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-medium text-slate-600">
                          <span className={`inline-block h-2 w-2 rounded-full ${cfg.tint}`} />
                          {stage.label}
                        </span>
                        <span className="font-semibold text-slate-700">
                          {stage.count}
                          <span className="ml-1 font-normal text-slate-400">· {pct}%</span>
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`${cfg.tint} h-full rounded-full transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── NEW: Recent Applicants + Upcoming Interviews ───────────── */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent applicants feed */}
          <div className="glass p-6 animate-fade-up delay-200">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="panel-title">
                <FileSearch className="h-4 w-4 text-sky-600" />
                Recent Applicants
              </h3>
              <Link
                href="/employer/pipeline"
                className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-xs font-medium"
              >
                Review all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {overviewLoading ? (
              <SkeletonList rows={3} />
            ) : !overview || overview.applications.length === 0 ? (
              <div className="flex h-44 flex-col items-center justify-center text-slate-400">
                <FileSearch className="mb-2 h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No applicants yet</p>
                <p className="mt-1 text-xs text-slate-300">Applications land here as candidates apply</p>
              </div>
            ) : (
              <div className="space-y-3">
                {overview.applications.slice(0, 5).map((a, i) => (
                  <Link
                    key={a.id}
                    href="/employer/pipeline"
                    className="glass-inner flex items-start gap-3 p-3.5 transition hover:bg-white/80 animate-fade-up group"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-xs font-bold text-white">
                      {(a.candidate.full_name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {a.candidate.full_name}
                        </p>
                        <span className={`chip flex-shrink-0 text-[10px] ${STATUS_TONE[a.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {a.status}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {a.job.title} · {a.job.location || "Location TBA"}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="font-semibold text-emerald-600">{Math.round(a.match_score ?? 0)}% match</span>
                        <span>·</span>
                        <span>{timeAgo(a.applied_at)}</span>
                      </div>
                      {a.cover_note && (
                        <p className="mt-1.5 line-clamp-1 text-[11px] text-slate-400 italic">"{a.cover_note}"</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming interviews */}
          <div className="glass p-6 animate-fade-up delay-200">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="panel-title">
                <CalendarDays className="h-4 w-4 text-violet-600" />
                Upcoming Interviews
              </h3>
              {overview && (
                <span className="chip bg-violet-100 text-violet-700 ring-1 ring-violet-200">
                  {overview.applications.filter((a) => a.status === "interview" && a.interview_at).length} scheduled
                </span>
              )}
            </div>
            {overviewLoading ? (
              <SkeletonList rows={3} />
            ) : !overview ? (
              <div className="flex h-44 flex-col items-center justify-center text-slate-400">
                <CalendarDays className="mb-2 h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No interviews scheduled</p>
                <p className="mt-1 text-xs text-slate-300">Schedule interviews from your hiring pipeline</p>
              </div>
            ) : (
              (() => {
                const interviews = overview.applications
                  .filter((a) => a.status === "interview" && a.interview_at)
                  .sort((x, y) => new Date(x.interview_at!).getTime() - new Date(y.interview_at!).getTime());
                return interviews.length === 0 ? (
                  <div className="flex h-44 flex-col items-center justify-center text-slate-400">
                    <CalendarDays className="mb-2 h-10 w-10 opacity-30" />
                    <p className="text-sm font-medium">No interviews scheduled</p>
                    <p className="mt-1 text-xs text-slate-300">Schedule interviews from your hiring pipeline</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {interviews.slice(0, 5).map((a, i) => {
                      const { label, late } = daysFromNow(a.interview_at!);
                      return (
                        <div
                          key={a.id}
                          className="glass-inner p-3.5 animate-fade-up"
                          style={{ animationDelay: `${i * 0.05}s` }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white">
                                {(a.candidate.full_name ?? "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">
                                  {a.candidate.full_name}
                                </p>
                                <p className="truncate text-xs text-slate-500">{a.job.title}</p>
                              </div>
                            </div>
                            <span className={`chip flex-shrink-0 text-[10px] ${late ? "bg-slate-100 text-slate-400" : "bg-violet-100 text-violet-700 ring-1 ring-violet-200"}`}>
                              {label}
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-semibold text-violet-700">
                            {formatISODateTime(a.interview_at)}
                          </p>
                          {a.interview_note && (
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                              {a.interview_note}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* ── NEW: Offers Awaiting Response ─────────────────────────── */}
        <div className="glass p-6 mb-8 animate-fade-up delay-200">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="panel-title">
              <BadgeCheck className="h-4 w-4 text-purple-600" />
              Offers Awaiting Response
            </h3>
            <Link
              href="/employer/pipeline"
              className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-xs font-medium"
            >
              View pipeline <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {overviewLoading ? (
            <SkeletonList rows={3} />
          ) : !overview ? (
            <div className="flex h-36 flex-col items-center justify-center text-slate-400">
              <BadgeCheck className="mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No offers yet</p>
              <p className="mt-1 text-xs text-slate-300">Offer candidates right from your pipeline</p>
            </div>
          ) : (
            (() => {
              const offers = overview.applications
                .filter((a) => a.status === "offered")
                .sort((x, y) => new Date(y.applied_at).getTime() - new Date(x.applied_at).getTime());
              if (offers.length === 0) {
                return (
                  <div className="flex h-36 flex-col items-center justify-center text-slate-400">
                    <BadgeCheck className="mb-2 h-10 w-10 opacity-30" />
                    <p className="text-sm font-medium">No open offers</p>
                    <p className="mt-1 text-xs text-slate-300">Candidates you offer will be tracked here</p>
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {offers.map((a, i) => {
                    const pendingDays = Math.max(0, Math.floor((Date.now() - new Date(a.applied_at).getTime()) / 86400000));
                    const stale = pendingDays >= 7;
                    return (
                      <div key={a.id} className="glass-inner animate-scale-in p-4" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 text-xs font-bold text-white">
                              {(a.candidate.full_name ?? "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {a.candidate.full_name}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {a.job.title} · {a.job.location || "Location TBA"}
                              </p>
                            </div>
                          </div>
                          <span className={`chip flex-shrink-0 text-[10px] ${stale ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200" : "bg-purple-100 text-purple-700 ring-1 ring-purple-200"}`}>
                            {pendingDays}d waiting
                          </span>
                        </div>
                        {(a.offer_start_date || a.offer_salary != null) && (
                          <p className="mt-2.5 text-[11px] font-semibold text-slate-600">
                            {a.offer_start_date && <>Starts {formatISODate(a.offer_start_date)}</>}
                            {a.offer_start_date && a.offer_salary != null && " · "}
                            {a.offer_salary != null && <>₹{formatINR(a.offer_salary)}/yr</>}
                          </p>
                        )}
                        {stale && (
                          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-600">
                            <Clock className="h-3 w-3" />
                            Pending over a week — consider a follow-up
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>

        {/* ── NEW: Sector Benchmark ─────────────────────────────────── */}
        <SectorBenchmarkPanel data={benchmark} loading={benchmarkLoading} />

        {/* ── NEW: Salary Benchmark Panel ────────────────────────────── */}
        {postingsLoading ? <SkeletonChart /> : (
          salaryStats.count === 0 ? (
            <div className="glass p-6 mb-8 animate-fade-up delay-200">
              <h3 className="panel-title mb-4">
                <IndianRupee className="h-4 w-4 text-emerald-600" />
                Salary Benchmark
              </h3>
              <div className="flex h-36 flex-col items-center justify-center text-slate-400">
                <IndianRupee className="mb-2 h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No salary data available</p>
                <p className="mt-1 text-xs text-slate-300">Add salaries to your postings to unlock benchmarks</p>
              </div>
            </div>
          ) : (
            <div className="glass p-6 mb-8 animate-fade-up delay-200">
              <h3 className="panel-title mb-4">
                <IndianRupee className="h-4 w-4 text-emerald-600" />
                Salary Benchmark
              </h3>
              <p className="mb-5 text-sm text-slate-500">
                Based on {salaryStats.count} posting{salaryStats.count !== 1 ? "s" : ""} with salary data across{" "}
                {postings.length} posting{postings.length !== 1 ? "s" : ""}
              </p>
              <div className="space-y-4">
                {salaryBench.map((b, i) => {
                  const Icon = b.icon;
                  return (
                    <div key={b.key} className="animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-medium text-slate-600">
                          <Icon className={`h-3.5 w-3.5 ${b.key === "high" ? "text-emerald-600" : b.key === "low" ? "text-amber-600" : "text-brand-600"}`} />
                          {b.label}
                        </span>
                        <span className="font-semibold text-slate-700">{formatRupees(b.value)}</span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`${b.tint} h-full rounded-full transition-all duration-700`}
                          style={{ width: `${b.pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
                <TrendingUp className="h-4 w-4 text-brand-600" />
                <p className="text-xs text-slate-500">
                  Average monthly salary offered across your postings is{" "}
                  <span className="font-semibold text-slate-700">
                    {formatRupees(Math.round(salaryStats.mean ?? 0))}
                  </span>
                </p>
              </div>
            </div>
          )
        )}

        {/* ── NEW: Required-Skills Cloud ─────────────────────────────── */}
        {postingsLoading ? <SkeletonChart /> : (
          skillsCloud.length === 0 ? (
            <div className="glass p-6 mb-8 animate-fade-up delay-200">
              <h3 className="panel-title mb-4">
                <Zap className="h-4 w-4 text-amber-600" />
                Required Skills Cloud
              </h3>
              <div className="flex h-36 flex-col items-center justify-center text-slate-400">
                <Zap className="mb-2 h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No skills tagged yet</p>
                <p className="mt-1 text-xs text-slate-300">Add required skills to your postings to build a cloud</p>
              </div>
            </div>
          ) : (
            <div className="glass p-6 mb-8 animate-fade-up delay-200">
              <h3 className="panel-title mb-4">
                <Zap className="h-4 w-4 text-amber-600" />
                Required Skills Cloud
              </h3>
              <p className="mb-4 text-sm text-slate-500">
                Most-requested skills across your {postings.length} posting{postings.length !== 1 ? "s" : ""}. Larger chips are in higher demand.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {skillsCloud.map(({ skill, count, weight }, i) => (
                  <span
                    key={skill}
                    className="chip animate-fade-up card-hover border border-slate-200 bg-white text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                    style={{
                      fontSize: `${Math.min(11 + weight * 5, 16)}px`,
                      padding: `${Math.min(3 + weight * 3, 9)}px ${Math.min(8 + weight * 5, 16)}px`,
                      animationDelay: `${i * 0.03}s`,
                    }}
                  >
                    {skill}
                    <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-500">
                      {count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )
        )}

        {/* ── NEW: Candidate Pool Spotlight ──────────────────────────── */}
        <div className="glass p-6 mb-8 animate-fade-up delay-200">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="panel-title">
              <Sparkles className="h-4 w-4 text-brand-600" />
              Talent Pool Spotlight
            </h3>
            <Link
              href="/employer/matches"
              className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-xs font-medium"
            >
              View matches <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {candidatesLoading ? (
            <SkeletonList rows={2} />
          ) : spotlightCandidates.length === 0 ? (
            <div className="flex h-44 flex-col items-center justify-center text-slate-400">
              <Users className="mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No candidates in the pool</p>
              <p className="mt-1 text-xs text-slate-300">Candidates will appear here once they join the platform</p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {spotlightCandidates.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCandidate(c); setCopied(false); }}
                    className="glass-inner flex gap-3 p-4 transition hover:bg-white/80 animate-fade-up group text-left"
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-sm font-bold text-white">
                      {c.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-800 group-hover:text-brand-700">
                        {c.full_name}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" />
                        {c.state || "Location not set"}
                      </p>
                      {c.skill_tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {c.skill_tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="chip bg-brand-50 text-brand-600 ring-1 ring-brand-100 text-[10px]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ArrowUpRight className="mt-1 h-4 w-4 flex-shrink-0 self-start text-slate-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-500" />
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Users className="h-3.5 w-3.5" />
                  {candidates.filter((c) => c.is_active).length} candidates in your active talent pool
                </p>
                <span className="chip bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <BadgeCheck className="mr-1 inline h-3 w-3" />
                  Live
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── NEW: Saved Candidates Panel ───────────────────────────── */}
        <div className="glass p-6 mb-8 animate-fade-up delay-200">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="panel-title">
              <Bookmark className="h-4 w-4 text-violet-600" />
              Saved Candidates
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setNotifyOpen(true)}
                disabled={!savedShortlist || savedShortlist.length === 0}
                className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Bell className="h-3.5 w-3.5 text-violet-500" />
                Notify shortlist
              </button>
              {savedShortlist && savedShortlist.length > 0 && (
                <Link
                  href="/employer/matches"
                  className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-xs font-medium"
                >
                  View matches <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
          {savedLoading ? (
            <SkeletonList rows={2} />
          ) : !savedShortlist || savedShortlist.length === 0 ? (
            <div className="flex h-44 flex-col items-center justify-center text-slate-400">
              <Bookmark className="mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No saved candidates</p>
              <p className="mt-1 text-xs text-slate-300">
                Bookmark candidates from Match results to revisit them later
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {savedShortlist.map((c, i) => (
                <SavedCandidateCard
                  key={c.candidate_id}
                  candidate={c}
                  index={i}
                  onRemove={removeSaved}
                  pendingRemove={pendingRemove}
                  onNoteSaved={refreshSavedShortlist}
                  setToast={setToast}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── NEW: Quick Actions Row ─────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8 animate-fade-up delay-200">
          {quickActions.map(({ href, label, icon: Icon, tint }, i) => (
            <Link
              key={href}
              href={href}
              className="glass card-hover flex items-center gap-3 p-4 transition"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tint} shadow-md`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-1 items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 group-hover:text-brand-700">{label}</span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </Link>
          ))}
        </div>

        {/* ── Navigation Cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 animate-fade-up delay-300">
          {navCards.map(({ href, title, desc, icon: Icon, tint }, i) => (
            <Link
              key={href}
              href={href}
              className="group glass card-hover p-6"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-start justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${tint} shadow-md transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-slate-300 transition-all group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-brand-500" />
              </div>
              <h3 className="mt-4 font-bold text-slate-800 group-hover:text-brand-700">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{desc}</p>
            </Link>
          ))}
        </div>

      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] w-72 animate-fade-in">
          <Toast message={toast.message} tone={toast.tone} />
        </div>
      )}

      {/* Candidate View / Contact Modal */}
      <Modal
        open={!!selectedCandidate}
        title="Candidate"
        subtitle={selectedCandidate ? `${selectedCandidate.full_name} · Talent pool` : undefined}
        onClose={() => setSelectedCandidate(null)}
        size="lg"
      >
        {selectedCandidate && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-500 shadow-lg">
                <span className="font-bold text-white text-lg">
                  {selectedCandidate.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">{selectedCandidate.full_name}</h2>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-400">
                  <MapPin className="h-3.5 w-3.5" />
                  {[selectedCandidate.district, selectedCandidate.state].filter(Boolean).join(", ") || "Location not set"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">DigiLocker:</span>
              <span className={`chip flex items-center gap-1 ${digilockerTone(selectedCandidate.digilocker_status)}`}>
                <BadgeCheck className="h-3 w-3" />
                {digilockerLabel(selectedCandidate.digilocker_status)}
              </span>
            </div>

            {selectedCandidate.email && (
              <div className="glass-inner p-4 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">Email</p>
                <p className="text-sm font-medium text-slate-200">{selectedCandidate.email}</p>
              </div>
            )}

            {selectedCandidate.skill_tags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-200 mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCandidate.skill_tags.map((s) => (
                    <span key={s} className="chip bg-brand-50 text-brand-600 ring-1 ring-brand-100 text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-inner p-4 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Contact</p>
              <div className="flex items-center gap-3">
                <p className="text-lg font-semibold text-slate-100">{selectedCandidate.phone}</p>
                <button
                  onClick={() => copyPhone(selectedCandidate.phone)}
                  className="btn-ghost text-xs px-2 py-1"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <Link
                href="/employer/matches"
                className="btn-glass flex items-center justify-center gap-2 text-sm font-medium"
                onClick={() => setSelectedCandidate(null)}
              >
                <Sparkles className="h-4 w-4" />
                See all matches
              </Link>
            </div>
          </div>
        )}
      </Modal>

      {/* Notify Shortlist Modal */}
      {notifyOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setNotifyOpen(false)}
          />
          <div className="relative w-full max-w-lg animate-scale-in rounded-2xl border border-white/15 bg-[#151c35]/95 p-6 shadow-2xl backdrop-blur-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="bg-gradient-to-r from-violet-300 to-brand-200 bg-clip-text text-lg font-bold text-transparent">
                  Notify shortlist
                </h3>
                <p className="mt-0.5 text-sm text-slate-400">
                  Pick an open posting to alert {savedShortlist?.length ?? 0} shortlisted
                  candidate{savedShortlist?.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => setNotifyOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.08] hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {activeJobs.length === 0 ? (
                <div className="flex h-36 flex-col items-center justify-center text-slate-400">
                  <Briefcase className="mb-2 h-10 w-10 opacity-30" />
                  <p className="text-sm font-medium">No open postings to alert about</p>
                  <p className="mt-1 text-xs text-slate-300">
                    Activate a job posting to alert your shortlist
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeJobs.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => sendJobAlert(job.id)}
                      disabled={notifyingJob !== null}
                      className="glass-inner flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-800">{job.title}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3 w-3" />
                          {[job.district, job.state, job.location].filter(Boolean).join(", ") || "Location not set"}
                        </p>
                      </div>
                      {notifyingJob === job.id ? (
                        <span className="flex-shrink-0 text-xs font-medium text-violet-500">Sending…</span>
                      ) : (
                        <Bell className="h-4 w-4 flex-shrink-0 text-slate-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
