"use client";

import { useMemo, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import {
  useEmployerApplicationsOverview,
  rescheduleInterview,
} from "@/lib/hooks/useDashboard";
import { formatISODateTime } from "@/lib/utils";
import type { OverviewApplication } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import {
  CalendarDays, Clock, Search, MapPin, MessageSquare, Sparkles,
} from "lucide-react";

type Tab = "all" | "upcoming" | "today" | "past";

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function countdown(iso: string): { label: string; tone: string; done: boolean } {
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return { label: "Finished", tone: "bg-slate-100 text-slate-400", done: true };
  if (days === 0) return { label: "Today", tone: "bg-violet-100 text-violet-700 ring-1 ring-violet-200", done: false };
  if (days === 1) return { label: "Tomorrow", tone: "bg-violet-100 text-violet-700 ring-1 ring-violet-200", done: false };
  return { label: `In ${days} days`, tone: "bg-violet-50 text-violet-600", done: false };
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EmployerInterviewsPage() {
  useRequireAuth("employer");

  const [reloadKey, setReloadKey] = useState(0);
  const { data: overview, loading } = useEmployerApplicationsOverview(reloadKey);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [resched, setResched] = useState<OverviewApplication | null>(null);
  const [draftAt, setDraftAt] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [saving, setSaving] = useState(false);

  const interviews = useMemo(
    () =>
      (overview?.applications ?? [])
        .filter((a) => a.status === "interview" && a.interview_at)
        .sort((x, y) => new Date(x.interview_at!).getTime() - new Date(y.interview_at!).getTime()),
    [overview],
  );

  const todayKey = dayKey(new Date().toISOString());

  const buckets = useMemo(() => {
    const filtered = interviews.filter((a) => {
      const hay = `${a.candidate.full_name ?? ""} ${a.job.title ?? ""}`.toLowerCase();
      return hay.includes(query.trim().toLowerCase());
    });
    return {
      all: filtered,
      upcoming: filtered.filter((a) => dayKey(a.interview_at!) > todayKey),
      today: filtered.filter((a) => dayKey(a.interview_at!) === todayKey),
      past: filtered.filter((a) => dayKey(a.interview_at!) < todayKey),
    };
  }, [interviews, query, todayKey]);

  const visible = tab === "all" ? buckets.all : buckets[tab];

  const openReschedule = (a: OverviewApplication) => {
    setResched(a);
    setDraftAt(toLocalInput(a.interview_at!));
    setDraftNote(a.interview_note ?? "");
  };

  const saveReschedule = async () => {
    if (!resched || !draftAt) return;
    setSaving(true);
    try {
      const at = new Date(draftAt).toISOString();
      await rescheduleInterview(resched.id, at, draftNote || null);
      setToast({ message: `Interview updated for ${resched.candidate.full_name}.`, tone: "success" });
      setResched(null);
      setReloadKey((k) => k + 1);
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Could not update interview";
      setToast({ message: detail, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "All", count: buckets.all.length },
    { key: "upcoming", label: "Upcoming", count: buckets.upcoming.length },
    { key: "today", label: "Today", count: buckets.today.length },
    { key: "past", label: "Past", count: buckets.past.length },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Interviews" subtitle="Every interview across all your postings" />
        <main className="p-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-1">Interviews</h1>
                <p className="text-slate-500">
                  {interviews.length} scheduled{interviews.length !== 1 ? "s" : ""} across {overview ? overview.applications.length : 0} applications
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search candidate or role…"
                  className="input-glass w-64 pl-9"
                />
              </div>
            </div>

            {toast && (
              <div className="mb-4">
                <Toast message={toast.message} tone={toast.tone} />
              </div>
            )}

            <div className="flex gap-2 mb-6">
              {tabs.map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`btn-glass text-sm ${tab === key ? "!bg-brand-500 !text-white" : ""}`}
                >
                  {label}
                  <span className={`ml-1.5 rounded-full px-1.5 text-[11px] ${tab === key ? "bg-white/25" : "bg-slate-100"}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass skeleton h-24" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="glass p-12 text-center text-slate-500 animate-fade-up">
                <CalendarDays className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="font-medium text-slate-600">No interviews in this view</p>
                <p className="text-sm text-slate-400 mt-1">
                  Schedule interviews from your hiring pipeline to see them here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {visible.map((a, i) => {
                  const cd = countdown(a.interview_at!);
                  return (
                    <div
                      key={a.id}
                      className={`glass p-5 animate-fade-up ${cd.done ? "opacity-75" : ""}`}
                      style={{ animationDelay: `${i * 0.04}s` }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
                            {(a.candidate.full_name ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800">
                              {a.candidate.full_name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {a.job.title}
                              {(a.job.location || a.job.state) && (
                                <>
                                  {" · "}
                                  <MapPin className="inline h-3 w-3 -mt-0.5" />
                                  {a.job.location || a.job.state}
                                </>
                              )}
                            </p>
                            {a.match_score != null && (
                              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                <Sparkles className="h-3 w-3" />
                                {Math.round(a.match_score)}% match
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`chip shrink-0 text-[10px] ${cd.tone}`}>{cd.label}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-violet-700">
                          <Clock className="h-4 w-4" />
                          {formatISODateTime(a.interview_at!)}
                        </span>
                        {a.interview_note && (
                          <span className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                            <span className="truncate">{a.interview_note}</span>
                          </span>
                        )}
                        <button
                          onClick={() => openReschedule(a)}
                          disabled={cd.done}
                          className="btn-ghost ml-auto text-xs font-medium px-3 py-1.5 hover:text-brand-600 disabled:opacity-40"
                        >
                          Reschedule
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Reschedule Modal */}
      <Modal
        open={!!resched}
        title="Reschedule Interview"
        subtitle={resched ? `${resched.candidate.full_name} · ${resched.job.title}` : undefined}
        onClose={() => { if (!saving) setResched(null); }}
        footer={
          <>
            <button onClick={() => setResched(null)} disabled={saving} className="btn-ghost">
              Cancel
            </button>
            <button
              onClick={saveReschedule}
              disabled={saving || !draftAt}
              className="btn-glass disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="interview-datetime" className="mb-1.5 block text-xs font-medium text-slate-400">
              Date &amp; time
            </label>
            <input
              id="interview-datetime"
              type="datetime-local"
              value={draftAt}
              onChange={(e) => setDraftAt(e.target.value)}
              className="input-glass w-full"
            />
          </div>
          <div>
            <label htmlFor="interview-note" className="mb-1.5 block text-xs font-medium text-slate-400">
              Note (mode / location / what to prep)
            </label>
            <textarea
              id="interview-note"
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              rows={3}
              className="input-glass w-full"
              placeholder="e.g. Video call — Google Meet, prepare for SQL + Django questions"
            />
          </div>
          <p className="text-xs text-slate-400">
            The candidate will receive a WhatsApp/SMS notification with the updated time.
          </p>
        </div>
      </Modal>
    </div>
  );
}