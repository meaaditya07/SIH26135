"use client";

import { useState, useMemo, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import {
  useMyApplications,
  useJobPostings,
  useCandidateMe,
} from "@/lib/hooks/useDashboard";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import { formatINR, formatISODate, formatISODateTime } from "@/lib/utils";
import { FileText, Inbox, ExternalLink, ChevronDown, Sparkles, Check, CalendarDays, ClipboardCheck } from "lucide-react";
import type { JobPostingListItem, JobApplication } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  applied: "bg-slate-100 text-slate-600",
  shortlisted: "bg-blue-100 text-blue-700",
  interview: "bg-amber-100 text-amber-700",
  offered: "bg-purple-100 text-purple-700",
  hired: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const SKILL_TIPS: Record<string, string[]> = {
  python: [
    "Be ready to explain loops, comprehensions and the GIL.",
    "Brush up on the Python libraries you listed on your resume.",
    "Prepare to write a small function that processes data from memory.",
  ],
  react: [
    "Expect hooks + state management questions.",
    "Be ready to explain when a component re-renders.",
    "Prepare a small props/state example you have actually built.",
  ],
  sql: [
    "Practice joins and window functions.",
    "Expect a question on indexes and slow queries.",
    "Be ready to write a GROUP BY / HAVING query by hand.",
  ],
  javascript: [
    "Review closures, async/await and the event loop.",
    "Expect questions on hoisting and the `this` keyword.",
    "Prepare a small DOM-manipulation or fetch example.",
  ],
  typescript: [
    "Review type narrowing, generics and utility types.",
    "Expect questions on `unknown` vs `any` and strict mode.",
    "Prepare to explain how you type API responses.",
  ],
  "node.js": [
    "Review the event loop, streams and middleware patterns.",
    "Expect a question on handling async errors.",
    "Prepare an example of a REST endpoint you built.",
  ],
  django: [
    "Review ORM queries, migrations and the admin panel.",
    "Expect questions about the MVT flow and authentication.",
    "Prepare to explain a model you designed.",
  ],
  flask: [
    "Review request/response flow, blueprints and decorators.",
    "Expect a small 'build an endpoint' exercise.",
    "Prepare to explain how you manage database sessions.",
  ],
  java: [
    "Review OOP principles, collections and streams.",
    "Expect questions on the JVM and garbage collection.",
    "Prepare to explain a design pattern you have used.",
  ],
  "c++": [
    "Review pointers, memory layout and the STL.",
    "Expect questions on move semantics and RAII.",
    "Prepare a small data-structure implementation.",
  ],
  git: [
    "Review rebase vs merge and resolving conflicts.",
    "Expect a question on how you structure commits.",
    "Be ready to describe a time you fixed a messy history.",
  ],
  docker: [
    "Review image layers, Dockerfiles and volumes.",
    "Expect a question on container vs VM.",
    "Prepare to explain how you run your project in Docker.",
  ],
  aws: [
    "Review core services (EC2, S3, Lambda) and IAM basics.",
    "Expect a question on cost and security good practice.",
    "Prepare an architecture example you have worked with.",
  ],
  mongodb: [
    "Review document modeling and aggregation pipelines.",
    "Expect a question on indexing and $lookup joins.",
    "Prepare to explain when a document DB beats SQL.",
  ],
  postgresql: [
    "Review transactions, constraints and EXPLAIN plans.",
    "Expect questions on JSONB and full-text search.",
    "Prepare to sketch a small normalized schema.",
  ],
  excel: [
    "Review XLOOKUP/VLOOKUP, pivot tables and formulas.",
    "Expect a number-crunching or data-cleaning exercise.",
    "Prepare a dashboard example you have built.",
  ],
  communication: [
    "Prepare 2-3 stories of handling conflict or stakeholders.",
    "Expect a situation-based question from your resume.",
    "Be ready to explain a technical idea to a non-technical person.",
  ],
};

function hasSkill(have: string[], skill: string): boolean {
  const s = skill.toLowerCase();
  return have.some((h) => {
    const own = h.toLowerCase();
    return own.includes(s) || s.includes(own);
  });
}

function skillTips(skill: string): string[] {
  const s = skill.toLowerCase();
  const match = Object.keys(SKILL_TIPS).find(
    (k) => s.includes(k) || k.includes(s)
  );
  if (match) return SKILL_TIPS[match];
  return [
    `Prepare examples of real projects where you used ${skill}.`,
    "Be ready to explain why this skill matters for the role.",
    "Name one recent thing you learned in this area.",
  ];
}

function daysUntil(iso: string): number | null {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.ceil((ms - Date.now()) / 86_400_000);
}

interface InterviewPrepCardProps {
  job?: JobPostingListItem;
  status: JobApplication["status"];
  matchScore: number | null;
  candidateSkills: string[];
  open: boolean;
  onToggle: () => void;
}

function InterviewPrepCard({
  job,
  status,
  matchScore,
  candidateSkills,
  open,
  onToggle,
}: InterviewPrepCardProps) {
  const requiredSkills = job?.required_skills ?? [];
  const preferredSkills = job?.preferred_skills ?? [];
  const firstRequired = requiredSkills[0];

  const checklist =
    requiredSkills.length > 0
      ? [
          `Estimate your match (${matchScore != null ? `${matchScore}%` : "?"}%)`,
          `Refresh ${firstRequired!} fundamentals`,
          "Prepare projects you've built",
        ]
      : [
          `Estimate your match (${matchScore != null ? `${matchScore}%` : "?"}%)`,
          "Refresh the core skills listed in the job description",
          "Prepare projects you've built",
        ];

  const [checked, setChecked] = useState<boolean[]>(
    () => checklist.map(() => false)
  );

  return (
    <div className="glass-inner mt-3 overflow-hidden animate-fade-up">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.06]"
      >
        <span className="panel-title">
          <Sparkles className="h-4 w-4 text-violet-400" />
          Prepare for interview
          {status === "offered" && (
            <span className="chip bg-emerald-100/90 text-emerald-700">
              Offered
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-white/10 px-4 py-4">
          {!job && (
            <p className="text-xs text-slate-500">
              Detailed skill list for this role is unavailable — prepare from
              the description you applied to.
            </p>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Focus areas
            </p>
            {requiredSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {requiredSkills.map((skill) => {
                  const known = hasSkill(candidateSkills, skill);
                  return (
                    <span
                      key={skill}
                      className={`chip ${
                        known
                          ? "bg-emerald-100/90 text-emerald-700"
                          : "bg-violet-100/90 text-violet-700"
                      }`}
                      title={known ? "Already on your profile" : "Not on your profile yet"}
                    >
                      {skill}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No required skills listed.</p>
            )}
          </div>

          {requiredSkills.length > 0 && (
            <div className="space-y-2">
              {requiredSkills.map((skill) => (
                <div key={skill}>
                  <p className="text-sm font-semibold text-slate-200">{skill}</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-400">
                    {skillTips(skill).slice(0, 3).map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {preferredSkills.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Nice to have
              </p>
              <div className="flex flex-wrap gap-2">
                {preferredSkills.map((skill) => (
                  <span key={skill} className="chip bg-slate-100 text-slate-600">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="glass-inner p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Today&rsquo;s prep checklist
            </p>
            <ul className="space-y-1.5">
              {checklist.map((item, i) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() =>
                      setChecked((prev) =>
                        prev.map((c, idx) => (idx === i ? !c : c))
                      )
                    }
                    className="flex w-full items-center gap-2.5 text-left text-sm text-slate-200 transition hover:text-white"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition ${
                        checked[i]
                          ? "border-violet-400 bg-violet-500 text-white"
                          : "border-white/20 bg-white/[0.04]"
                      }`}
                    >
                      {checked[i] && <Check className="h-3 w-3" />}
                    </span>
                    <span className={checked[i] ? "text-slate-500 line-through" : ""}>
                      {item}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Post-hire onboarding checklist (progress persisted per application) ── */

const ONBOARDING_STEPS = [
  "Sign your employment agreement",
  "Submit PAN card & bank account details",
  "Complete joining formalities (photo ID + address proof)",
  "Get your laptop & official accounts set up",
  "Attend Day-1 orientation",
];

function OnboardingChecklist({ applicationId, jobTitle }: { applicationId: string; jobTitle?: string }) {
  const storageKey = `skilltrace:onboarding:${applicationId}`;
  const [done, setDone] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setDone(JSON.parse(raw) as string[]);
    } catch {
      /* ignore corrupted storage */
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(done));
    } catch {
      /* storage may be unavailable */
    }
  }, [done, loaded, storageKey]);

  const toggle = (step: string) =>
    setDone((prev) =>
      prev.includes(step) ? prev.filter((s) => s !== step) : [...prev, step]
    );

  const pct = Math.round((done.length / ONBOARDING_STEPS.length) * 100);

  return (
    <div className="relative mt-5 rounded-xl border border-emerald-300/30 bg-emerald-500/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
          <ClipboardCheck className="h-3.5 w-3.5" />
          Your onboarding checklist · {jobTitle ?? "New role"}
        </p>
        <span className="text-[10px] font-bold text-emerald-300">
          {done.length}/{ONBOARDING_STEPS.length} done
        </span>
      </div>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 space-y-1.5">
        {ONBOARDING_STEPS.map((step) => {
          const checked = done.includes(step);
          return (
            <button
              key={step}
              type="button"
              onClick={() => toggle(step)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-white/5"
            >
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition ${
                  checked
                    ? "border-emerald-400 bg-emerald-400 text-white"
                    : "border-white/20 bg-transparent"
                }`}
              >
                {checked && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className={checked ? "text-slate-400 line-through" : "text-slate-200"}>
                {step}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MyApplicationsPage() {
  useRequireAuth("candidate");

  const [status, setStatus] = useState("");
  const { data: apps, loading } = useMyApplications(status || undefined);
  const { data: jobs, loading: jobsLoading } = useJobPostings(100);
  const { data: candidateMe } = useCandidateMe();

  const [prepOpen, setPrepOpen] = useState<Record<string, boolean>>({});

  const jobMap = useMemo(() => {
    const m = new Map<string, JobPostingListItem>();
    for (const j of jobs) m.set(j.id, j);
    return m;
  }, [jobs]);

  const candidateSkills = candidateMe?.skill_tags ?? [];

  const isPrepStage = (s: JobApplication["status"]) =>
    s === "interview" || s === "offered";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="My Applications" subtitle="Track the status of jobs you have applied to" />
        <main className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6 animate-fade-up">
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-1">My Applications</h1>
                <p className="text-slate-500">Track the status of jobs you have applied to</p>
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input-glass w-auto"
              >
                <option value="">All statuses</option>
                <option value="applied">Applied</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interview">Interview</option>
                <option value="offered">Offered</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {loading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass skeleton h-28" />
                ))}
              </div>
            )}

            {!loading && apps.length === 0 && (
              <div className="glass p-12 flex flex-col items-center text-center animate-fade-up">
                <Inbox className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">No applications yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  Browse your matching jobs and apply to get started.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {apps.map((a, i) => {
                const job = jobMap.get(a.job_posting_id);
                const showPrep = isPrepStage(a.status);
                const expanded = !!prepOpen[a.id];
                const hasOffer = a.offer_start_date || a.offer_salary != null;
                const showHiredBanner = a.status === "hired" && hasOffer;
                return (
                  <div
                    key={a.id}
                    className="glass card-hover p-6 animate-fade-up"
                    style={{ animationDelay: `${0.05 * (i + 1)}s` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 shadow-md">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {job?.title ?? "Job Posting"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Applied {a.applied_at ? new Date(a.applied_at).toLocaleDateString() : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`chip capitalize ${STATUS_STYLES[a.status] ?? STATUS_STYLES.applied}`}>
                          {a.status}
                        </span>
                        {a.match_score != null && (
                          <p className="text-xs text-slate-400 mt-1">
                            {a.match_score}% match
                          </p>
                        )}
                      </div>
                    </div>

                    {a.status === "interview" && a.interview_at && (
                      <div className="mt-4 pl-[52px] animate-fade-up">
                        <div className="relative overflow-hidden rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/20 via-slate-900/70 to-indigo-600/20 px-5 py-5">
                          <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-violet-500/20 blur-2xl" />
                          <div className="pointer-events-none absolute -bottom-12 -left-4 h-32 w-32 rounded-full bg-indigo-500/20 blur-2xl" />
                          <div className="relative flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600 shadow-lg shadow-violet-500/30">
                                <CalendarDays className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h2 className="text-lg font-extrabold text-white">
                                  Interview scheduled
                                </h2>
                                <p className="mt-0.5 text-xl font-bold text-violet-300">
                                  {formatISODateTime(a.interview_at)}
                                </p>
                              </div>
                            </div>
                            {(() => {
                              const days = daysUntil(a.interview_at);
                              if (days == null) return null;
                              const label =
                                days < 0
                                  ? "Interview passed"
                                  : days === 0
                                  ? "Today"
                                  : days === 1
                                  ? "1 day away"
                                  : `${days} days away`;
                              return (
                                <span
                                  className={`chip shrink-0 ${
                                    days < 0
                                      ? "bg-slate-100 text-slate-500"
                                      : "bg-violet-100/90 text-violet-700"
                                  }`}
                                >
                                  {label}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="relative mt-3 rounded-xl border-l-4 border-violet-400 bg-violet-500/10 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-300">
                              Interview note
                            </p>
                            <p className="mt-1 text-sm text-slate-200">
                              {a.interview_note
                                ? a.interview_note
                                : "Details will be shared by the employer."}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {a.cover_note && (
                      <p className="mt-3 text-sm text-slate-500 line-clamp-2 pl-[52px]">
                        &ldquo;{a.cover_note}&rdquo;
                      </p>
                    )}

                    {a.feedback && !showHiredBanner && (
                      <blockquote
                        className={`mt-3 pl-[52px] ${a.status === "rejected" || a.status === "offered" ? "" : "opacity-70"}`}
                      >
                        <div
                          className={`border-l-4 border-violet-500 bg-violet-50/70 px-4 py-3 rounded-r-xl ${
                            a.status === "rejected"
                              ? "border-red-400 bg-red-50/70"
                              : "border-violet-500 bg-violet-50/70"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
                              Employer feedback
                            </p>
                            <span className={`chip capitalize ${STATUS_STYLES[a.status] ?? STATUS_STYLES.applied}`}>
                              {a.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700">&ldquo;{a.feedback}&rdquo;</p>
                        </div>
                      </blockquote>
                    )}

                    {showHiredBanner && (
                      <div className="mt-4 pl-[52px] animate-fade-up">
                        <div className="relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 via-slate-900/70 to-violet-600/20 px-5 py-5">
                          <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
                          <div className="pointer-events-none absolute -bottom-12 -left-4 h-32 w-32 rounded-full bg-violet-500/20 blur-2xl" />
                          <div className="relative flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
                              <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h2 className="text-lg font-extrabold text-white">
                                Congratulations — you&rsquo;re hired!
                              </h2>
                              <p className="text-sm text-emerald-200/90">
                                {job?.title ?? "The position"} has offered you the role. Here are the details.
                              </p>
                            </div>
                          </div>
                          <div className="relative mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Offer start date
                              </p>
                              <p className="mt-0.5 text-sm font-semibold text-white">
                                {a.offer_start_date ? formatISODate(a.offer_start_date) : "To be confirmed"}
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Annual salary
                              </p>
                              <p className="mt-0.5 text-sm font-semibold text-emerald-300">
                                {a.offer_salary != null ? `₹${formatINR(a.offer_salary)}` : "To be confirmed"}
                              </p>
                            </div>
                          </div>
                          {a.feedback && (
                            <div className="relative mt-3 rounded-xl border-l-4 border-emerald-400 bg-emerald-500/10 px-4 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                                Employer feedback
                              </p>
                              <p className="mt-1 text-sm text-slate-200">&ldquo;{a.feedback}&rdquo;</p>
                            </div>
                          )}
                          <OnboardingChecklist applicationId={a.id} jobTitle={job?.title} />
                        </div>
                      </div>
                    )}

                    <div className="mt-3 pl-[52px]">
                      <Link
                        href="/candidate/matches"
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        View job <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>

                    {showPrep &&
                      (jobsLoading ? (
                        <div className="glass-inner skeleton mt-3 h-14 pl-[52px]" />
                      ) : (
                        <div className="pl-[52px]">
                          <InterviewPrepCard
                            job={job}
                            status={a.status}
                            matchScore={a.match_score}
                            candidateSkills={candidateSkills}
                            open={expanded}
                            onToggle={() =>
                              setPrepOpen((prev) => ({
                                ...prev,
                                [a.id]: !prev[a.id],
                              }))
                            }
                          />
                        </div>
                      ))}
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