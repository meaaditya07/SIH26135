"use client";

import Link from "next/link";
import { Search, Filter, GraduationCap } from "lucide-react";

const students = [
  { id: "s1", name: "Rahul Sharma", course: "Python Programming", enrolled: "2026-03-10", status: "employed", salary: "₹22,000", survey: "3M" },
  { id: "s2", name: "Priya Patel", course: "Data Analysis", enrolled: "2026-03-12", status: "employed", salary: "₹18,000", survey: "3M" },
  { id: "s3", name: "Amit Kumar", course: "Python Programming", enrolled: "2026-03-15", status: "unemployed", salary: "—", survey: "6M" },
  { id: "s4", name: "Sneha Reddy", course: "Frontend Development", enrolled: "2026-04-01", status: "employed", salary: "₹25,000", survey: "3M" },
  { id: "s5", name: "Vikram Singh", course: "Python Programming", enrolled: "2026-04-05", status: "survey-pending", salary: "—", survey: "3M" },
  { id: "s6", name: "Ananya Iyer", course: "Digital Marketing", enrolled: "2026-04-08", status: "self-employed", salary: "₹15,000", survey: "6M" },
  { id: "s7", name: "Karan Mehta", course: "Frontend Development", enrolled: "2026-04-12", status: "in-training", salary: "—", survey: "—" },
];

const statusStyles: Record<string, { label: string; className: string }> = {
  employed: { label: "Employed", className: "bg-emerald-100 text-emerald-700" },
  unemployed: { label: "Unemployed", className: "bg-red-100 text-red-600" },
  "self-employed": { label: "Self-Employed", className: "bg-blue-100 text-blue-700" },
  "survey-pending": { label: "Survey Pending", className: "bg-amber-100 text-amber-700" },
  "in-training": { label: "In Training", className: "bg-slate-100 text-slate-600" },
};

export default function StudentsPage() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-1">Student Outcomes</h1>
            <p className="text-slate-500">Track enrollment, employment status, and survey completions</p>
          </div>
          <button className="btn-ghost">
            <GraduationCap className="h-4 w-4" /> Export CSV
          </button>
        </div>

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              placeholder="Search by name or course..."
              className="input-glass pl-10"
            />
          </div>
          <select className="input-glass w-auto">
            <option>All Statuses</option>
            <option>Employed</option>
            <option>Unemployed</option>
            <option>Survey Pending</option>
          </select>
          <select className="input-glass w-auto">
            <option>All Courses</option>
            <option>Python Programming</option>
            <option>Data Analysis</option>
            <option>Frontend Development</option>
          </select>
          <button className="btn-ghost">
            <Filter className="h-4 w-4" /> Filters
          </button>
        </div>

        <div className="glass p-6 overflow-hidden animate-fade-up">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-left font-medium text-slate-500">Student</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Course</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Enrolled</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Salary</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Survey</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Details</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const style = statusStyles[s.status];
                return (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-white/70 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.course}</td>
                    <td className="px-4 py-3 text-slate-500">{s.enrolled}</td>
                    <td className="px-4 py-3">
                      <span className={`chip ${style.className}`}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{s.salary}</td>
                    <td className="px-4 py-3 text-slate-500">{s.survey}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/partner/enrollment/${s.id}`}
                        className="text-brand-600 hover:text-brand-700 text-xs font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
