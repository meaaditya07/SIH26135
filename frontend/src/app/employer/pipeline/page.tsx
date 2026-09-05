"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import api from "@/lib/api";
import {
  useJobApplicants,
  usePipeline,
  updateApplicationStatus,
} from "@/lib/hooks/useDashboard";
import { formatINR, formatISODate, formatISODateTime } from "@/lib/utils";
import type { JobPosting, JobApplicant, ApplicationStatus } from "@/lib/types";
import Toast from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import { Users, TrendingUp, MessageSquare, CalendarDays } from "lucide-react";

const STAGES: { key: ApplicationStatus; label: string; color: string; bg: string }[] = [
  { key: "applied", label: "Applied", color: "text-slate-600", bg: "bg-slate-50" },
  { key: "shortlisted", label: "Shortlisted", color: "text-blue-700", bg: "bg-blue-50" },
  { key: "interview", label: "Interview", color: "text-amber-700", bg: "bg-amber-50" },
  { key: "offered", label: "Offered", color: "text-purple-700", bg: "bg-purple-50" },
  { key: "hired", label: "Hired", color: "text-emerald-700", bg: "bg-emerald-50" },
  { key: "rejected", label: "Rejected", color: "text-red-600", bg: "bg-red-50" },
];

export default function EmployerPipelinePage() {
  useRequireAuth("employer");

  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [reloadKey, setReloadKey] = useState(0);
  const { data, loading } = useJobApplicants(jobId, undefined, reloadKey);
  const { data: pipeline } = usePipeline(jobId, reloadKey);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const [moveModal, setMoveModal] = useState<{ app: JobApplicant; target: ApplicationStatus } | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const [offerStartDate, setOfferStartDate] = useState("");
  const [offerSalary, setOfferSalary] = useState("");
  const [interviewAt, setInterviewAt] = useState("");
  const [interviewNote, setInterviewNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/job-postings/")
      .then((res) => {
        const list = res.data ?? [];
        setJobs(list);
        if (list.length > 0) setJobId(list[0].id);
      })
      .catch(() => undefined);
  }, []);

  const applicants = data?.applicants ?? [];
  const grouped = (stage: ApplicationStatus) =>
    applicants.filter((a) => a.status === stage);

  const advance = async (app: JobApplicant) => {
    const next: Partial<Record<ApplicationStatus, ApplicationStatus>> = {
      applied: "shortlisted",
      shortlisted: "interview",
      interview: "offered",
      offered: "hired",
    };
    const target = next[app.status];
    if (!target) return;
    setMoveModal({ app, target });
    setFeedbackDraft("");
    setOfferStartDate("");
    setOfferSalary("");
    setInterviewAt("");
    setInterviewNote("");
  };

  const reject = async (app: JobApplicant) => {
    if (app.status === "rejected") return;
    setMoveModal({ app, target: "rejected" });
    setFeedbackDraft("");
    setOfferStartDate("");
    setOfferSalary("");
    setInterviewAt("");
    setInterviewNote("");
  };

  const confirmMove = async () => {
    const modal = moveModal;
    if (!modal) return;
    const { app, target } = modal;
    if (target === "rejected" && !feedbackDraft.trim()) return;
    if (target === "hired" && !offerStartDate.trim()) return;
    if (target === "interview" && !interviewAt.trim()) return;
    setSaving(true);
    try {
      const salaryRaw = offerSalary.trim();
      const salaryParsed =
        salaryRaw !== "" && Number.isFinite(Number(salaryRaw))
          ? Number(salaryRaw)
          : null;
      const offer =
        target === "hired"
          ? { start_date: offerStartDate.trim(), salary_offered: salaryParsed }
          : undefined;
      const interview =
        target === "interview"
          ? { at: interviewAt.trim() || null, note: interviewNote.trim() || null }
          : undefined;
      await updateApplicationStatus(app.id, target, feedbackDraft, offer, interview);
      const message =
        target === "rejected"
          ? `${app.candidate?.full_name ?? "Candidate"} has been rejected.`
          : target === "interview"
          ? `${app.candidate?.full_name ?? "Candidate"}'s interview has been scheduled.`
          : target === "hired"
          ? `${app.candidate?.full_name ?? "Candidate"} has been hired.`
          : `${app.candidate?.full_name ?? "Candidate"} moved to ${target}.`;
      setToast({ message, tone: target === "rejected" ? "info" : "success" });
      setMoveModal(null);
      setFeedbackDraft("");
      setOfferStartDate("");
      setOfferSalary("");
      setInterviewAt("");
      setInterviewNote("");
      setReloadKey((k) => k + 1);
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Could not update status";
      setToast({ message: detail, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Hiring Pipeline" />
        <main className="p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-1">Hiring Pipeline</h1>
                <p className="text-slate-500">Manage candidates across your hiring stages</p>
              </div>
              <select
                value={jobId ?? ""}
                onChange={(e) => setJobId(e.target.value)}
                className="input-glass w-auto"
              >
                {!jobId && <option value="">Select a job…</option>}
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            </div>

            {toast && (
              <div className="mb-4">
                <Toast message={toast.message} tone={toast.tone} />
              </div>
            )}

            {pipeline && (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                {STAGES.map((s, i) => (
                  <div
                    key={s.key}
                    className={`glass p-4 hover:-translate-y-1 transition-transform animate-fade-up ${s.bg}`}
                    style={{ animationDelay: `${0.03 * (i + 1)}s` }}
                  >
                    <div className="flex items-center gap-2">
                      {s.key === "applied" ? (
                        <Users className="h-4 w-4 text-slate-400" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-slate-400" />
                      )}
                      <span className="text-xs text-slate-500 capitalize">{s.label}</span>
                    </div>
                    <p className={`text-2xl font-bold mt-1 ${s.color}`}>
                      {s.key === "hired"
                        ? pipeline.hired
                        : pipeline.stages[s.key] ?? 0}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {STAGES.map((s) => (
                  <div key={s.key} className="glass-inner p-4">
                    <div className="glass skeleton h-6 mb-3" />
                    <div className="glass skeleton h-20 mb-2" />
                    <div className="glass skeleton h-20" />
                  </div>
                ))}
              </div>
            )}

            {!loading && applicants.length === 0 && (
              <div className="glass p-12 text-center text-slate-500 animate-fade-up">
                No applicants yet for this posting.
              </div>
            )}

            {!loading && applicants.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {STAGES.map((stage) => {
                  const items = grouped(stage.key);
                  return (
                    <div key={stage.key} className="glass-inner p-4">
                      <h3 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${stage.color}`}>
                        {stage.label}
                        <span className="text-xs text-slate-400">({items.length})</span>
                      </h3>
                      <div className="space-y-3">
                        {items.map((a) => (
                          <div key={a.id} className="glass p-4 animate-scale-in">
                            <p className="font-medium text-slate-800">
                              {a.candidate?.full_name ?? "Candidate"}
                            </p>
                            <p className="text-xs text-slate-500 mb-2">
                              {[a.candidate?.district, a.candidate?.state].filter(Boolean).join(", ") || "Location TBD"}
                              {a.match_score != null && ` · ${a.match_score}% match`}
                            </p>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {a.skill_overlap?.slice(0, 4).map((s) => (
                                <span key={s} className="chip bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5">
                                  {s}
                                </span>
                              ))}
                            </div>
                            {a.status === "hired" && (a.offer_start_date || a.offer_salary != null) && (
                              <p className="mb-2 text-[11px] font-semibold text-emerald-600">
                                {a.offer_start_date
                                  ? `Offer: starts ${formatISODate(a.offer_start_date)}`
                                  : "Offer"}
                                {a.offer_salary != null && ` • ₹${formatINR(a.offer_salary)}/year`}
                              </p>
                            )}
                            {a.status === "interview" && a.interview_at && (
                              <p
                                title={a.interview_note ?? undefined}
                                className="mb-2 text-[11px] font-semibold text-violet-300"
                              >
                                Interview: {formatISODateTime(a.interview_at)}
                                {a.interview_note && ` • ${a.interview_note}`}
                              </p>
                            )}
                            {a.feedback && (
                              <p
                                title={`Employer feedback: ${a.feedback}`}
                                className="mb-2 flex items-start gap-1 text-[11px] text-slate-500 line-clamp-2"
                              >
                                <MessageSquare className="mt-0.5 h-3 w-3 flex-shrink-0 text-violet-500" />
                                <span className="truncate">{a.feedback}</span>
                              </p>
                            )}
                            <div className="flex gap-2">
                              {stage.key !== "hired" && stage.key !== "rejected" && (
                                <button
                                  onClick={() => advance(a)}
                                  className="btn-glass flex-1 text-[11px] py-1 px-2"
                                >
                                  {stage.key === "offered" ? "Hire" : stage.key === "interview" ? "Offer" : "Advance"}
                                </button>
                              )}
                              {(stage.key === "applied" || stage.key === "shortlisted") && (
                                <button
                                  onClick={() => {
                                    setMoveModal({ app: a, target: "interview" });
                                    setFeedbackDraft("");
                                    setOfferStartDate("");
                                    setOfferSalary("");
                                    setInterviewAt("");
                                    setInterviewNote("");
                                  }}
                                  title="Schedule interview directly"
                                  className="btn-glass flex-1 text-[11px] py-1 px-2"
                                >
                                  <CalendarDays className="mr-1 inline h-3 w-3" />
                                  Interview
                                </button>
                              )}
                              {stage.key !== "rejected" && stage.key !== "hired" && (
                                <button
                                  onClick={() => reject(a)}
                                  className="btn-ghost text-[11px] py-1 px-2 hover:text-red-600 hover:border-red-200"
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        {items.length === 0 && (
                          <p className="text-xs text-slate-400 text-center py-4">No candidates</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Status Change / Feedback Modal */}
      <Modal
        open={!!moveModal}
        title={
          moveModal?.target === "rejected"
            ? "Reject Candidate?"
            : moveModal?.target === "interview"
            ? "Schedule Interview?"
            : moveModal?.target === "hired"
            ? "Offer & Hire Candidate?"
            : "Advance Candidate"
        }
        subtitle={moveModal ? `${moveModal.app.candidate?.full_name ?? "Candidate"} → ${moveModal.target}` : undefined}
        onClose={() => { if (!saving) setMoveModal(null); }}
        footer={
          <>
            <button onClick={() => setMoveModal(null)} disabled={saving} className="btn-ghost">
              Cancel
            </button>
            <button
              onClick={confirmMove}
              disabled={
                saving ||
                (moveModal?.target === "rejected" && !feedbackDraft.trim()) ||
                (moveModal?.target === "hired" && !offerStartDate.trim()) ||
                (moveModal?.target === "interview" && !interviewAt.trim())
              }
              className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition ${
                moveModal?.target === "rejected"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-gradient-to-r from-brand-500 to-indigo-500 hover:opacity-90"
              } disabled:opacity-50`}
            >
              {saving
                ? "Saving…"
                : moveModal?.target === "rejected"
                ? "Reject"
                : moveModal?.target === "interview"
                ? "Schedule"
                : moveModal?.target === "hired"
                ? "Hire"
                : "Confirm"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {moveModal?.target === "rejected" && (
            <p className="text-sm text-slate-400">
              Are you sure you want to reject{" "}
              <strong className="text-slate-200">{moveModal.app.candidate?.full_name ?? "this candidate"}</strong>?
              This action cannot be undone. Please provide feedback for the candidate.
            </p>
          )}
          {moveModal?.target === "hired" && (
            <p className="text-sm text-slate-400">
              Confirm the offer for{" "}
              <strong className="text-slate-200">{moveModal?.app.candidate?.full_name ?? "this candidate"}</strong>.
              The candidate will see the start date and salary on their application.
            </p>
          )}
          {moveModal?.target === "interview" && (
            <p className="text-sm text-slate-400">
              Pick a date, time and note (mode / location / what to prep) for{" "}
              <strong className="text-slate-200">{moveModal?.app.candidate?.full_name ?? "this candidate"}</strong>.
              They will see it on their application.
            </p>
          )}
          {moveModal?.target !== "rejected" &&
            moveModal?.target !== "hired" &&
            moveModal?.target !== "interview" && (
              <p className="text-sm text-slate-400">
                Move{" "}
                <strong className="text-slate-200">{moveModal?.app.candidate?.full_name ?? "this candidate"}</strong>{" "}
                to <strong className="text-slate-200 capitalize">{moveModal?.target}</strong>?
              </p>
            )}

          {moveModal?.target === "hired" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="offer-start-date" className="mb-1.5 block text-xs font-medium text-slate-400">
                  Start date <span className="text-emerald-400">(required)</span>
                </label>
                <input
                  id="offer-start-date"
                  type="date"
                  value={offerStartDate}
                  onChange={(e) => setOfferStartDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-brand-400 focus:bg-white/[0.07] focus:ring-2 focus:ring-brand-500/20 [color-scheme:dark]"
                />
                {!offerStartDate && (
                  <p className="mt-1 text-xs text-amber-400">Select a start date</p>
                )}
              </div>
              <div>
                <label htmlFor="offer-salary" className="mb-1.5 block text-xs font-medium text-slate-400">
                  Salary offered (₹/year) <span className="text-slate-500">(optional)</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    ₹
                  </span>
                  <input
                    id="offer-salary"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={offerSalary}
                    onChange={(e) => setOfferSalary(e.target.value)}
                    placeholder="e.g. 580000"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-7 pr-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-brand-400 focus:bg-white/[0.07] focus:ring-2 focus:ring-brand-500/20 [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>
          )}

          {moveModal?.target === "interview" && (
            <div className="space-y-3">
              <div>
                <label htmlFor="interview-datetime" className="mb-1.5 block text-xs font-medium text-slate-400">
                  Interview date &amp; time <span className="text-violet-400">(required)</span>
                </label>
                <input
                  id="interview-datetime"
                  type="datetime-local"
                  value={interviewAt}
                  onChange={(e) => setInterviewAt(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-violet-400 focus:bg-white/[0.07] focus:ring-2 focus:ring-violet-500/20 [color-scheme:dark]"
                />
                {!interviewAt && (
                  <p className="mt-1 text-xs text-amber-400">Pick an interview time</p>
                )}
              </div>
              <div>
                <label htmlFor="interview-note" className="mb-1.5 block text-xs font-medium text-slate-400">
                  Interview note <span className="text-slate-500">(optional)</span>
                </label>
                <textarea
                  id="interview-note"
                  value={interviewNote}
                  onChange={(e) => setInterviewNote(e.target.value)}
                  placeholder="Mode (in-person / video), location, what to prepare…"
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-violet-400 focus:bg-white/[0.07] focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="feedback-input" className="mb-1.5 block text-xs font-medium text-slate-400">
              {moveModal?.target === "rejected" ? (
                <>Notes / feedback for candidate <span className="text-red-400">(required)</span></>
              ) : (
                <>Notes / feedback for candidate <span className="text-slate-500">(optional)</span></>
              )}
            </label>
            <textarea
              id="feedback-input"
              value={feedbackDraft}
              onChange={(e) => setFeedbackDraft(e.target.value)}
              placeholder="Add constructive feedback the candidate will be able to see…"
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-brand-400 focus:bg-white/[0.07] focus:ring-2 focus:ring-brand-500/20"
            />
            {moveModal?.target === "rejected" && !feedbackDraft.trim() && (
              <p className="mt-1 text-xs text-red-400">Add feedback before rejecting</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}