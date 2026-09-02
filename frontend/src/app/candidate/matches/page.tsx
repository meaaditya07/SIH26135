"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import api from "@/lib/api";
import { useCandidateJobMatches, applyToJob } from "@/lib/hooks/useDashboard";
import type { Candidate } from "@/lib/types";
import { SearchX, CheckCircle2 } from "lucide-react";

function matchTone(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-slate-500";
}

export default function CandidateMatchesPage() {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [candidateId, setCandidateId] = useState<string | undefined>(undefined);
  const [minScore, setMinScore] = useState(0);
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState<string | null>(null);
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

  const handleApply = async (jobId: string, title: string) => {
    if (applied[jobId]) return;
    setApplying(jobId);
    try {
      const cover = window.prompt(`Add a cover note for "${title}" (optional)`);
      await applyToJob(jobId, cover ?? undefined);
      setApplied((prev) => ({ ...prev, [jobId]: true }));
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      if (msg === "Already applied to this job") {
        setApplied((prev) => ({ ...prev, [jobId]: true }));
      } else {
        window.alert(msg || "Could not apply. Please try again.");
      }
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="My Job Matches" />
        <main className="p-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-1">
                  Recommended Jobs for {candidate?.full_name ?? "You"}
                </h1>
                <p className="text-slate-500">
                  AI-ranked opportunities matched against your verified skills
                </p>
              </div>
              <select
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value={0}>All matches</option>
                <option value={50}>50%+ match</option>
                <option value={75}>75%+ match</option>
              </select>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-4">
                {error}
              </div>
            )}

            {loading && <p className="text-slate-500">Loading matches…</p>}

            {!loading && matches.length === 0 && (
              <div className="rounded-lg border bg-white p-12 flex flex-col items-center text-center">
                <SearchX className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">No matching jobs found</p>
                <p className="text-sm text-slate-400 mt-1">
                  Update your skills or lower the match threshold to see more opportunities.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {matches.map((m) => (
                <div key={m.job_id} className="rounded-lg border bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">{m.title}</h3>
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

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
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
                          <span key={s} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            {s}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                  {m.skill_gaps.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-slate-400 mr-1">Gaps:</span>
                      {m.skill_gaps.map((s) => (
                        <span key={s} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex justify-end">
                    {applied[m.job_id] ? (
                      <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Applied
                      </span>
                    ) : (
                      <button
                        onClick={(e) => { e.preventDefault(); handleApply(m.job_id, m.title); }}
                        disabled={applying === m.job_id}
                        className="rounded-md bg-brand-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                      >
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
    </div>
  );
}
