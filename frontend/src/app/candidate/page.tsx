"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { usePlacementScore } from "@/lib/hooks/useDashboard";
import { Target } from "lucide-react";

export default function CandidateDashboard() {
  const [candidateId, setCandidateId] = useState<string | undefined>(undefined);
  const { data: score, loading } = usePlacementScore(candidateId);

  useEffect(() => {
    api.get("/candidates/me")
      .then((res) => setCandidateId(res.data?.id))
      .catch(() => undefined);
  }, []);

  const pct = score?.score_pct ?? 0;
  const tone =
    pct >= 70 ? "text-emerald-600" : pct >= 45 ? "text-amber-600" : "text-red-600";
  const barTone =
    pct >= 70 ? "bg-emerald-500" : pct >= 45 ? "bg-amber-500" : "bg-red-500";

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Candidate Portal</h1>
        <p className="text-slate-500 mb-8">Your skills, verification status, and job matches</p>

        {candidateId && (
          <div className="rounded-lg border bg-white p-6 shadow-sm mb-8">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-brand-600" />
                  <h3 className="font-semibold text-slate-800">Placement Likelihood</h3>
                </div>
                <p className="text-sm text-slate-500">
                  AI estimate of your probability of employment within 6 months
                </p>
              </div>
              <div className="text-right">
                <span className={`text-3xl font-bold ${tone}`}>
                  {loading ? "…" : `${pct}%`}
                </span>
              </div>
            </div>
            {!loading && score && (
              <div className="mt-4">
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-2.5 ${barTone} rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {score.factors.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {score.factors.map((f) => (
                      <span
                        key={f.factor}
                        className={`text-xs px-2 py-1 rounded-full ${
                          f.effect === "boost" || f.effect === "high"
                            ? "bg-emerald-100 text-emerald-700"
                            : f.effect === "concern" || f.effect === "low"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                        title={f.detail}
                      >
                        {f.detail}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/candidate/verification" className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md">
            <h3 className="font-semibold text-slate-800">Identity Verification</h3>
            <p className="text-sm text-slate-500 mt-1">DigiLocker document verification status</p>
            <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>
          </Link>
          <Link href="/candidate/skills" className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md">
            <h3 className="font-semibold text-slate-800">My Skills</h3>
            <p className="text-sm text-slate-500 mt-1">View skill gaps and market demand</p>
          </Link>
          <Link href="/candidate/matches" className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md">
            <h3 className="font-semibold text-slate-800">Job Matches</h3>
            <p className="text-sm text-slate-500 mt-1">Personalized job recommendations</p>
          </Link>
          <Link href="/candidate/progress" className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md">
            <h3 className="font-semibold text-slate-800">My Progress</h3>
            <p className="text-sm text-slate-500 mt-1">Training completion and survey history</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
