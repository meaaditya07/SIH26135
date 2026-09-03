"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import type { PortalInfo } from "@/lib/types";
import { ClipboardCheck, CheckCircle2 } from "lucide-react";

interface Props {
  params: { id: string };
}

export default function SurveyPortalPage({ params }: Props) {
  const { id } = params;

  const [info, setInfo] = useState<PortalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [isEmployed, setIsEmployed] = useState<boolean | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [salary, setSalary] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [relevant, setRelevant] = useState<boolean | null>(null);

  useEffect(() => {
    api
      .get(`/surveys/portal/${id}`)
      .then((res) => {
        setInfo(res.data);
        if (res.data.status === "responded") {
          setDone(true);
        }
      })
      .catch(() => setError("Survey not found or link is invalid."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEmployed === null) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/surveys/portal/${id}/respond`, {
        is_employed: isEmployed,
        current_job_title: jobTitle || null,
        monthly_salary: salary ? Number(salary) : null,
        job_location: jobLocation || null,
        is_job_relevant_to_training: relevant,
        skills_used: [],
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="glass skeleton h-24 w-64" />
      </main>
    );
  }

  if (error && !info) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="glass max-w-md w-full p-8 text-center animate-fade-up">
          <p className="text-slate-700 mb-4">{error}</p>
          <Link href="/" className="text-brand-600 text-sm font-medium">Go to Home</Link>
        </div>
      </main>
    );
  }

  const intervalLabel =
    info?.scheduled_interval?.replace("_", " ") || "Follow-up";
  const displayName = info?.candidate_name?.split(" ")[0] || "there";

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold gradient-text">SkillTrace AI</h1>
          <p className="text-slate-500 text-sm">Employment Outcome Survey</p>
        </div>

        <div className="glass-strong p-8 animate-fade-up">
          {done ? (
            <div className="text-center py-8">
              <div className="flex h-14 w-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white items-center justify-center mx-auto mb-4 shadow-lg">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                {info?.status === "responded" ? "Already recorded" : "Thank you!"}
              </h2>
              <p className="text-slate-500">
                {info?.status === "responded"
                  ? "Your response for this survey has already been recorded."
                  : `Your response for the ${intervalLabel} follow-up has been saved.`}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="text-slate-700 mb-6">
                Hi {displayName}, it&apos;s been about <strong>{intervalLabel}</strong> since
                your training. Please help us understand how it went — your answers help improve
                future programs.
              </p>

              <fieldset className="mb-6">
                <legend className="block text-sm font-medium text-slate-700 mb-2">
                  Are you currently employed?
                </legend>
                <div className="flex gap-4">
                  {[
                    { label: "Yes", value: true },
                    { label: "No", value: false },
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setIsEmployed(opt.value)}
                      className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                        isEmployed === opt.value
                          ? "border-brand-500 bg-brand-50/80 text-brand-700 shadow-md shadow-brand-500/10"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="input-glass"
                    placeholder="e.g. Junior Electrician"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Monthly Salary (₹)
                  </label>
                  <input
                    type="number"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="input-glass"
                    placeholder="e.g. 18000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Job Location
                  </label>
                  <input
                    type="text"
                    value={jobLocation}
                    onChange={(e) => setJobLocation(e.target.value)}
                    className="input-glass"
                    placeholder="City / District"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Is your job related to your training?
                  </label>
                  <div className="flex gap-4">
                    {[
                      { label: "Yes", value: true },
                      { label: "No", value: false },
                      { label: "Not sure", value: null as any },
                    ].map((opt) => (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => setRelevant(opt.value as boolean | null)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                          relevant === opt.value
                            ? "border-brand-500 bg-brand-50/80 text-brand-700 shadow-md shadow-brand-500/10"
                            : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <p className="mt-4 text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={isEmployed === null || submitting}
                className="mt-6 btn-glass w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ClipboardCheck className="h-4 w-4" />
                {submitting ? "Submitting…" : "Submit Response"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Your responses are kept confidential and encrypted.
        </p>
      </div>
    </main>
  );
}
