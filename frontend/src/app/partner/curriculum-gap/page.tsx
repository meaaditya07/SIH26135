"use client";

import { useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import { useTopSkills, useCourses } from "@/lib/hooks/useDashboard";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import { TrendingUp, Lightbulb, BarChart3, Target, X } from "lucide-react";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton animate-pulse rounded-lg ${className ?? ""}`} />;
}

export default function CurriculumGapPage() {
  useRequireAuth("training_partner");

  const { data: topSkillsData, loading: skillsLoading } = useTopSkills(15);
  const { data: courses, loading: coursesLoading } = useCourses(100, 0);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loading = skillsLoading || coursesLoading;

  const allTaughtSkills = useMemo(() => {
    const skillCounts: Record<string, number> = {};
    for (const c of courses) {
      for (const s of c.skills_taught) {
        const key = s.trim().toLowerCase();
        if (key) skillCounts[key] = (skillCounts[key] || 0) + 1;
      }
    }
    return skillCounts;
  }, [courses]);

  const totalCourses = courses.length || 1;

  const skillFit = useMemo(() => {
    const skills = topSkillsData?.skills ?? [];
    if (skills.length === 0) return [];

    const maxDemand = Math.max(...skills.map((s) => s.demand), 1);

    return skills.map((s) => {
      const skillKey = s.skill.trim().toLowerCase();
      const taughtCount = allTaughtSkills[skillKey] ?? 0;
      const taughtPct = Math.min(Math.round((taughtCount / totalCourses) * 100), 100);
      const marketDemand = Math.round((s.demand / maxDemand) * 100);
      return {
        skill: s.skill,
        taught: taughtPct,
        marketDemand,
      };
    });
  }, [topSkillsData, allTaughtSkills, totalCourses]);

  const avgFit = useMemo(() => {
    if (skillFit.length === 0) return 0;
    return Math.round(
      skillFit.reduce(
        (sum, s) => sum + Math.min(s.taught / Math.max(s.marketDemand, 1), 1) * 100,
        0
      ) / skillFit.length
    );
  }, [skillFit]);

  const recommended = useMemo(() => {
    return skillFit
      .filter((s) => s.marketDemand >= 50 && s.taught < 40)
      .sort((a, b) => b.marketDemand - a.marketDemand)
      .slice(0, 8);
  }, [skillFit]);

  const isLoading = loading;
  const isEmpty = !loading && skillFit.length === 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Curriculum Gap" subtitle="How your curriculum aligns with market demand" />
        <main className="space-y-6 p-6">
          {toast && (
            <div className="animate-fade-in">
              <Toast message={toast} tone="info" />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-up">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Curriculum-Market Fit</h1>
              <p className="text-sm text-slate-500">
                {isLoading
                  ? "Loading market data..."
                  : `${skillFit.length} skills analyzed across ${courses.length} courses`}
              </p>
            </div>
            <div className="glass p-5 text-right">
              {isLoading ? (
                <SkeletonBlock className="h-12 w-24 ml-auto" />
              ) : (
                <>
                  <p
                    className={`text-3xl font-bold ${
                      avgFit >= 80
                        ? "text-emerald-600"
                        : avgFit >= 60
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {avgFit}%
                  </p>
                  <p className="text-xs text-slate-400">Overall curriculum fit</p>
                </>
              )}
            </div>
          </div>

          {!isLoading && avgFit < 75 && avgFit > 0 && (
            <div className="glass border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800 animate-fade-up">
              <strong>Warning:</strong> Your curriculum is falling behind market demand. Consider adding
              skills below to improve placement outcomes.
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass p-6 space-y-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i}>
                    <SkeletonBlock className="h-4 w-32 mb-2" />
                    <SkeletonBlock className="h-3 w-full" />
                  </div>
                ))}
              </div>
              <div className="glass p-6 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonBlock key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          ) : isEmpty ? (
            <div className="glass p-16 text-center animate-fade-up">
              <Target className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h2 className="text-xl font-bold text-slate-700 mb-2">No Market Data Available</h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Market skill demand data is not yet available. Curriculum gap analysis will appear once
                job postings and skill demand metrics are populated.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass p-6 overflow-hidden animate-fade-up delay-100">
                <h3 className="panel-title mb-4">
                  <BarChart3 className="h-5 w-5 text-brand-600" /> Skill Coverage vs. Market Demand
                </h3>
                <div className="space-y-5">
                  {skillFit.map(({ skill, taught, marketDemand }) => {
                    const fit = Math.min(taught / Math.max(marketDemand, 1), 1);
                    const status = fit >= 0.9 ? "good" : fit >= 0.7 ? "ok" : "poor";
                    return (
                      <div key={skill}>
                        <div className="flex justify-between mb-1.5">
                          <span className="font-medium text-slate-700 text-sm">{skill}</span>
                          <span
                            className={`text-xs font-medium ${
                              status === "good"
                                ? "text-emerald-600"
                                : status === "ok"
                                ? "text-amber-600"
                                : "text-red-600"
                            }`}
                          >
                            {status === "good"
                              ? "Well Aligned"
                              : status === "ok"
                              ? "Partially Aligned"
                              : "Gap Detected"}
                          </span>
                        </div>
                        <div className="flex gap-0.5 h-3 rounded overflow-hidden">
                          <div className="flex-1 bg-brand-100 rounded-l overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-l"
                              style={{ width: `${taught}%` }}
                            />
                          </div>
                          <div className="flex-1 bg-emerald-100 rounded-r overflow-hidden relative">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-r"
                              style={{ width: `${marketDemand}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                          <span>Your coverage: {taught}%</span>
                          <span>Market demand: {marketDemand}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass p-6 h-fit animate-fade-up delay-200">
                <h3 className="panel-title mb-4">
                  <TrendingUp className="h-5 w-5 text-brand-600" /> Skills to Add
                </h3>
                {recommended.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">
                    <Lightbulb className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    <p>Your curriculum covers all high-demand skills well.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recommended.map((r) => (
                      <div key={r.skill} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-700 text-sm">{r.skill}</p>
                          <p className="text-xs text-slate-400">
                            Demand: {r.marketDemand}% &middot; Your coverage: {r.taught}%
                          </p>
                        </div>
                        <span className="chip bg-brand-50 text-brand-700">
                          <Lightbulb className="h-3 w-3" /> Gap
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-3">
                    Derived from live job market demand + course curriculum
                  </p>
                  <button
                    onClick={() => setModalOpen(true)}
                    className="btn-glass w-full"
                  >
                    Review All Recommendations
                  </button>
                </div>
              </div>
            </div>
          )}

          <Modal
            open={modalOpen}
            title="Curriculum Recommendations"
            subtitle={`${recommended.length} skill gap${recommended.length !== 1 ? "s" : ""} identified`}
            onClose={() => setModalOpen(false)}
            size="lg"
            footer={
              <button onClick={() => setModalOpen(false)} className="btn-ghost text-sm">
                Close
              </button>
            }
          >
            {recommended.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                <p>No significant skill gaps detected. Your curriculum is well-aligned with market demand.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommended.map((r) => {
                  const gap = r.marketDemand - r.taught;
                  return (
                    <div
                      key={r.skill}
                      className="glass-inner flex items-center gap-4 p-4 rounded-xl"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-md">
                        <Lightbulb className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800">{r.skill}</p>
                          <span className="chip bg-red-100 text-red-600 text-[10px]">
                            Gap: {gap}%
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-4 text-xs text-slate-500">
                          <span>Market demand: {r.marketDemand}%</span>
                          <span>Your coverage: {r.taught}%</span>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className="flex h-full">
                            <div
                              className="bg-gradient-to-r from-brand-500 to-indigo-500 rounded-l-full"
                              style={{ width: `${r.taught}%` }}
                            />
                            <div
                              className="bg-gradient-to-r from-emerald-500 to-teal-500"
                              style={{ width: `${Math.max(r.marketDemand - r.taught, 0)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Modal>
        </main>
      </div>
    </div>
  );
}
