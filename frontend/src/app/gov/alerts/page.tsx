"use client";

import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

const alerts = [
  {
    scheme: "NRLM",
    status: "alert",
    reason: "Low retention rate (45%) and high cost-per-placement (INR 3,200)",
    timestamp: "2026-09-01",
  },
  {
    scheme: "DDU-GKY",
    status: "underperforming",
    reason: "Curriculum-market fit below threshold (65%). Top skills gap: Cloud Computing, DevOps",
    timestamp: "2026-08-28",
  },
  {
    scheme: "PMKVY-4.0",
    status: "underperforming",
    reason: "3-month retention dropping 5% month-over-month in Tamil Nadu region",
    timestamp: "2026-08-25",
  },
];

export default function AlertsPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Policy Alerts" />
        <main className="p-6 space-y-4">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`rounded-lg border p-4 ${
                alert.status === "alert"
                  ? "bg-red-50 border-red-200"
                  : "bg-amber-50 border-amber-200"
              }`}
            >
              <div className="flex items-start gap-3">
                {alert.status === "alert" ? (
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800">{alert.scheme}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        alert.status === "alert"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {alert.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{alert.reason}</p>
                  <p className="text-xs text-slate-400 mt-2">{alert.timestamp}</p>
                </div>
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
