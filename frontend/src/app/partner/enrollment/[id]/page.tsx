"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import { useOutcomeTimeline } from "@/lib/hooks/useDashboard";
import api from "@/lib/api";
import type { EnrollmentRich, OutcomeTimelineEntry } from "@/lib/types";
import { ArrowLeft, Calendar, Award, Wallet, MapPin, Briefcase, AlertCircle } from "lucide-react";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton animate-pulse rounded-lg ${className ?? ""}`} />;
}

function StatusChip({ enrolled, employed }: { enrolled: boolean; employed: boolean | null }) {
  if (employed === true) {
    return <span className="chip bg-emerald-100 text-emerald-700 text-sm font-medium px-3 py-1.5">Employed</span>;
  }
  if (employed === false) {
    return <span className="chip bg-amber-100 text-amber-700 text-sm font-medium px-3 py-1.5">Seeking</span>;
  }
  if (enrolled) {
    return <span className="chip bg-slate-100 text-slate-600 text-sm font-medium px-3 py-1.5">In Training</span>;
  }
  return <span className="chip bg-slate-100 text-slate-500 text-sm font-medium px-3 py-1.5">Enrolled</span>;
}

export default function EnrollmentDetailPage() {
  useRequireAuth("training_partner");

  const params = useParams();
  const enrollmentId = params.id as string;

  const [enriched, setEnriched] = useState<EnrollmentRich | null>(null);
  const [enrichedLoading, setEnrichedLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const { data: timeline, loading: timelineLoading } = useOutcomeTimeline(
    enriched?.candidate_id
  );

  useEffect(() => {
    if (!enrollmentId) return;
    setEnrichedLoading(true);
    api
      .get("/enrollments/enriched", { params: { limit: 500, skip: 0 } })
      .then((res) => {
        const rows: EnrollmentRich[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        const match = rows.find((e) => e.id === enrollmentId);
        if (match) {
          setEnriched(match);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setEnrichedLoading(false));
  }, [enrollmentId]);

  const latestOutcome = timeline && timeline.length > 0 ? timeline[timeline.length - 1] : null;

  if (enrichedLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1">
          <TopBar title="Enrollment Details" />
          <main className="space-y-6 p-6">
            <div className="max-w-4xl mx-auto space-y-4">
              <SkeletonBlock className="h-8 w-64" />
              <SkeletonBlock className="h-4 w-48" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SkeletonBlock className="h-24 w-full" />
                <SkeletonBlock className="h-24 w-full" />
                <SkeletonBlock className="h-24 w-full" />
                <SkeletonBlock className="h-24 w-full" />
              </div>
              <SkeletonBlock className="h-64 w-full" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (notFound || !enriched) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1">
          <TopBar title="Enrollment Details" />
          <main className="space-y-6 p-6">
            <div className="max-w-4xl mx-auto">
              <nav className="text-sm text-slate-500 mb-6">
                <Link href="/partner/students" className="inline-flex items-center gap-1 hover:text-brand-600 transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Students
                </Link>
              </nav>
              <div className="glass p-16 text-center animate-fade-up">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                <h2 className="text-xl font-bold text-slate-700 mb-2">Enrollment Not Found</h2>
                <p className="text-sm text-slate-500">
                  The enrollment with ID <span className="font-mono text-xs">{enrollmentId}</span> could not be found.
                </p>
                <Link
                  href="/partner/students"
                  className="btn-glass mt-6 inline-flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Students
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const infoCards = [
    {
      label: "Enrolled",
      value: enriched.enrollment_date
        ? new Date(enriched.enrollment_date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
        : "\u2014",
      icon: Calendar,
      tint: "from-brand-500 to-indigo-500",
    },
    {
      label: "Completed",
      value: enriched.completion_date
        ? new Date(enriched.completion_date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
        : enriched.is_completed
        ? "Yes"
        : "Not yet",
      icon: Award,
      tint: "from-emerald-500 to-teal-500",
    },
    {
      label: "Current Salary",
      value: latestOutcome?.monthly_salary != null
        ? `\u20B9${latestOutcome.monthly_salary.toLocaleString()} / month`
        : enriched.monthly_salary != null
        ? `\u20B9${enriched.monthly_salary.toLocaleString()} / month`
        : "\u2014",
      icon: Wallet,
      tint: "from-sky-500 to-cyan-500",
    },
    {
      label: "Job Location",
      value: latestOutcome?.job_location || enriched.job_location || "\u2014",
      icon: MapPin,
      tint: "from-violet-500 to-fuchsia-500",
    },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Enrollment Details" subtitle={enriched.candidate_name} />
        <main className="space-y-6 p-6">
          <div className="max-w-4xl mx-auto">
            <nav className="text-sm text-slate-500 mb-6">
              <Link href="/partner/students" className="inline-flex items-center gap-1 hover:text-brand-600 transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Students
              </Link>
            </nav>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 animate-fade-up">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-1">
                  {enriched.candidate_name || "Unknown Student"}
                </h1>
                <p className="text-slate-500">
                  {enriched.course_name || "Unknown Course"}
                  {enriched.certificate_id && (
                    <span className="ml-2 text-xs text-slate-400">
                      &middot; Cert: {enriched.certificate_id.slice(0, 12)}
                    </span>
                  )}
                </p>
              </div>
              <StatusChip enrolled={true} employed={enriched.is_employed} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {infoCards.map((card, i) => (
                <div
                  key={card.label}
                  className="glass p-5 hover:-translate-y-1 transition-transform animate-fade-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.tint} shadow-md`}>
                      <card.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">{card.label}</p>
                      <p className="font-medium text-slate-700">{card.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass p-6 animate-fade-up delay-200">
                <h3 className="panel-title mb-4">
                  <Calendar className="h-5 w-5 text-brand-600" /> Outcome Timeline
                </h3>
                {timelineLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex gap-3">
                        <SkeletonBlock className="h-3 w-3 rounded-full mt-1 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <SkeletonBlock className="h-4 w-3/4" />
                          <SkeletonBlock className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : timeline.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">
                    <Briefcase className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    <p>No outcome surveys recorded yet.</p>
                    <p className="mt-1 text-xs text-slate-300">Timeline data will appear after survey responses.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {timeline.map((t: OutcomeTimelineEntry, i: number) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`h-2.5 w-2.5 rounded-full mt-1 ${
                              t.is_employed ? "bg-emerald-500" : "bg-brand-500"
                            }`}
                          />
                          {i < timeline.length - 1 && <div className="w-px flex-1 bg-slate-200" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">
                            {t.interval} survey
                            {t.is_employed && t.job_title ? `: Employed as ${t.job_title}` : ""}
                            {t.is_employed && !t.job_title ? ": Employed" : ""}
                            {!t.is_employed ? ": Not employed" : ""}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                            <span>{t.survey_date ? new Date(t.survey_date).toLocaleDateString("en-IN") : "\u2014"}</span>
                            {t.monthly_salary != null && (
                              <span className="text-emerald-600 font-medium">
                                {"\u20B9"}{t.monthly_salary.toLocaleString()}/mo
                              </span>
                            )}
                            {t.job_location && <span>{t.job_location}</span>}
                            {t.channel && <span className="capitalize">{t.channel}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass p-6 animate-fade-up delay-300">
                <h3 className="panel-title mb-4">
                  <Wallet className="h-5 w-5 text-brand-600" /> Salary Progression
                </h3>
                {timeline.filter((t) => t.monthly_salary != null).length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">
                    <Wallet className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    <p>No salary data available yet.</p>
                    <p className="mt-1 text-xs text-slate-300">Salary data appears after employment outcomes are recorded.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-end justify-between h-40 gap-2">
                      {timeline
                        .filter((t) => t.monthly_salary != null)
                        .map((t) => {
                          const maxSal = Math.max(
                            ...timeline.filter((x) => x.monthly_salary != null).map((x) => x.monthly_salary!)
                          );
                          const height = maxSal > 0 ? (t.monthly_salary! / maxSal) * 100 : 0;
                          return (
                            <div key={t.interval} className="flex flex-col items-center flex-1 gap-2">
                              <span className="text-xs font-medium text-slate-600">
                                {"\u20B9"}{t.monthly_salary!.toLocaleString()}
                              </span>
                              <div
                                className="w-full rounded-t overflow-hidden"
                                style={{ height: `${Math.max(height * 1.2, 8)}px` }}
                              >
                                <div
                                  className="w-full bg-gradient-to-t from-brand-600 to-indigo-500 rounded-t"
                                  style={{ height: "100%", opacity: 0.9 }}
                                />
                              </div>
                              <span className="text-xs text-slate-400 text-center">{t.interval}</span>
                            </div>
                          );
                        })}
                    </div>
                    <p className="text-xs text-slate-400 mt-4">
                      Monthly salary progression from outcome surveys
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
