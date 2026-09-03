"use client";

import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import {
  Users, Building2, Briefcase, GraduationCap, TrendingUp, AlertTriangle, BarChart3, ShieldCheck,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import {
  useDashboardStats, useEnrollmentTrends, useTopSkills,
} from "@/lib/hooks/useDashboard";
import type { DashboardStats } from "@/lib/types";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";

type StatKey = keyof DashboardStats;

const BAR_COLORS = [
  "#4f46e5", "#7c3aed", "#2563eb", "#0ea5e9", "#10b981",
  "#f59e0b", "#f43f5e", "#ec4899", "#14b8a6", "#8b5cf6",
];

const kpiCards: { label: string; key: StatKey; icon: typeof Users; tint: string; text: string; suffix?: string }[] = [
  { label: "Total Candidates", key: "total_candidates", icon: Users, tint: "from-brand-500 to-indigo-500", text: "text-brand-600" },
  { label: "Training Partners", key: "total_training_partners", icon: Building2, tint: "from-emerald-500 to-teal-500", text: "text-emerald-600" },
  { label: "Active Employers", key: "total_employers", icon: Briefcase, tint: "from-violet-500 to-fuchsia-500", text: "text-violet-600" },
  { label: "Enrollments", key: "total_enrollments", icon: GraduationCap, tint: "from-orange-500 to-amber-500", text: "text-orange-600" },
  { label: "Placement Rate", key: "overall_placement_rate", icon: TrendingUp, tint: "from-sky-500 to-cyan-500", text: "text-sky-600", suffix: "%" },
  { label: "Active Schemes", key: "active_schemes", icon: AlertTriangle, tint: "from-rose-500 to-red-500", text: "text-rose-600" },
];

export default function GovDashboard() {
  useRequireAuth("gov_admin");
  const { data: stats, loading } = useDashboardStats();
  const { data: trends } = useEnrollmentTrends(6);
  const { data: topSkills } = useTopSkills(10);

  const chartTooltip = {
    contentStyle: {
      borderRadius: 12, border: "1px solid #e2e8f0", background: "rgba(255,255,255,0.9)",
      backdropFilter: "blur(8px)", fontSize: 12, boxShadow: "0 10px 30px rgba(15,23,42,0.1)",
    },
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Admin Console" subtitle="National outcome analytics" />
        <main className="space-y-6 p-6">
          {/* Admin welcome banner */}
          <div className="glass animate-fade-up overflow-hidden p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 via-brand-700 to-brand-500 shadow-lg shadow-brand-700/30">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-slate-900">
                      {loading ? "National Overview" : "Welcome back, Administrator"}
                    </h2>
                    <span className="chip bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm">
                      Admin
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    Live snapshot of learning, placement, and labor intelligence across schemes.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="chip bg-emerald-100 text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live data
                </span>
              </div>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 animate-fade-up">
            {kpiCards.map(({ label, key, icon: Icon, tint, text, suffix }, i) => (
              <div key={label} className="glass p-5 transition-transform duration-300 hover:-translate-y-1 animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tint} shadow-md`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {loading ? <span className="text-slate-300">…</span> : `${(stats?.[key] ?? 0).toLocaleString()}${suffix ?? ""}`}
                </p>
                <p className={`text-sm ${text} font-medium`}>{label}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-fade-up delay-100">
            <div className="glass p-6">
              <h3 className="panel-title mb-4">
                <TrendingUp className="h-4 w-4 text-brand-600" />
                Enrollment & Completion Trends
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends?.months ?? []}>
                    <defs>
                      <linearGradient id="enroll" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="comp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip {...chartTooltip} />
                    <Line type="monotone" dataKey="enrollments" name="Enrollments" stroke="#4f46e5" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="completions" name="Completions" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass p-6">
              <h3 className="panel-title mb-4">
                <TrendingUp className="h-4 w-4 text-violet-600" />
                Top In-Demand Skills
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSkills?.skills ?? []} layout="vertical" margin={{ left: 8 }}>
                    <defs>
                      <linearGradient id="demand" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#4f46e5" />
                        <stop offset="100%" stopColor="#7c3aed" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="skill" width={110} tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} />
                    <Tooltip {...chartTooltip} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
                    <Bar dataKey="demand" name="Demand Weight" fill="url(#demand)" radius={[0, 6, 6, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-fade-up delay-200">
            <div className="glass p-6">
              <h3 className="panel-title mb-4">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                Top Skill Deficits
              </h3>
              <div className="space-y-4">
                {[
                  { skill: "Python", gap: 82, region: "Maharashtra" },
                  { skill: "React.js", gap: 74, region: "Karnataka" },
                  { skill: "Data Analysis", gap: 71, region: "Tamil Nadu" },
                  { skill: "Cloud Computing", gap: 68, region: "Telangana" },
                  { skill: "Digital Marketing", gap: 65, region: "Gujarat" },
                ].map(({ skill, gap, region }, i) => (
                  <div key={skill} className="flex items-center gap-4 animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
                    <div className="flex-1">
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-semibold text-slate-700">{skill}</span>
                        <span className="font-semibold text-rose-500">{gap}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 transition-all duration-700"
                          style={{ width: `${gap}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{region}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass p-6">
              <h3 className="panel-title mb-4">
                <BarChart3 className="h-4 w-4 text-amber-500" />
                Scheme Performance
              </h3>
              <div className="space-y-3">
                {[
                  { scheme: "PMKVY 4.0", placed: 8234, rate: "71%", status: "active" },
                  { scheme: "DDU-GKY", placed: 5120, rate: "58%", status: "active" },
                  { scheme: "NRLM", placed: 3890, rate: "45%", status: "underperforming" },
                  { scheme: "PM-KVK", placed: 2100, rate: "82%", status: "active" },
                ].map(({ scheme, placed, rate, status }, i) => (
                  <div key={scheme} className="glass-inner flex items-center justify-between p-3 transition hover:bg-white animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
                    <div>
                      <p className="font-semibold text-slate-700">{scheme}</p>
                      <p className="text-xs text-slate-400">{placed.toLocaleString()} placed</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">{rate}</p>
                      <span
                        className={`chip ${
                          status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}