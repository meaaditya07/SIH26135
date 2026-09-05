"use client";

import { useMemo } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import { usePolicyAlerts } from "@/lib/hooks/useDashboard";
import type { PolicyAlert } from "@/lib/types";
import {
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle2,
} from "lucide-react";

function formatTimestamp(ts: string | null): string {
  if (!ts) return "Unknown";
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_ORDER: Record<string, number> = { alert: 0, underperforming: 1 };

function severityCompare(a: PolicyAlert, b: PolicyAlert) {
  return (STATUS_ORDER[a.alert_status] ?? 2) - (STATUS_ORDER[b.alert_status] ?? 2);
}

function AlertSkeleton() {
  return (
    <div className="glass p-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl skeleton shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-5 w-28 rounded skeleton" />
            <div className="h-5 w-24 rounded-full skeleton" />
          </div>
          <div className="h-4 w-full rounded skeleton" />
          <div className="h-4 w-3/4 rounded skeleton" />
          <div className="flex gap-4 mt-2">
            <div className="h-4 w-20 rounded skeleton" />
            <div className="h-4 w-32 rounded skeleton" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  useRequireAuth("gov_admin");
  const { data: alerts, loading } = usePolicyAlerts();

  const sorted = useMemo(
    () => [...(alerts ?? [])].sort(severityCompare),
    [alerts],
  );

  const alertCount = sorted.filter((a) => a.alert_status === "alert").length;
  const underperformingCount = sorted.filter((a) => a.alert_status === "underperforming").length;
  const totalCount = sorted.length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar
          title="Policy Alerts"
          subtitle="Real-time monitoring of scheme performance thresholds"
        />
        <main className="space-y-6 p-6">

          {/* Back link */}
          <Link
            href="/gov"
            className="btn-ghost inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          {loading ? (
            <>
              {/* Summary skeleton */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass p-5 animate-pulse">
                    <div className="h-4 w-24 rounded skeleton mb-2" />
                    <div className="h-8 w-16 rounded skeleton" />
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <AlertSkeleton key={i} />
                ))}
              </div>
            </>
          ) : totalCount === 0 ? (
            /* ── Empty state ───────────────────────────────────────────── */
            <div className="glass animate-fade-up flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-green-50 shadow-lg shadow-emerald-200/50">
                <ShieldCheck className="h-10 w-10 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">All Systems Healthy</h2>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                No active policy alerts. All schemes are performing within their defined targets.
              </p>
              <Link
                href="/gov/scheme-roi"
                className="btn-glass mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                View Scheme ROI
              </Link>
            </div>
          ) : (
            <>
              {/* ── Summary cards ─────────────────────────────────────────── */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="glass animate-fade-up p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Alerts</p>
                  <p className="mt-1 text-3xl font-extrabold text-slate-800">{totalCount}</p>
                </div>
                <div className="glass animate-fade-up p-5" style={{ animationDelay: "0.05s" }}>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                    </span>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Critical</p>
                  </div>
                  <p className="mt-1 text-3xl font-extrabold text-rose-600">{alertCount}</p>
                </div>
                <div className="glass animate-fade-up p-5" style={{ animationDelay: "0.1s" }}>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                    </span>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Warning</p>
                  </div>
                  <p className="mt-1 text-3xl font-extrabold text-amber-600">{underperformingCount}</p>
                </div>
              </div>

              {/* ── Alert cards ────────────────────────────────────────────── */}
              <div className="space-y-4">
                {sorted.map((alert, i) => {
                  const isAlert = alert.alert_status === "alert";
                  const borderClass = isAlert
                    ? "border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-500/20 to-transparent"
                    : "border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/20 to-transparent";

                  return (
                    <div
                      key={alert.scheme_id}
                      className={`glass card-hover p-6 animate-fade-up ${borderClass}`}
                      style={{ animationDelay: `${i * 0.08}s` }}
                    >
                      <div className="flex items-start gap-4">
                        {/* Pulsing dot */}
                        <div className="mt-1 shrink-0">
                          {isAlert ? (
                            <span className="relative flex h-3.5 w-3.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-rose-500 shadow-sm shadow-rose-300" />
                            </span>
                          ) : (
                            <span className="relative flex h-3.5 w-3.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-amber-500 shadow-sm shadow-amber-300" />
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Header row */}
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-bold text-slate-800">{alert.scheme_id}</h3>
                            <span
                              className={`chip font-semibold ${
                                isAlert
                                  ? "bg-rose-100 text-rose-700 ring-1 ring-rose-200"
                                  : "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
                              }`}
                            >
                              {isAlert ? (
                                <AlertCircle className="inline h-3 w-3 -mt-0.5 mr-1" />
                              ) : (
                                <AlertTriangle className="inline h-3 w-3 -mt-0.5 mr-1" />
                              )}
                              {alert.alert_status === "alert" ? "Critical Alert" : "Underperforming"}
                            </span>
                          </div>

                          {/* Reason */}
                          <p className="mt-3 text-sm leading-relaxed text-slate-600">
                            {alert.alert_reason ?? "No reason provided."}
                          </p>

                          {/* Metrics row */}
                          <div className="mt-4 flex flex-wrap items-center gap-5 text-sm">
                            {alert.roi_score !== null && (
                              <div className="flex items-center gap-1.5">
                                <TrendingDown
                                  className={`h-4 w-4 ${
                                    alert.roi_score < 2
                                      ? "text-rose-500"
                                      : alert.roi_score < 3
                                        ? "text-amber-500"
                                        : "text-emerald-500"
                                  }`}
                                />
                                <span className="text-slate-500">ROI</span>
                                <span
                                  className={`font-bold ${
                                    alert.roi_score < 2
                                      ? "text-rose-600"
                                      : alert.roi_score < 3
                                        ? "text-amber-600"
                                        : "text-emerald-600"
                                  }`}
                                >
                                  {alert.roi_score.toFixed(1)}
                                </span>
                              </div>
                            )}

                            {alert.cost_per_placement !== null && (
                              <div className="flex items-center gap-1.5">
                                <DollarSign className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-500">Cost/placement</span>
                                <span className="font-bold text-slate-700">
                                  ₹{alert.cost_per_placement.toLocaleString("en-IN")}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-400 text-xs">
                                {formatTimestamp(alert.computed_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Link to scheme ROI */}
                        <Link
                          href="/gov/scheme-roi"
                          className="btn-ghost shrink-0 self-center rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700"
                        >
                          Details &rarr;
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
