"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import api from "@/lib/api";
import {
  useJobApplicants,
  usePipeline,
  updateApplicationStatus,
} from "@/lib/hooks/useDashboard";
import type { JobPosting, JobApplicant, ApplicationStatus } from "@/lib/types";
import { Users, TrendingUp, GitBranch } from "lucide-react";

const STAGES: { key: ApplicationStatus; label: string; color: string }[] = [
  { key: "applied", label: "Applied", color: "text-slate-600" },
  { key: "shortlisted", label: "Shortlisted", color: "text-blue-700" },
  { key: "interview", label: "Interview", color: "text-amber-700" },
  { key: "offered", label: "Offered", color: "text-purple-700" },
  { key: "hired", label: "Hired", color: "text-emerald-700" },
  { key: "rejected", label: "Rejected", color: "text-red-600" },
];

export default function EmployerPipelinePage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [reloadKey, setReloadKey] = useState(0);
  const { data, loading } = useJobApplicants(jobId, undefined, reloadKey);
  const { data: pipeline } = usePipeline(jobId, reloadKey);

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
    try {
      await updateApplicationStatus(app.id, target);
      setReloadKey((k) => k + 1);
    } catch (e: unknown) {
      window.alert(
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          "Could not update status"
      );
    }
  };

  const reject = async (app: JobApplicant) => {
    if (app.status === "rejected") return;
    try {
      await updateApplicationStatus(app.id, "rejected");
      setReloadKey((k) => k + 1);
    } catch (e: unknown) {
      window.alert(
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          "Could not reject application"
      );
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

            {pipeline && (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                {STAGES.map((s, i) => (
                  <div key={s.key} className="glass p-4 hover:-translate-y-1 transition-transform animate-fade-up" style={{ animationDelay: `${0.03 * (i + 1)}s` }}>
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
              <div className="space-y-4">
                <div className="glass skeleton h-24" />
                <div className="glass skeleton h-24" />
              </div>
            )}

            {!loading && applicants.length === 0 && (
              <div className="glass p-12 text-center text-slate-500 animate-fade-up">
                No applicants yet for this posting.
              </div>
            )}

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
                            {a.candidate?.district ?? a.candidate?.state ?? "Location TBD"}
                            {a.match_score != null && ` · ${a.match_score}% match`}
                          </p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {a.skill_overlap?.slice(0, 4).map((s) => (
                              <span key={s} className="chip bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5">
                                {s}
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            {stage.key !== "hired" && stage.key !== "rejected" && (
                              <button
                                onClick={() => advance(a)}
                                disabled={stage.key === "offered"}
                                className="btn-glass flex-1 text-[11px] py-1 px-2"
                              >
                                {stage.key === "offered" ? "Hire" : "Advance"}
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
