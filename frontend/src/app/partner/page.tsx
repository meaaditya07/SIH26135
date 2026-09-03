"use client";

import Link from "next/link";
import { BookOpen, Users, BarChart3, Sparkles, ArrowUpRight, BookMarked } from "lucide-react";
import { usePlacementHealth } from "@/lib/hooks/useDashboard";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";

const stats = [
  { label: "Active Courses", value: "24", icon: BookOpen, tint: "from-brand-500 to-indigo-500", text: "text-brand-600" },
  { label: "Enrolled Students", value: "1,847", icon: Users, tint: "from-emerald-500 to-teal-500", text: "text-emerald-600" },
  { label: "Placement Rate", value: "72%", icon: BarChart3, tint: "from-violet-500 to-fuchsia-500", text: "text-violet-600" },
];

const cards = [
  { href: "/partner/courses", title: "Courses", desc: "Manage and view all training programs", icon: BookMarked, tint: "from-sky-500 to-cyan-500" },
  { href: "/partner/students", title: "Students", desc: "Track enrollment, outcomes, and surveys", icon: Users, tint: "from-emerald-500 to-teal-500" },
  { href: "/partner/curriculum-gap", title: "Curriculum Gaps", desc: "See how your curriculum aligns with market demand", icon: BarChart3, tint: "from-violet-500 to-fuchsia-500" },
  { href: "/partner/enrollment", title: "Enrollments", desc: "Register and manage student enrollments", icon: BookOpen, tint: "from-amber-500 to-orange-500" },
];

export default function PartnerDashboard() {
  useRequireAuth("training_partner");
  const { ready } = usePlacementHealth();

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 animate-fade-up">
          <h1 className="text-3xl font-extrabold text-slate-900">Training Partner Dashboard</h1>
          <p className="text-slate-500">Track student outcomes and curriculum alignment</p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map(({ label, value, icon: Icon, tint, text }, i) => (
            <div key={label} className="glass p-6 transition-transform duration-300 hover:-translate-y-1 animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tint} shadow-md`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-800">{value}</p>
              <p className={`text-sm ${text} font-medium`}>{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ href, title, desc, icon: Icon, tint }, i) => (
            <Link key={href} href={href} className="group glass card-hover animate-fade-up p-6" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="flex items-start justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${tint} shadow-md transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-slate-300 transition-all group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-brand-500" />
              </div>
              <h3 className="mt-4 font-bold text-slate-800 group-hover:text-brand-700">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{desc}</p>
            </Link>
          ))}
        </div>

        <div className="glass mt-8 border-brand-200/60 p-6 animate-fade-up delay-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-md ${ready ? "bg-gradient-to-br from-emerald-500 to-teal-500" : "bg-gradient-to-br from-amber-500 to-orange-500"}`}>
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Placement Prediction Engine</h3>
                <p className="text-sm text-slate-500">
                  {ready === null
                    ? "Checking model status…"
                    : ready
                    ? "AI model live — forecast placement likelihood for your students."
                    : "Placement model not loaded yet. Run the training script to enable forecasts."}
                </p>
              </div>
            </div>
            <span className={`chip shrink-0 ${ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {ready === null ? "Checking" : ready ? "Active" : "Offline"}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}