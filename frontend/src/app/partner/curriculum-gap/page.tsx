"use client";

import Link from "next/link";

interface SkillFit {
  skill: string;
  taught: number;
  marketDemand: number;
}

const skills: SkillFit[] = [
  { skill: "Python", taught: 90, marketDemand: 92 },
  { skill: "SQL", taught: 85, marketDemand: 88 },
  { skill: "Data Analysis", taught: 78, marketDemand: 84 },
  { skill: "AWS", taught: 55, marketDemand: 76 },
  { skill: "Docker", taught: 40, marketDemand: 71 },
  { skill: "Kubernetes", taught: 15, marketDemand: 68 },
  { skill: "TensorFlow", taught: 25, marketDemand: 62 },
];

export default function CurriculumGapPage() {
  const avgFit = Math.round(
    skills.reduce((sum, s) => sum + Math.min(s.taught / Math.max(s.marketDemand, 1), 1) * 100, 0) / skills.length
  );

  const trending = [
    { skill: "Generative AI", demand: "+312%", recommended: true },
    { skill: "MLOps", demand: "+198%", recommended: true },
    { skill: "Docker/K8s", demand: "+156%", recommended: false },
    { skill: "Edge Computing", demand: "+84%", recommended: false },
  ];

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-1">Curriculum-Market Fit</h1>
            <p className="text-slate-500">How your course curriculum aligns with current job market demand</p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${avgFit >= 80 ? "text-green-600" : avgFit >= 60 ? "text-amber-600" : "text-red-600"}`}>
              {avgFit}%
            </p>
            <p className="text-xs text-slate-400">Overall curriculum fit</p>
          </div>
        </div>

        {avgFit < 75 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-8 text-sm text-amber-800">
            <strong>Warning:</strong> Your curriculum is falling behind market demand. Consider adding skills below to improve placement outcomes.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-lg border bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50">
              <h3 className="font-semibold text-slate-800">Skill Coverage vs. Market Demand</h3>
            </div>
            <div className="p-6 space-y-5">
              {skills.map(({ skill, taught, marketDemand }) => {
                const fit = Math.min(taught / Math.max(marketDemand, 1), 1);
                const status = fit >= 0.9 ? "good" : fit >= 0.7 ? "ok" : "poor";
                return (
                  <div key={skill}>
                    <div className="flex justify-between mb-1.5">
                      <span className="font-medium text-slate-700 text-sm">{skill}</span>
                      <span className={`text-xs font-medium ${
                        status === "good" ? "text-green-600" : status === "ok" ? "text-amber-600" : "text-red-600"
                      }`}>
                        {status === "good" ? "Well Aligned" : status === "ok" ? "Partially Aligned" : "Gap Detected"}
                      </span>
                    </div>
                    <div className="flex gap-0.5 h-3 rounded overflow-hidden">
                      <div className="flex-1 bg-brand-100 rounded-l overflow-hidden">
                        <div className="h-full bg-brand-600 rounded-l" style={{ width: `${taught}%` }} />
                      </div>
                      <div className="flex-1 bg-emerald-100 rounded-r overflow-hidden relative">
                        <div className="h-full bg-emerald-500 rounded-r" style={{ width: `${marketDemand}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>Taught: {taught}% coverage</span>
                      <span>Market Demand: {marketDemand}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border bg-white shadow-sm p-6 h-fit">
            <h3 className="font-semibold text-slate-800 mb-4">Trending Skills to Add</h3>
            <div className="space-y-4">
              {trending.map((t) => (
                <div key={t.skill} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-700 text-sm">{t.skill}</p>
                    <p className="text-xs text-emerald-600">{t.demand} YoY demand growth</p>
                  </div>
                  {t.recommended && (
                    <span className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded-full">
                      Recommended
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-slate-400 mb-2">Updated weekly from live job market analysis</p>
              <button className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
                Review All Recommendations
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
