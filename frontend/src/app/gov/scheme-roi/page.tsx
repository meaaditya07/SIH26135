"use client";

import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import { useSchemeROI } from "@/lib/hooks/useDashboard";
import type { SchemeAnalytics } from "@/lib/types";
import { BarChart3, ArrowLeft, TrendingUp, Users, CheckCircle, Target, AlertTriangle } from "lucide-react";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

function roiColor(score: number | null): string {
  const s = score ?? 0;
  if (s > 3) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (s >= 2) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-600 bg-red-50 border-red-200";
}

function alertChip(status: string): string {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "underperforming":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "alert":
      return "bg-red-100 text-red-700 border border-red-200";
    default:
      return "bg-slate-100 text-slate-600 border border-slate-200";
  }
}

function alertLabel(status: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "underperforming":
      return "Underperforming";
    case "alert":
      return "Alert";
    default:
      return status;
  }
}

function barColor(score: number | null): string {
  const s = score ?? 0;
  if (s > 3) return "#10b981";
  if (s >= 2) return "#f59e0b";
  return "#ef4444";
}

function StatItem({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{value}</span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="skeleton h-6 w-32 rounded" />
          <div className="skeleton h-4 w-20 rounded" />
        </div>
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton h-5 w-12 rounded" />
          </div>
        ))}
      </div>
      <div className="skeleton h-2 w-full rounded-full mt-4" />
    </div>
  );
}

function SkeletonPage() {
  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar title="Scheme ROI Analysis" subtitle="Loading analytics..." />
        <main className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass p-4 animate-pulse">
                <div className="skeleton h-4 w-24 rounded mb-2" />
                <div className="skeleton h-7 w-16 rounded mb-1" />
                <div className="skeleton h-3 w-20 rounded" />
              </div>
            ))}
          </div>
          <div className="skeleton h-64 w-full rounded-xl" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SchemeROIPage() {
  useRequireAuth("gov_admin");
  const { data: schemes, loading } = useSchemeROI();

  const sorted = useMemo(
    () => [...(schemes ?? [])].sort((a, b) => (b.roi_score ?? 0) - (a.roi_score ?? 0)),
    [schemes],
  );

  const totals = useMemo(() => {
    const list = schemes ?? [];
    const totalEnrolled = list.reduce((s, r) => s + r.total_enrolled, 0);
    const totalPlaced12m = list.reduce((s, r) => s + r.total_placed_12m, 0);
    const avgRoi =
      list.length > 0
        ? list.reduce((s, r) => s + (r.roi_score ?? 0), 0) / list.length
        : 0;
    const avgCompletion =
      list.length > 0
        ? list.reduce((s, r) => s + (r.completion_rate ?? 0), 0) / list.length
        : 0;
    return { totalEnrolled, totalPlaced12m, avgRoi, avgCompletion };
  }, [schemes]);

  const chartData = useMemo(
    () =>
      sorted.map((s) => ({
        name: s.scheme_id,
        roi: s.roi_score ?? 0,
        fill: barColor(s.roi_score),
      })),
    [sorted],
  );

  if (loading) return <SkeletonPage />;

  if (!schemes || schemes.length === 0) {
    return (
      <div className="flex min-h-screen bg-slate-50/50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopBar title="Scheme ROI Analysis" subtitle="Return on investment analytics for government schemes" />
          <main className="p-6 flex-1 flex items-center justify-center">
            <div className="glass p-12 text-center animate-fade-up max-w-md">
              <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="panel-title mb-2">No Data Available</h3>
              <p className="text-sm text-slate-500">
                Scheme ROI data has not been computed yet. Check back after analytics have been processed.
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar
          title="Scheme ROI Analysis"
          subtitle="Return on investment analytics for government skill development schemes"
        />
        <main className="p-6 space-y-6">
          <a
            href="/gov"
            className="btn-ghost text-sm inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </a>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
            <div className="glass p-4 card-hover">
              <div className="flex items-center gap-3 mb-1">
                <Users className="h-5 w-5 text-blue-500" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Enrolled</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 gradient-text">
                {totals.totalEnrolled.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Across {schemes.length} schemes</p>
            </div>
            <div className="glass p-4 card-hover">
              <div className="flex items-center gap-3 mb-1">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Placed (12m)</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 gradient-text">
                {totals.totalPlaced12m.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {totals.totalEnrolled > 0
                  ? `${((totals.totalPlaced12m / totals.totalEnrolled) * 100).toFixed(1)}% overall rate`
                  : "N/A"}
              </p>
            </div>
            <div className="glass p-4 card-hover">
              <div className="flex items-center gap-3 mb-1">
                <TrendingUp className="h-5 w-5 text-violet-500" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Average ROI</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 gradient-text">
                {totals.avgRoi.toFixed(2)}x
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {totals.avgRoi > 3 ? "Strong performance" : totals.avgRoi >= 2 ? "Moderate" : "Needs attention"}
              </p>
            </div>
            <div className="glass p-4 card-hover">
              <div className="flex items-center gap-3 mb-1">
                <Target className="h-5 w-5 text-amber-500" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Completion</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 gradient-text">
                {totals.avgCompletion.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Program completion rate</p>
            </div>
          </div>

          <div className="glass p-6 animate-fade-up card-hover">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-brand-600" />
              <h3 className="panel-title">ROI Comparison by Scheme</h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" label={{ value: "ROI Score", angle: -90, position: "insideLeft", fontSize: 12, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}
                    formatter={(value: number) => [`${value.toFixed(1)}x`, "ROI Score"]}
                  />
                  <Legend />
                  <Bar dataKey="roi" name="ROI Score" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4 animate-fade-up">
            <h3 className="panel-title flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-brand-600" />
              Scheme Details
            </h3>

            {sorted.map((s) => (
              <SchemeCard key={s.scheme_id} scheme={s} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function SchemeCard({ scheme }: { scheme: SchemeAnalytics }) {
  const completionPct = scheme.completion_rate ?? 0;
  const roiVal = scheme.roi_score ?? 0;
  const cpp = scheme.cost_per_placement ?? 0;
  const placed3m = scheme.total_placed_3m;
  const placed6m = scheme.total_placed_6m;
  const placed12m = scheme.total_placed_12m;

  const completionBarColor =
    completionPct >= 85 ? "bg-emerald-500" : completionPct >= 70 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="glass p-5 card-hover">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <h4 className="text-lg font-bold text-slate-800">{scheme.scheme_id}</h4>
          <span className="text-xs text-slate-400">Period: {scheme.period}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${roiColor(scheme.roi_score)}`}>
            <TrendingUp className="h-3 w-3" />
            {roiVal.toFixed(1)}x ROI
          </span>
          <span className={`chip text-xs ${alertChip(scheme.alert_status)}`}>
            {scheme.alert_status === "alert" && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
            {alertLabel(scheme.alert_status)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
        <StatItem label="Enrolled" value={scheme.total_enrolled.toLocaleString()} />
        <StatItem label="Completed" value={scheme.total_completed.toLocaleString()} />
        <StatItem label="Placed (3m)" value={placed3m.toLocaleString()} sub={`${scheme.total_enrolled > 0 ? ((placed3m / scheme.total_enrolled) * 100).toFixed(1) : 0}%`} />
        <StatItem label="Placed (6m)" value={placed6m.toLocaleString()} sub={`${scheme.total_enrolled > 0 ? ((placed6m / scheme.total_enrolled) * 100).toFixed(1) : 0}%`} />
        <StatItem label="Placed (12m)" value={placed12m.toLocaleString()} sub={`${scheme.total_enrolled > 0 ? ((placed12m / scheme.total_enrolled) * 100).toFixed(1) : 0}%`} />
        <StatItem label="Cost/Placement" value={`₹${cpp.toLocaleString()}`} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500">Completion Rate</span>
          <span className="text-xs font-medium text-slate-700">{completionPct}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${completionBarColor}`}
            style={{ width: `${Math.min(completionPct, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
