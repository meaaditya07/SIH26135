"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, FileType2, Loader2 } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import {
  useAvailableReports,
  useAnalyticsSnapshot,
  downloadReport,
} from "@/lib/hooks/useDashboard";
import type { ReportFormat } from "@/lib/types";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";

const FORMAT_META: Record<ReportFormat, { icon: typeof FileText; label: string; color: string }> = {
  csv: { icon: FileType2, label: "CSV", color: "text-green-600 border-green-200 hover:bg-green-50" },
  xlsx: { icon: FileSpreadsheet, label: "Excel", color: "text-emerald-600 border-emerald-200 hover:bg-emerald-50" },
  pdf: { icon: FileText, label: "PDF", color: "text-red-600 border-red-200 hover:bg-red-50" },
};

export default function ReportsPage() {
  useRequireAuth("gov_admin");
  const { data: available, loading: loadingReports } = useAvailableReports();
  const { data: snapshot } = useAnalyticsSnapshot();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(reportType: string, format: ReportFormat) {
    const key = `${reportType}.${format}`;
    setDownloading(key);
    setError(null);
    try {
      await downloadReport(reportType, format);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Download failed. Check your permissions."
      );
    } finally {
      setDownloading(null);
    }
  }

  const snapshotCards = [
    { label: "Candidates", value: snapshot?.counts.total_candidates ?? 0 },
    { label: "Training Partners", value: snapshot?.counts.total_training_partners ?? 0 },
    { label: "Active Employers", value: snapshot?.counts.total_employers ?? 0 },
    { label: "Enrollments", value: snapshot?.counts.total_enrollments ?? 0 },
    {
      label: "Overall Placement Rate",
      value: snapshot ? `${snapshot.outcomes.overall_placement_rate ?? 0}%` : "…",
    },
    { label: "Outcomes Tracked", value: snapshot?.outcomes.total_outcomes ?? 0 },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Reports & Exports" />
        <main className="p-6 space-y-6">
          {error && (
            <div className="glass animate-scale-in border-rose-200/70 bg-rose-50/80 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="glass animate-fade-up p-6">
            <h3 className="panel-title mb-4">
              <FileText className="h-4 w-4 text-brand-600" />
              Analytics Snapshot
            </h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {snapshotCards.map(({ label, value }) => (
                <div key={label} className="glass-inner p-4">
                  <p className="text-xl font-bold text-slate-800">{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass animate-fade-up delay-100 p-6">
            <h3 className="panel-title mb-1">
              <Download className="h-4 w-4 text-emerald-600" />
              Download Reports
            </h3>
            <p className="mb-4 text-sm text-slate-500">
              Export current data as CSV, Excel, or PDF for each report type.
            </p>

            {loadingReports ? (
              <div className="flex items-center gap-2 text-slate-500 py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading report catalog…
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="py-2 pr-4 font-medium">Report</th>
                      <th className="py-2 pr-4 font-medium">Formats</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(available?.reports ?? []).map((report) => {
                      const count = snapshot
                        ? report.report_type === "candidates"
                          ? snapshot.counts.total_candidates
                          : report.report_type === "outcomes"
                            ? snapshot.outcomes.total_outcomes
                            : null
                        : null;
                      return (
                        <tr key={report.report_type} className="border-b last:border-0">
                          <td className="py-3 pr-4">
                            <div className="font-medium text-slate-800">{report.label}</div>
                            <div className="text-xs text-slate-400">
                              {report.report_type}
                              {count !== null && count !== undefined && (
                                <span className="ml-2">· {count.toLocaleString()} records</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-2">
                              {report.formats.map((fmt) => {
                                const meta = FORMAT_META[fmt];
                                const Icon = meta.icon;
                                const isDownloading = downloading === `${report.report_type}.${fmt}`;
                                return (
                                  <button
                                    key={fmt}
                                    onClick={() => handleDownload(report.report_type, fmt)}
                                    disabled={isDownloading}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${meta.color}`}
                                  >
                                    {isDownloading ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Icon className="h-3.5 w-3.5" />
                                    )}
                                    {isDownloading ? "Preparing…" : meta.label}
                                    {!isDownloading && <Download className="h-3 w-3" />}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
