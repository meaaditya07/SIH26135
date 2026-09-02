"use client";

import Link from "next/link";
import { BookOpen, Users, BarChart3, Sparkles } from "lucide-react";
import { usePlacementHealth } from "@/lib/hooks/useDashboard";

export default function PartnerDashboard() {
  const { ready } = usePlacementHealth();

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Training Partner Dashboard</h1>
        <p className="text-slate-500 mb-8">Track student outcomes and curriculum alignment</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Active Courses", value: "24", icon: BookOpen, color: "text-blue-600" },
            { label: "Enrolled Students", value: "1,847", icon: Users, color: "text-emerald-600" },
            { label: "Placement Rate", value: "72%", icon: BarChart3, color: "text-purple-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-lg border bg-white p-6 shadow-sm">
              <Icon className={`h-5 w-5 ${color} mb-2`} />
              <p className="text-2xl font-bold text-slate-800">{value}</p>
              <p className="text-sm text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/partner/courses" className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md">
            <h3 className="font-semibold text-slate-800">Courses</h3>
            <p className="text-sm text-slate-500 mt-1">Manage and view all training programs</p>
          </Link>
          <Link href="/partner/students" className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md">
            <h3 className="font-semibold text-slate-800">Students</h3>
            <p className="text-sm text-slate-500 mt-1">Track enrollment, outcomes, and surveys</p>
          </Link>
          <Link href="/partner/curriculum-gap" className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md">
            <h3 className="font-semibold text-slate-800">Curriculum Gaps</h3>
            <p className="text-sm text-slate-500 mt-1">See how your curriculum aligns with market demand</p>
          </Link>
        </div>

        <div className="mt-8 rounded-lg border border-brand-100 bg-brand-50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-brand-600" />
              <div>
                <h3 className="font-semibold text-slate-800">Placement Prediction Engine</h3>
                <p className="text-sm text-slate-500">
                  {ready === null
                    ? "Checking model status…"
                    : ready
                    ? "AI model live — forecast placement likelihood for your students."
                    : "Placement model not loaded yet. Run the training script to enable forecasts."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
