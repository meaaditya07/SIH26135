"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import api from "@/lib/api";
import { useJobCandidateMatches } from "@/lib/hooks/useDashboard";
import type { JobPosting } from "@/lib/types";
import { SearchX, User, Contact } from "lucide-react";

function matchTone(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-slate-500";
}

export default function EmployerMatchesPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [minScore, setMinScore] = useState(0);
  const { data, loading, error } = useJobCandidateMatches(jobId, minScore);

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

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Candidate Matching" />
        <main className="p-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
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

            {error && (
              <div className="glass border-red-200 bg-red-50/80 p-4 text-sm text-red-700 mb-4">
                {error}
              </div>
            )}

            {loading && (
              <div className="space-y-4">
                <div className="glass skeleton h-36" />
                <div className="glass skeleton h-36" />
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
                <div key={c.candidate_id} className="glass card-hover p-6 animate-fade-up" style={{ animationDelay: `${0.05 * (i + 1)}s` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 shadow-md">
                        <span className="font-bold text-white text-sm">
                          {c.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">{c.full_name}</h3>
                        <p className="text-sm text-slate-500">
                          {c.district ?? c.state ?? "Location TBD"} · {c.phone}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${matchTone(c.match_score)}`}>
                        {c.match_score}%
                      </span>
                      <p className="text-xs text-slate-400">match</p>
                      <p className={`text-xs mt-1 ${c.location_compatible ? "text-emerald-600" : "text-red-500"}`}>
                        {c.location_compatible ? "Same state" : "Relocation"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-2">
                    {c.skill_overlap.length > 0 && (
                      <>
                        <span className="text-xs text-slate-400 mr-1">Overlapping:</span>
                        {c.skill_overlap.map((s) => (
                          <span key={s} className="chip bg-emerald-100 text-emerald-700">
                            {s}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                  {c.skill_gaps.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-slate-400 mr-1">Missing:</span>
                      {c.skill_gaps.map((s) => (
                        <span key={s} className="chip bg-red-100 text-red-700">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button className="btn-ghost text-xs">
                      <User className="h-3.5 w-3.5" /> View Profile
                    </button>
                    <button className="btn-glass text-xs">
                      <Contact className="h-3.5 w-3.5" /> Contact
                    </button>
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
