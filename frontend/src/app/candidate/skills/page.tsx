"use client";

import Link from "next/link";

const skills = [
  { name: "Python", level: 78, demand: 92, gap: 14 },
  { name: "Data Analysis", level: 62, demand: 84, gap: 22 },
  { name: "React.js", level: 55, demand: 76, gap: 21 },
  { name: "SQL", level: 70, demand: 88, gap: 18 },
  { name: "Machine Learning", level: 45, demand: 71, gap: 26 },
  { name: "Communication", level: 85, demand: 90, gap: 5 },
];

export default function SkillsPage() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/candidate" className="hover:text-brand-600">← Back to Dashboard</Link>
        </nav>

        <h1 className="text-3xl font-bold text-slate-800 mb-2">My Skills & Market Gap</h1>
        <p className="text-slate-500 mb-8">How your skills compare to current job market demand</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <p className="text-2xl font-bold text-slate-800">8</p>
            <p className="text-sm text-slate-500">Skills in Profile</p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <p className="text-2xl font-bold text-red-600">5</p>
            <p className="text-sm text-slate-500">Skills to Improve</p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <p className="text-2xl font-bold text-emerald-600">71%</p>
            <p className="text-sm text-slate-500">Overall Market Fit</p>
          </div>
        </div>

        <div className="rounded-lg border bg-white shadow-sm overflow-hidden mb-8">
          <div className="p-4 border-b bg-slate-50">
            <h3 className="font-semibold text-slate-800">Skill Gap Analysis</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {skills.map(({ name, level, demand, gap }) => (
              <div key={name} className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-slate-700">{name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${gap > 15 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    Gap: {gap}%
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Your Level</span>
                      <span>{level}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div className="h-2 bg-brand-600 rounded-full" style={{ width: `${level}%` }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Market Demand</span>
                      <span>{demand}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div className="h-2 bg-emerald-500 rounded-full" style={{ width: `${demand}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
