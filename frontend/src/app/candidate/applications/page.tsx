"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useMyApplications } from "@/lib/hooks/useDashboard";
import { FileText, Inbox } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  applied: "bg-slate-100 text-slate-600",
  shortlisted: "bg-blue-100 text-blue-700",
  interview: "bg-amber-100 text-amber-700",
  offered: "bg-purple-100 text-purple-700",
  hired: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export default function MyApplicationsPage() {
  const [status, setStatus] = useState("");
  const { data: apps, loading } = useMyApplications(status || undefined);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="My Applications" />
        <main className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-1">My Applications</h1>
                <p className="text-slate-500">Track the status of jobs you have applied to</p>
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All statuses</option>
                <option value="applied">Applied</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interview">Interview</option>
                <option value="offered">Offered</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {loading && <p className="text-slate-500">Loading…</p>}

            {!loading && apps.length === 0 && (
              <div className="rounded-lg border bg-white p-12 flex flex-col items-center text-center">
                <Inbox className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">No applications yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  Browse your matching jobs and apply to get started.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {apps.map((a) => (
                <div key={a.id} className="rounded-lg border bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="font-semibold text-slate-800">Application</p>
                        <p className="text-xs text-slate-500">
                          Applied {a.applied_at ? new Date(a.applied_at).toLocaleDateString() : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_STYLES[a.status] ?? STATUS_STYLES.applied}`}>
                        {a.status}
                      </span>
                      {a.match_score != null && (
                        <p className="text-xs text-slate-400 mt-1">
                          {a.match_score}% match at application
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
