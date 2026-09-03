"use client";

import Link from "next/link";
import { Plus, MoreHorizontal, Users, BookOpen } from "lucide-react";

const courses = [
  { id: "c1", name: "Python Programming", sector: "IT", students: 42, duration: "24 weeks", scheme: "PMKVY 4.0", status: "active" },
  { id: "c2", name: "Data Analysis with Excel", sector: "IT", students: 35, duration: "16 weeks", scheme: "PMKVY 4.0", status: "active" },
  { id: "c3", name: "Frontend Web Development", sector: "IT", students: 28, duration: "20 weeks", scheme: "PMKVY 4.0", status: "active" },
  { id: "c4", name: "Digital Marketing", sector: "Marketing", students: 31, duration: "12 weeks", scheme: "NSDC", status: "active" },
  { id: "c5", name: "AWS Cloud Fundamentals", sector: "IT", students: 22, duration: "8 weeks", scheme: "NSDC", status: "draft" },
];

export default function CoursesPage() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-1">My Courses</h1>
            <p className="text-slate-500">All training programs under management</p>
          </div>
          <button className="btn-glass">
            <Plus className="h-4 w-4" /> Add Course
          </button>
        </div>

        <div className="glass p-6 overflow-hidden animate-fade-up">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-left font-medium text-slate-500">Course Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Sector</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Students</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Duration</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Scheme</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-white/70 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <Link href={`/partner/enrollment/${c.id}`} className="hover:text-brand-700">{c.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.sector}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="flex items-center justify-end gap-1 text-slate-600">
                      <Users className="h-3.5 w-3.5" />{c.students}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.duration}</td>
                  <td className="px-4 py-3 text-slate-600">{c.scheme}</td>
                  <td className="px-4 py-3">
                    <span className={`chip ${
                      c.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="p-1 text-slate-400 hover:text-slate-600">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
