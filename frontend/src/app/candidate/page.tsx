"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { usePlacementScore } from "@/lib/hooks/useDashboard";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import {
  Target, ShieldCheck, Sparkles, Briefcase, History, ArrowUpRight,
} from "lucide-react";

export default function CandidateDashboard() {
  useRequireAuth("candidate");
  const [candidateId, setCandidateId] = useState<string | undefined>(undefined);
  const { data: score, loading } = usePlacementScore(candidateId);

  useEffect(() => {
    api.get("/candidates/me")
      .then((res) => setCandidateId(res.data?.id))
      .catch(() => undefined);
  }, []);

  const pct = score?.score_pct ?? 0;
  const tone =
    pct >= 70 ? "text-emerald-600" : pct >= 45 ? "text-amber-600" : "text-rose-600";
  const barTone =
    pct >= 70 ? "from-emerald-500 to-teal-500" : pct >= 45 ? "from-amber-500 to-yellow-500" : "from-rose-500 to-red-500";

  const cards = [
    { href: "/candidate/verification", title: "Identity Verification", desc: "DigiLocker document verification status", icon: ShieldCheck, tint: "from-amber-500 to-orange-500", tag: "Pending", tagTone: "bg-amber-100 text-amber-700" },
    { href: "/candidate/skills", title: "My Skills", desc: "View skill gaps and market demand", icon: Sparkles, tint: "from-brand-500 to-indigo-500" },
    { href: "/candidate/matches", title: "Job Matches", desc: "Personalized job recommendations", icon: Briefcase, tint: "from-sky-500 to-cyan-500" },
    { href: "/candidate/progress", title: "My Progress", desc: "Training completion and survey history", icon: History, tint: "from-violet-500 to-fuchsia-500" },
  ];

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 animate-fade-up">
          <h1 className="text-3xl font-extrabold text-slate-900">Candidate Portal</h1>
          <p className="text-slate-500">Your skills, verification status, and job matches</p>
        </div>

        {candidateId && (
          <div className="glass p-6 mb-8 animate-fade-up delay-100">
            <div className="flex items-start justify-between">
              <div>
                <div className="panel-title mb-1">
                  <Target className="h-5 w-5 text-brand-600" />
                  Placement Likelihood
                </div>
                <p className="text-sm text-slate-500">
                  AI estimate of your probability of employment within 6 months
                </p>
              </div>
              <div className="text-right">
                <span className={`text-4xl font-extrabold ${tone}`}>
                  {loading ? "…" : `${pct}%`}
                </span>
              </div>
            </div>
            {!loading && score && (
              <div className="mt-5">
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${barTone} transition-all duration-1000 ease-out`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {score.factors.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {score.factors.map((f) => (
                      <span
                        key={f.factor}
                        className={`chip ${
                          f.effect === "boost" || f.effect === "high"
                            ? "bg-emerald-100 text-emerald-700"
                            : f.effect === "concern" || f.effect === "low"
                            ? "bg-rose-100 text-rose-700"
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

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {cards.map(({ href, title, desc, icon: Icon, tint, tag, tagTone }, i) => (
            <Link
              key={href}
              href={href}
              className="group glass card-hover animate-fade-up p-6"
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
              {tag && (
                <span className={`chip mt-3 ${tagTone}`}>{tag}</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}