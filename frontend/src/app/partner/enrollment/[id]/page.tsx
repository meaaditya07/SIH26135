"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Award, Wallet, MessageSquare } from "lucide-react";

export default function EnrollmentDetailPage() {
  const params = useParams();
  const enrollmentId = params.id;

  // Mock data for the student
  const student = {
    name: "Rahul Sharma",
    id: enrollmentId,
    course: "Python Programming (PMKVY 4.0)",
    enrolled: "2026-03-10",
    completed: "2026-08-25",
    status: "employed",
  };

  const timeline = [
    { date: "2026-03-10", event: "Enrolled in course", type: "enrollment" },
    { date: "2026-08-25", event: "Training completed", type: "completion" },
    { date: "2026-09-25", event: "3-month survey: Employed as Junior Developer", type: "survey" },
    { date: "2026-12-25", event: "6-month survey pending", type: "survey" },
  ];

  const salaryPoints = [
    { label: "Baseline", value: 12000 },
    { label: "3 Months", value: 18000 },
    { label: "6 Months", value: 22000 },
    { label: "12 Months", value: 26000 },
  ];

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/partner/students" className="inline-flex items-center gap-1 hover:text-brand-600">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Students
          </Link>
        </nav>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-1">{student.name}</h1>
            <p className="text-slate-500">{student.course}</p>
          </div>
          <span className="chip bg-emerald-100 text-emerald-700 text-sm font-medium px-3 py-1.5">
            Employed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="glass p-5 hover:-translate-y-1 transition-transform animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 shadow-md">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Enrolled</p>
                <p className="font-medium text-slate-700">{student.enrolled}</p>
              </div>
            </div>
          </div>
          <div className="glass p-5 hover:-translate-y-1 transition-transform animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-md">
                <Award className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Completed</p>
                <p className="font-medium text-slate-700">{student.completed}</p>
              </div>
            </div>
          </div>
          <div className="glass p-5 hover:-translate-y-1 transition-transform animate-fade-up" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-md">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Current Salary</p>
                <p className="font-medium text-emerald-600">₹22,000 / month</p>
              </div>
            </div>
          </div>
          <div className="glass p-5 hover:-translate-y-1 transition-transform animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-md">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Survey Response</p>
                <p className="font-medium text-slate-700">WhatsApp · 3-month</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="glass p-6 animate-fade-up delay-200">
            <h3 className="panel-title mb-4"><Calendar className="h-5 w-5 text-brand-600" /> Timeline</h3>
            <div className="space-y-4">
              {timeline.map((t, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-2.5 w-2.5 rounded-full mt-1 ${
                        t.type === "completion" ? "bg-emerald-500" : "bg-brand-500"
                      }`}
                    />
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-slate-200" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{t.event}</p>
                    <p className="text-xs text-slate-400">{t.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass p-6 animate-fade-up delay-300">
            <h3 className="panel-title mb-4"><Wallet className="h-5 w-5 text-brand-600" /> Salary Progression</h3>
            <div className="flex items-end justify-between h-40 gap-2">
              {salaryPoints.map((s) => {
                const height = (s.value / 30000) * 100;
                return (
                  <div key={s.label} className="flex flex-col items-center flex-1 gap-2">
                    <span className="text-xs font-medium text-slate-600">₹{s.value / 1000}k</span>
                    <div className="w-full rounded-t overflow-hidden" style={{ height: `${height * 3}px` }}>
                      <div className="w-full bg-gradient-to-t from-brand-600 to-indigo-500 rounded-t" style={{ height: "100%", opacity: 0.9 }} />
                    </div>
                    <span className="text-xs text-slate-400">{s.label}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-4">Monthly salary progression since program completion</p>
          </div>
        </div>
      </div>
    </main>
  );
}
