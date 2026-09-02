"use client";

import Link from "next/link";
import { Briefcase, Users, FileSearch } from "lucide-react";

export default function EmployerDashboard() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Employer Portal</h1>
        <p className="text-slate-500 mb-8">Post jobs and discover matched candidates</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <Briefcase className="h-5 w-5 text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-slate-800">8</p>
            <p className="text-sm text-slate-500">Active Postings</p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <Users className="h-5 w-5 text-emerald-600 mb-2" />
            <p className="text-2xl font-bold text-slate-800">47</p>
            <p className="text-sm text-slate-500">Matched Candidates</p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <FileSearch className="h-5 w-5 text-purple-600 mb-2" />
            <p className="text-2xl font-bold text-slate-800">12</p>
            <p className="text-sm text-slate-500">Applications</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/employer/jobs" className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md">
            <h3 className="font-semibold text-slate-800">Job Postings</h3>
            <p className="text-sm text-slate-500 mt-1">Create and manage job listings</p>
          </Link>
          <Link href="/employer/matches" className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md">
            <h3 className="font-semibold text-slate-800">Candidate Matches</h3>
            <p className="text-sm text-slate-500 mt-1">AI-ranked candidate recommendations</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
