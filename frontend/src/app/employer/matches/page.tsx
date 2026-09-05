"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import api from "@/lib/api";
import { useJobCandidateMatches, useEmployerShortlist, shortlistCandidate, unshortlistCandidate } from "@/lib/hooks/useDashboard";
import type { JobPosting, JobCandidateMatch } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import { SearchX, User, Phone, Copy, CheckCircle2, Bookmark } from "lucide-react";

function matchTone(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-slate-500";
}

function matchBg(score: number): string {
  if (score >= 75) return "from-emerald-500 to-teal-500";
  if (score >= 50) return "from-amber-500 to-orange-400";
  return "from-slate-400 to-slate-500";
}

export default function EmployerMatchesPage() {
  useRequireAuth("employer");

  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [minScore, setMinScore] = useState(0);
  const { data, loading, error } = useJobCandidateMatches(jobId, minScore);
  const { data: shortlist, refresh: refreshShortlist } = useEmployerShortlist();

  const [profileModal, setProfileModal] = useState<JobCandidateMatch | null>(null);
  const [contactModal, setContactModal] = useState<JobCandidateMatch | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const pendingShortlist = useRef<Set<string>>(new Set());

  useEffect(() => {
    api.get("/job-postings/")
      .then((res) => {
        const list = res.data ?? [];
        setJobs(list);
        if (list.length > 0) setJobId(list[0].id);
      })
      .catch(() => setJobs([]));
  }, []);

  const matches = data?.matches ?? [];
  const selectedJob = jobs.find((j) => j.id === jobId);
  const shortlistedIds = new Set((shortlist ?? []).map((s) => s.candidate_id));

  const toggleShortlist = async (c: JobCandidateMatch) => {
    if (pendingShortlist.current.has(c.candidate_id)) return;
    pendingShortlist.current.add(c.candidate_id);
    const isActive = shortlistedIds.has(c.candidate_id);
    try {
      if (isActive) {
        await unshortlistCandidate(c.candidate_id);
        setToast({ message: "Removed from shortlist", tone: "success" });
      } else {
        await shortlistCandidate(c.candidate_id);
        setToast({ message: "Added to shortlist", tone: "success" });
      }
      await refreshShortlist();
    } catch {
      setToast({ message: "Failed to update shortlist", tone: "error" });
    } finally {
      pendingShortlist.current.delete(c.candidate_id);
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

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Candidate Matching" />
        <main className="p-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-1">Candidate Matches</h1>
                <p className="text-slate-500">
                  AI-ranked candidates for {selectedJob?.title ?? "your posting"}
                </p>
              </div>
              <div className="flex gap-2">
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
                <select
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="input-glass w-auto"
                >
                  <option value={0}>All match scores</option>
                  <option value={50}>50%+ match</option>
                  <option value={75}>75%+ match</option>
                </select>
              </div>
            </div>

            {toast && (
              <div className="mb-4">
                <Toast message={toast.message} tone={toast.tone} />
              </div>
            )}

            {error && (
              <div className="glass border-red-200 bg-red-50/80 p-4 text-sm text-red-700 mb-4">
                {error}
              </div>
            )}

            {loading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass skeleton h-40 animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }} />
                ))}
              </div>
            )}

            {!loading && matches.length === 0 && (
              <div className="glass p-12 flex flex-col items-center text-center animate-fade-up">
                <SearchX className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">No candidates matched</p>
                <p className="text-sm text-slate-400 mt-1">
                  Post a job or lower the match threshold to see candidates.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {matches.map((c, i) => (
                <div
                  key={c.candidate_id}
                  className="glass card-hover p-6 animate-fade-up"
                  style={{ animationDelay: `${0.05 * (i + 1)}s` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${matchBg(c.match_score)} shadow-md`}>
                        <span className="font-bold text-white text-sm">
                          {c.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">{c.full_name}</h3>
                        <p className="text-sm text-slate-500">
                          {[c.district, c.state].filter(Boolean).join(", ") || "Location TBD"} · {c.phone}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${matchTone(c.match_score)} bg-white/80 shadow-sm`}>
                        {c.match_score}%
                      </div>
                      <p className="text-xs text-slate-400 mt-1">match score</p>
                      <p className={`text-xs mt-0.5 ${c.location_compatible ? "text-emerald-600" : "text-red-500"}`}>
                        {c.location_compatible ? "Same state" : "Relocation needed"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-2">
                    {c.skill_overlap.length > 0 && (
                      <>
                        <span className="text-xs text-slate-400 mr-1 self-center">Matching:</span>
                        {c.skill_overlap.map((s) => (
                          <span key={s} className="chip bg-emerald-100 text-emerald-700">{s}</span>
                        ))}
                      </>
                    )}
                  </div>
                  {c.skill_gaps.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-slate-400 mr-1 self-center">Missing:</span>
                      {c.skill_gaps.map((s) => (
                        <span key={s} className="chip bg-red-100 text-red-700">{s}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setProfileModal(c)}
                      className="btn-ghost text-xs"
                    >
                      <User className="h-3.5 w-3.5" /> View Profile
                    </button>
                    <button
                      onClick={() => { setContactModal(c); setCopied(false); }}
                      className="btn-glass text-xs"
                    >
                      <Phone className="h-3.5 w-3.5" /> Contact
                    </button>
                    <button
                      onClick={() => toggleShortlist(c)}
                      disabled={pendingShortlist.current.has(c.candidate_id)}
                      className={`btn-glass text-xs ${shortlistedIds.has(c.candidate_id) ? "text-violet-600" : ""}`}
                    >
                      {shortlistedIds.has(c.candidate_id) ? (
                        <Bookmark className="h-3.5 w-3.5 fill-violet-600 text-violet-600" />
                      ) : (
                        <Bookmark className="h-3.5 w-3.5" />
                      )}
                      {shortlistedIds.has(c.candidate_id) ? "Saved" : "Save"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Profile Modal */}
      <Modal open={!!profileModal} title="Candidate Profile" onClose={() => setProfileModal(null)} size="lg">
        {profileModal && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${matchBg(profileModal.match_score)} shadow-lg`}>
                <span className="font-bold text-white text-xl">
                  {profileModal.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{profileModal.full_name}</h2>
                <p className="text-sm text-slate-500">
                  {[profileModal.district, profileModal.state].filter(Boolean).join(", ") || "Location TBD"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="glass-inner p-4 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">Match Score</p>
                <p className={`text-3xl font-bold ${matchTone(profileModal.match_score)}`}>
                  {profileModal.match_score}%
                </p>
              </div>
              <div className="glass-inner p-4 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">Location</p>
                <p className="text-sm font-medium text-slate-700">
                  {profileModal.location_compatible ? "✓ Same state" : "✗ Relocation needed"}
                </p>
              </div>
            </div>

            {profileModal.skill_overlap.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Matching Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {profileModal.skill_overlap.map((s) => (
                    <span key={s} className="chip bg-emerald-100 text-emerald-700 text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {profileModal.skill_gaps.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Missing Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {profileModal.skill_gaps.map((s) => (
                    <span key={s} className="chip bg-red-100 text-red-700 text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-inner p-4 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Phone</p>
              <p className="text-sm font-medium text-slate-700">{profileModal.phone}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Contact Modal */}
      <Modal open={!!contactModal} title="Contact Candidate" onClose={() => setContactModal(null)}>
        {contactModal && (
          <div className="space-y-4">
            <div className="glass-inner p-4 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Candidate</p>
              <p className="font-medium text-slate-800">{contactModal.full_name}</p>
            </div>
            <div className="glass-inner p-4 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Phone Number</p>
              <div className="flex items-center gap-3">
                <p className="text-lg font-semibold text-slate-800">{contactModal.phone}</p>
                <button
                  onClick={() => copyPhone(contactModal.phone)}
                  className="btn-ghost text-xs px-2 py-1"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              {contactModal.location_compatible
                ? "Candidate is in the same state — local hire."
                : "Candidate would need to relocate."}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
