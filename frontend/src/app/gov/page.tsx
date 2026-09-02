"use client";

import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import {
  Users, Building2, Briefcase, GraduationCap, TrendingUp, AlertTriangle,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import {
  useDashboardStats, useEnrollmentTrends, useTopSkills,
} from "@/lib/hooks/useDashboard";

const BAR_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#14b8a6",
];

export default function GovDashboard() {
  const { data: stats, loading } = useDashboardStats();
  const { data: trends } = useEnrollmentTrends(6);
  const { data: topSkills } = useTopSkills(10);

  const kpis = [
    { label: "Total Candidates", value: stats?.total_candidates ?? 0, suffix: "", icon: Users, color: "text-blue-600" },
    { label: "Training Partners", value: stats?.total_training_partners ?? 0, suffix: "", icon: Building2, color: "text-emerald-600" },
    { label: "Active Employers", value: stats?.total_employers ?? 0, suffix: "", icon: Briefcase, color: "text-purple-600" },
    { label: "Enrollments", value: stats?.total_enrollments ?? 0, suffix: "", icon: GraduationCap, color: "text-orange-600" },
    {
      label: "Placement Rate",
      value: stats?.overall_placement_rate ?? 0,
      suffix: "%",
      icon: TrendingUp,
      color: "text-green-600",
    },
    { label: "Active Schemes", value: stats?.active_schemes ?? 0, suffix: "", icon: AlertTriangle, color: "text-red-600" },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Government Dashboard" />
        <main className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {kpis.map(({ label, value, suffix, icon: Icon, color }) => (
              <div key={label} className="rounded-lg border bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {loading ? "…" : `${value.toLocaleString()}${suffix}`}
                </p>
                <p className="text-sm text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4">Enrollment & Completion Trends</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends?.months ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="enrollments" name="Enrollments" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="completions" name="Completions" stroke="#22c55e" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4">Top In-Demand Skills</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSkills?.skills ?? []} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="skill"
                      width={110}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar dataKey="demand" name="Demand Weight" radius={[0, 4, 4, 0]}>
                      {(topSkills?.skills ?? []).map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4">Top Skill Deficits</h3>
              <div className="space-y-3">
                {[
                  { skill: "Python", gap: 82, region: "Maharashtra" },
                  { skill: "React.js", gap: 74, region: "Karnataka" },
                  { skill: "Data Analysis", gap: 71, region: "Tamil Nadu" },
                  { skill: "Cloud Computing", gap: 68, region: "Telangana" },
                  { skill: "Digital Marketing", gap: 65, region: "Gujarat" },
                ].map(({ skill, gap, region }) => (
                  <div key={skill} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{skill}</span>
                        <span className="text-red-600">{gap}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full">
                        <div className="h-2 bg-red-500 rounded-full" style={{ width: `${gap}%` }} />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{region}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4">Scheme Performance</h3>
              <div className="space-y-3">
                {[
                  { scheme: "PMKVY 4.0", placed: 8234, rate: "71%", status: "active" },
                  { scheme: "DDU-GKY", placed: 5120, rate: "58%", status: "active" },
                  { scheme: "NRLM", placed: 3890, rate: "45%", status: "underperforming" },
                  { scheme: "PM-KVK", placed: 2100, rate: "82%", status: "active" },
                ].map(({ scheme, placed, rate, status }) => (
                  <div key={scheme} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-700">{scheme}</p>
                      <p className="text-xs text-slate-500">{placed.toLocaleString()} placed</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-800">{rate}</p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          status === "active"
                            ? "bg-green-100 text-green-700"
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
