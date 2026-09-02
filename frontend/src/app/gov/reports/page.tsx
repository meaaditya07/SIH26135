"use client";

import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

export default function ReportsPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Reports" />
        <main className="p-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <p className="text-slate-500 text-center py-12">
              Report generation module — PDF/Excel export for scheme analytics, regional skill gaps, and outcome summaries.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
