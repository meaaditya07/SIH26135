"use client";

import Link from "next/link";
import { BarChart3, TrendingUp, AlertTriangle, Target } from "lucide-react";

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
          <div className="glass p-5 hover:-translate-y-1 transition-transform animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 shadow-md">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">8</p>
                <p className="text-xs text-slate-500">Skills in Profile</p>
              </div>
            </div>
          </div>
          <div className="glass p-5 hover:-translate-y-1 transition-transform animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-500 shadow-md">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-rose-600">5</p>
                <p className="text-xs text-slate-500">Skills to Improve</p>
              </div>
            </div>
          </div>
          <div className="glass p-5 hover:-translate-y-1 transition-transform animate-fade-up" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-md">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">71%</p>
                <p className="text-xs text-slate-500">Overall Market Fit</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass p-6 overflow-hidden animate-fade-up delay-200">
          <h3 className="panel-title mb-4"><TrendingUp className="h-5 w-5 text-brand-600" /> Skill Gap Analysis</h3>
          <div className="divide-y divide-slate-100">
            {skills.map(({ name, level, demand, gap }) => (
              <div key={name} className="p-4 hover:bg-white/70 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-slate-700">{name}</span>
                  <span className={`chip ${gap > 15 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
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
                      <div className="h-2 bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full" style={{ width: `${level}%` }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Market Demand</span>
                      <span>{demand}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${demand}%` }} />
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
