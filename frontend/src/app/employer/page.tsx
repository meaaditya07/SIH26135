"use client";

import Link from "next/link";
import { Briefcase, Users, FileSearch, ArrowUpRight, PlusCircle } from "lucide-react";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";

const stats = [
  { label: "Active Postings", value: 8, icon: Briefcase, tint: "from-brand-500 to-indigo-500", text: "text-brand-600" },
  { label: "Matched Candidates", value: 47, icon: Users, tint: "from-emerald-500 to-teal-500", text: "text-emerald-600" },
  { label: "Applications", value: 12, icon: FileSearch, tint: "from-violet-500 to-fuchsia-500", text: "text-violet-600" },
];

const cards = [
  { href: "/employer/jobs", title: "Job Postings", desc: "Create and manage job listings", icon: PlusCircle, tint: "from-sky-500 to-cyan-500" },
  { href: "/employer/matches", title: "Candidate Matches", desc: "AI-ranked candidate recommendations", icon: Users, tint: "from-brand-500 to-indigo-500" },
  { href: "/employer/pipeline", title: "Hiring Pipeline", desc: "Track applicants through interview and offer", icon: FileSearch, tint: "from-emerald-500 to-teal-500" },
];

export default function EmployerDashboard() {
  useRequireAuth("employer");
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 animate-fade-up">
          <h1 className="text-3xl font-extrabold text-slate-900">Employer Portal</h1>
          <p className="text-slate-500">Post jobs and discover matched candidates</p>
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

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
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
      </div>
    </main>
  );
}