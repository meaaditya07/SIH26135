"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import {
  useCandidates,
  useEnrollmentsEnriched,
  useOutcomeTimeline,
} from "@/lib/hooks/useDashboard";
import type { CandidateListItem, EnrollmentRich } from "@/lib/types";
import { Search, Download, Users, RefreshCw, Eye, X } from "lucide-react";

const CSV_HEADERS = [
  "Full name",
  "Phone",
  "Email",
  "State",
  "District",
  "Digilocker",
  "Skills",
  "Contact allowed",
  "Registered on",
];

function digilockerChip(status: string | null | undefined) {
  if (status === "verified") {
    return { label: "Verified", className: "bg-emerald-100 text-emerald-700" };
  }
  if (status === "pending") {
    return { label: "Pending", className: "bg-amber-100 text-amber-700" };
  }
  return { label: "Not verified", className: "bg-slate-100 text-slate-500" };
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "\u2014";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatRupees(amount: number | null | undefined) {
  if (amount == null) return "\u2014";
  return `\u20B9${amount.toLocaleString("en-IN")}`;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-white/10">
          {Array.from({ length: 7 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="skeleton h-4 animate-pulse rounded" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function CandidateDrawer({
  candidate,
  enrollments,
  onClose,
}: {
  candidate: CandidateListItem;
  enrollments: EnrollmentRich[];
  onClose: () => void;
}) {
  const { data: timeline, loading: timelineLoading } = useOutcomeTimeline(
    candidate.id
  );

  const mine = useMemo(
    () => enrollments.filter((e) => e.candidate_id === candidate.id),
    [enrollments, candidate.id]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const dl = digilockerChip(candidate.digilocker_status);
  const skills = candidate.skill_tags ?? [];

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        className="glass fixed right-0 top-0 z-[101] flex h-full w-full max-w-md animate-slide-in-right flex-col overflow-hidden border-l shadow-2xl shadow-violet-900/40"
        style={{ borderRadius: "1rem 0 0 1rem" }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-lg font-bold text-white">
              {(candidate.full_name?.[0] ?? "?").toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-white">
                {candidate.full_name || "Unknown"}
              </p>
              {candidate.phone && (
                <p className="truncate text-sm text-slate-300">{candidate.phone}</p>
              )}
              {candidate.email && (
                <p className="truncate text-xs text-slate-500">{candidate.email}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="chip hover:bg-white/10"
            aria-label="Close candidate details"
          >
            <X className="h-4 w-4 text-slate-300" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Profile */}
          <section className="glass-inner p-4">
            <p className="panel-title mb-3 text-sm">Profile</p>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Location</dt>
                <dd className="text-right text-slate-200">
                  {candidate.state ?? "\u2014"}
                  <span className="mx-1 text-slate-500">&middot;</span>
                  {candidate.district ?? "\u2014"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Digilocker</dt>
                <dd>
                  <span className={`chip text-xs ${dl.className}`}>{dl.label}</span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Contact allowed</dt>
                <dd className={candidate.allow_employer_contact === false ? "text-rose-300" : "text-emerald-300"}>
                  {candidate.allow_employer_contact === false ? "No" : "Yes"}
                </dd>
              </div>
            </dl>
            {skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <span key={skill} className="chip bg-brand-50 text-brand-600 text-[11px]">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Training footprint */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="panel-title text-sm">Training footprint</p>
              <span className="chip bg-violet-500/15 text-violet-200">
                {mine.length} enrollment{mine.length !== 1 ? "s" : ""}
              </span>
            </div>
            {mine.length === 0 ? (
              <div className="glass-inner p-5 text-center text-sm text-slate-500">
                No enrollments yet
              </div>
            ) : (
              <ul className="space-y-2">
                {mine.map((e) => (
                  <li key={e.id} className="glass-inner p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-100">{e.course_name}</p>
                      <span
                        className={`chip text-[11px] ${
                          e.is_completed
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-violet-500/15 text-violet-200"
                        }`}
                      >
                        {e.is_completed ? "Completed" : "Active"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Enrolled {formatDate(e.enrollment_date)}
                      {e.completion_date
                        ? ` \u00B7 Completed ${formatDate(e.completion_date)}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Employment history */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="panel-title text-sm">Employment history</p>
              <span className="chip bg-violet-500/15 text-violet-200">
                {timeline.length} outcome{timeline.length !== 1 ? "s" : ""}
              </span>
            </div>
            {timelineLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="skeleton h-20 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : timeline.length === 0 ? (
              <div className="glass-inner p-5 text-center text-sm text-slate-500">
                No outcomes recorded yet
              </div>
            ) : (
              <ul className="space-y-2">
                {timeline.map((t, i) => (
                  <li key={`${t.survey_date}-${i}`} className="glass-inner p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-100">
                        {t.job_title || "Unknown role"}
                      </p>
                      <span
                        className={`chip text-[11px] ${
                          t.is_employed
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-slate-500/15 text-slate-400"
                        }`}
                      >
                        {t.is_employed ? "Employed" : "Not employed"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span>Salary: {formatRupees(t.monthly_salary)}</span>
                      <span>Interval: {t.interval || "\u2014"}</span>
                      {t.channel && <span>Channel: {t.channel}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

export default function GovCandidatesPage() {
  useRequireAuth("gov_admin");

  const { data, loading, error, refresh } = useCandidates(200, 0);
  const { data: enrollments } = useEnrollmentsEnriched(200, 0);

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => data.find((c) => c.id === selectedId) ?? null,
    [data, selectedId]
  );

  const states = useMemo(() => {
    const set = new Set<string>();
    for (const c of data) {
      const s = c.state?.trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const districts = useMemo(() => {
    const set = new Set<string>();
    for (const c of data) {
      if (stateFilter !== "all" && (c.state ?? "").trim() !== stateFilter) continue;
      const d = c.district?.trim();
      if (d) set.add(d);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data, stateFilter]);

  const filtered = useMemo(() => {
    let rows: CandidateListItem[] = data;
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (c) =>
          (c.full_name && c.full_name.toLowerCase().includes(q)) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.district && c.district.toLowerCase().includes(q))
      );
    }
    if (stateFilter !== "all") {
      rows = rows.filter((c) => (c.state ?? "").trim() === stateFilter);
    }
    if (districtFilter !== "all") {
      rows = rows.filter((c) => (c.district ?? "").trim() === districtFilter);
    }
    return rows;
  }, [data, search, stateFilter, districtFilter]);

  const exportCSV = useCallback(() => {
    if (filtered.length === 0) return;
    const escape = (val: unknown) => {
      const s = String(val ?? "");
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const rows = filtered.map((c) => [
      c.full_name,
      c.phone,
      c.email ?? "",
      c.state ?? "",
      c.district ?? "",
      c.digilocker_status ?? "",
      (c.skill_tags ?? []).join("; "),
      c.allow_employer_contact === false ? "No" : "Yes",
      c.created_at ? formatDate(c.created_at) : "",
    ]);
    const csv = [CSV_HEADERS, ...rows]
      .map((r) => r.map(escape).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidate-directory-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [filtered]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Candidate directory" subtitle="Search, filter, and export registered candidates" />
        <main className="space-y-6 p-6">

          {error && !loading ? (
            <div className="glass flex flex-col items-center justify-center py-20 text-center animate-fade-up">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
                <Users className="h-7 w-7 text-rose-600" />
              </div>
              <p className="text-lg font-bold text-slate-100">Could not load candidates</p>
              <p className="mt-1 max-w-md text-sm text-slate-400">
                {error}
              </p>
              <button onClick={refresh} className="btn-glass mt-6 inline-flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* ── Header ─────────────────────────────────────────────── */}
              <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-up">
                <div>
                  <h1 className="text-2xl font-bold text-slate-100">Candidate directory</h1>
                  <p className="text-sm text-slate-400">
                    {loading
                      ? "Loading candidates..."
                      : `${data.length.toLocaleString()} registered candidate${data.length !== 1 ? "s" : ""}`}
                  </p>
                </div>
                <button
                  onClick={exportCSV}
                  disabled={loading || filtered.length === 0}
                  className="btn-ghost flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Export filtered candidates as CSV"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>

              {/* ── Toolbar ────────────────────────────────────────────── */}
              <div className="flex flex-wrap gap-3 animate-fade-up delay-100">
                <div className="relative min-w-[240px] max-w-md flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, phone, email, or district..."
                    className="input-glass pl-10"
                  />
                </div>
                <select
                  value={stateFilter}
                  onChange={(e) => {
                    setStateFilter(e.target.value);
                    setDistrictFilter("all");
                  }}
                  className="input-glass w-auto"
                >
                  <option value="all">All States</option>
                  {states.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {stateFilter !== "all" && (
                  <select
                    value={districtFilter}
                    onChange={(e) => setDistrictFilter(e.target.value)}
                    className="input-glass w-auto"
                  >
                    <option value="all">All Districts</option>
                    {districts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* ── Table ─────────────────────────────────────────────── */}
              <div className="glass overflow-hidden animate-fade-up delay-200">
                <div className="glass-inner overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-4 py-3 text-left font-medium text-slate-400">Full name</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-400">Phone</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-400">State &middot; District</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-400">Digilocker</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-400">Skills</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-400">Registered</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-400">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <SkeletonRows />
                      ) : filtered.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-16 text-center">
                            <Search className="mx-auto mb-3 h-10 w-10 text-slate-500/60" />
                            <p className="font-semibold text-slate-300">No candidates match your filters.</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {data.length === 0
                                ? "Registered candidates will appear here once profiles are created."
                                : "Try adjusting your search or filters."}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filtered.map((c) => {
                          const dl = digilockerChip(c.digilocker_status);
                          const skills = c.skill_tags ?? [];
                          return (
                            <tr
                              key={c.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedId(c.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedId(c.id);
                                }
                              }}
                              className="cursor-pointer border-b border-white/10 transition-colors hover:bg-white/[0.07] focus:bg-white/[0.07] focus:outline-none"
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-bold text-white">
                                    {(c.full_name?.[0] ?? "?").toUpperCase()}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-slate-100">
                                      {c.full_name || "Unknown"}
                                    </p>
                                    {c.email && (
                                      <p className="truncate text-xs text-slate-500">{c.email}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                                {c.phone}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                                {c.state ?? "\u2014"}
                                <span className="mx-1 text-slate-500">&middot;</span>
                                {c.district ?? "\u2014"}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`chip text-xs ${dl.className}`}>{dl.label}</span>
                              </td>
                              <td className="px-4 py-3">
                                {skills.length === 0 ? (
                                  <span className="text-xs text-slate-500">{"\u2014"}</span>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-1">
                                    {skills.slice(0, 3).map((skill) => (
                                      <span
                                        key={skill}
                                        className="chip bg-brand-50 text-brand-600 text-[11px]"
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                    {skills.length > 3 && (
                                      <span
                                        className="chip bg-slate-100 text-slate-500 text-[11px]"
                                        title={skills.slice(3).join(", ")}
                                      >
                                        {"\u2026"}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                                {formatDate(c.created_at)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                <button
                                  onClick={() => setSelectedId(c.id)}
                                  className="btn-ghost px-3 py-1.5 text-xs"
                                  title={`View ${c.full_name || "candidate"} details`}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {!loading && (
                  <div className="border-t border-white/10 px-4 py-3 text-xs text-slate-400">
                    {filtered.length.toLocaleString()} / {data.length.toLocaleString()} shown after filters
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {selected && (
        <CandidateDrawer
          key={selected.id}
          candidate={selected}
          enrollments={enrollments}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}