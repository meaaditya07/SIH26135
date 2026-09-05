"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import api from "@/lib/api";
import {
  useCandidateMe,
  useCandidateJobMatches,
  applyToJob,
} from "@/lib/hooks/useDashboard";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import type { Candidate } from "@/lib/types";
import { SearchX, CheckCircle2, Sparkles } from "lucide-react";

function matchTone(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-slate-500";
}

export default function CandidateMatchesPage() {
  useRequireAuth("candidate");

  const { data: candidateMe, loading: meLoading } = useCandidateMe();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [candidateId, setCandidateId] = useState<string | undefined>(undefined);
  const [minScore, setMinScore] = useState(0);
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState<string | null>(null);

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyJobId, setApplyJobId] = useState<string | null>(null);
  const [applyJobTitle, setApplyJobTitle] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);

  const { data, loading, error } = useCandidateJobMatches(candidateId, minScore);

  useEffect(() => {
    api.get("/candidates/me")
      .then((res) => {
        setCandidate(res.data);
        setCandidateId(res.data.id);
      })
      .catch(() => setCandidateId(undefined));
  }, []);

  const matches = data?.matches ?? [];

  function openApplyModal(jobId: string, title: string) {
    if (applied[jobId]) return;
    setApplyJobId(jobId);
    setApplyJobTitle(title);
    setCoverNote("");
    setApplyModalOpen(true);
  }

  async function submitApplication() {
    if (!applyJobId) return;
    setApplying(applyJobId);
    try {
      await applyToJob(applyJobId, coverNote.trim() || undefined);
      setApplied((prev) => ({ ...prev, [applyJobId]: true }));
      setApplyModalOpen(false);
      setToast({ msg: `Applied to "${applyJobTitle}" successfully`, tone: "success" });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      if (msg === "Already applied to this job") {
        setApplied((prev) => ({ ...prev, [applyJobId!]: true }));
        setApplyModalOpen(false);
        setToast({ msg: "Already applied to this job", tone: "error" });
      } else {
        setToast({ msg: msg || "Could not apply. Please try again.", tone: "error" });
      }
    } finally {
      setApplying(null);
    }
  }

  const skillTags = candidate?.skill_tags ?? candidateMe?.skill_tags ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="My Job Matches" subtitle="AI-ranked opportunities matched against your skills" />
        <main className="p-6">
          <div className="max-w-5xl mx-auto">
            {toast && <div className="mb-4"><Toast message={toast.msg} tone={toast.tone} /></div>}

            <div className="flex items-center justify-between mb-6 animate-fade-up">
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-1">
                  Recommended Jobs for {candidate?.full_name ?? "You"}
                </h1>
                <p className="text-slate-500">
                  AI-ranked opportunities matched against your verified skills
                </p>
              </div>
              <select
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="input-glass w-auto"
              >
                <option value={0}>All matches</option>
                <option value={50}>50%+ match</option>
                <option value={75}>75%+ match</option>
              </select>
            </div>

            {skillTags.length > 0 && (
              <div className="glass p-4 mb-6 animate-fade-up delay-100">
                <p className="text-xs font-medium text-slate-500 mb-2">Your skills (matches computed against these):</p>
                <div className="flex flex-wrap gap-2">
                  {skillTags.map((s) => (
                    <span key={s} className="chip bg-brand-100 text-brand-700">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="glass border-red-200 bg-red-50/80 p-4 text-sm text-red-700 mb-4">
                {error}
              </div>
            )}

            {loading && (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="glass skeleton h-40" />
                ))}
              </div>
            )}

            {!loading && !error && matches.length === 0 && (
              <div className="glass p-12 flex flex-col items-center text-center animate-fade-up">
                <SearchX className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">No matching jobs found</p>
                <p className="text-sm text-slate-400 mt-1">
                  Update your skills or lower the match threshold to see more opportunities.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {matches.map((m, i) => (
                <div
                  key={m.job_id}
                  className="glass card-hover p-6 animate-fade-up"
                  style={{ animationDelay: `${0.05 * (i + 1)}s` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{m.title}</h3>
                      <p className="text-sm text-slate-500">
                        {m.company ?? "Employer"} · {m.location ?? m.state ?? "Location TBD"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${matchTone(m.match_score)}`}>
                        {m.match_score}%
                      </span>
                      <p className="text-xs text-slate-400">match</p>
                    </div>
                  </div>

                  <div className="glass-inner p-4 grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Salary</p>
                      <p className="text-slate-700">
                        {m.salary_min && m.salary_max
                          ? `₹${m.salary_min.toLocaleString()} – ₹${m.salary_max.toLocaleString()}`
                          : "Not disclosed"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Location Compatible</p>
                      <p className={m.location_compatible ? "text-emerald-600" : "text-red-500"}>
                        {m.location_compatible ? "Yes" : "No (relocation required)"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-2">
                    {m.skill_overlap.length > 0 && (
                      <>
                        <span className="text-xs text-slate-400 mr-1">Matched:</span>
                        {m.skill_overlap.map((s) => (
                          <span key={s} className="chip bg-emerald-100 text-emerald-700">{s}</span>
                        ))}
                      </>
                    )}
                  </div>
                  {m.skill_gaps.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-slate-400 mr-1">Gaps:</span>
                      {m.skill_gaps.map((s) => (
                        <span key={s} className="chip bg-red-100 text-red-700">{s}</span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    {applied[m.job_id] ? (
                      <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Applied
                      </span>
                    ) : (
                      <button
                        onClick={(e) => { e.preventDefault(); openApplyModal(m.job_id, m.title); }}
                        disabled={applying === m.job_id}
                        className="btn-glass text-xs"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {applying === m.job_id ? "Applying…" : "Apply Now"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      <Modal
        open={applyModalOpen}
        title={`Apply to ${applyJobTitle}`}
        subtitle="Add an optional cover note"
        onClose={() => { setApplyModalOpen(false); setApplyJobId(null); }}
        footer={
          <>
            <button
              onClick={() => { setApplyModalOpen(false); setApplyJobId(null); }}
              className="btn-ghost text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              onClick={submitApplication}
              disabled={applying !== null}
              className="btn-glass text-xs px-4 py-2"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {applying ? "Applying…" : "Submit Application"}
            </button>
          </>
        }
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Cover note (optional)</span>
          <textarea
            value={coverNote}
            onChange={(e) => setCoverNote(e.target.value)}
            className="input-glass min-h-[120px] resize-y"
            placeholder="Tell the employer why you're a great fit for this role…"
            autoFocus
          />
        </label>
      </Modal>
    </div>
  );
}
