"use client";

import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import {
  useCandidateMe,
  useOutcomeTimeline,
} from "@/lib/hooks/useDashboard";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import { CheckCircle, Circle, Clock, Milestone, ArrowRight } from "lucide-react";
import Link from "next/link";

const INTERVAL_LABELS: Record<string, string> = {
  "3_month": "3-Month Follow-up",
  "6_month": "6-Month Follow-up",
  "12_month": "12-Month Follow-up",
};

const INTERVAL_ORDER = ["enrolled", "3_month", "6_month", "12_month"];

function timelineStatus(entry: { is_employed: boolean } | null | undefined) {
  if (!entry) return { icon: Circle, color: "text-slate-400 border-slate-200 bg-slate-50", label: "Upcoming" };
  return {
    icon: CheckCircle,
    color: "text-emerald-600 border-emerald-200 bg-emerald-50",
    label: entry.is_employed ? "Employed" : "Not Employed",
  };
}

export default function ProgressPage() {
  useRequireAuth("candidate");

  const { data: candidate, loading: candLoading } = useCandidateMe();
  const { data: timeline, loading: tlLoading } = useOutcomeTimeline(candidate?.id);

  const loading = candLoading || tlLoading;

  const timelineMap = new Map<string, (typeof timeline)[number]>();
  for (const entry of timeline) {
    timelineMap.set(entry.interval, entry);
  }

  const hasData = timeline.length > 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="My Journey" subtitle="Training progress & employment outcomes" />
        <main className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 animate-fade-up">
              <h1 className="text-3xl font-extrabold text-slate-900 mb-1">My Journey</h1>
              <p className="text-slate-500">Your training, follow-up surveys, and employment outcomes</p>
            </div>

            {loading && (
              <div className="space-y-4">
                <div className="glass skeleton h-28" />
                <div className="glass skeleton h-48" />
              </div>
            )}

            {!loading && !hasData && (
              <div className="glass p-12 flex flex-col items-center text-center animate-fade-up">
                <Milestone className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">No outcome data yet</p>
                <p className="text-sm text-slate-400 mt-1 mb-4">
                  Complete your first follow-up survey to see your journey here.
                </p>
                <Link href="/candidate/matches" className="btn-glass text-xs">
                  Browse jobs <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {!loading && hasData && (
              <>
                <div className="glass p-6 mb-8 animate-fade-up">
                  <h3 className="panel-title mb-4"><Milestone className="h-5 w-5 text-brand-600" /> Timeline</h3>
                  <div className="space-y-0">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full border flex items-center justify-center text-emerald-600 border-emerald-200 bg-emerald-50">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                        <div className="w-px flex-1 bg-slate-200" />
                      </div>
                      <div className="pb-8 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-slate-700">Enrolled in Training</h4>
                          <span className="text-xs text-slate-400">
                            {candidate?.created_at ? new Date(candidate.created_at).toLocaleDateString() : "—"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">Candidate profile registered</p>
                      </div>
                    </div>

                    {INTERVAL_ORDER.filter((k) => k !== "enrolled").map((key, i, arr) => {
                      const entry = timelineMap.get(key);
                      const status = timelineStatus(entry);
                      const Icon = status.icon;
                      const isLast = i === arr.length - 1 && !timelineMap.has(arr[i + 1]);
                      return (
                        <div key={key} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`h-8 w-8 rounded-full border flex items-center justify-center ${status.color}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            {!isLast && <div className="w-px flex-1 bg-slate-200" />}
                          </div>
                          <div className="pb-8 flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-slate-700">
                                {INTERVAL_LABELS[key] ?? key}
                              </h4>
                              <span className="text-xs text-slate-400">
                                {entry?.survey_date ? new Date(entry.survey_date).toLocaleDateString() : "Not yet due"}
                              </span>
                            </div>
                            {entry ? (
                              <p className="text-sm text-slate-500 mt-1">
                                {entry.is_employed
                                  ? `${entry.job_title ?? "Employed"}${entry.monthly_salary ? ` · ₹${entry.monthly_salary.toLocaleString()}/mo` : ""}`
                                  : "Not employed at this interval"}
                              </p>
                            ) : (
                              <p className="text-sm text-slate-400 mt-1">Scheduled survey</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="glass overflow-hidden animate-fade-up delay-100">
                  <div className="p-4 border-b border-slate-100">
                    <h3 className="panel-title"><Milestone className="h-5 w-5 text-brand-600" /> Employment Outcomes</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {INTERVAL_ORDER.filter((k) => k !== "enrolled").map((key) => {
                      const entry = timelineMap.get(key);
                      return (
                        <div key={key} className="flex items-center justify-between p-4 hover:bg-white/70 transition-colors">
                          <div>
                            <p className="font-medium text-slate-700">
                              {INTERVAL_LABELS[key] ?? key}
                            </p>
                            <p className="text-sm text-slate-500">
                              {entry?.is_employed && entry.job_title
                                ? `${entry.job_title}${entry.monthly_salary ? ` · ₹${entry.monthly_salary.toLocaleString()}/mo` : ""}`
                                : entry?.is_employed
                                ? "Employed (details pending)"
                                : entry
                                ? "Not employed"
                                : "Pending response"}
                            </p>
                          </div>
                          <span className={`chip ${
                            entry?.is_employed
                              ? "bg-emerald-100 text-emerald-700"
                              : entry
                              ? "bg-slate-100 text-slate-600"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {entry?.channel === "employer" ? "Employer Verified"
                              : entry?.is_employed ? "Self-Reported"
                              : "Pending"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
