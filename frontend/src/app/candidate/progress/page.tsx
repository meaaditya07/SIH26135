"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle, Circle, Clock } from "lucide-react";

interface TimelineItem {
  date: string;
  title: string;
  description: string;
  status: "completed" | "pending" | "upcoming";
}

const timeline: TimelineItem[] = [
  { date: "2026-03-10", title: "Enrolled in PMKVY IT Course", description: "Python Programming & Data Analysis (24 weeks)", status: "completed" },
  { date: "2026-08-25", title: "Training Completed", description: "Certificate ID: PMKVY-2026-8842", status: "completed" },
  { date: "2026-09-25", title: "3-Month Follow-up Survey", description: "WhatsApp survey will be sent", status: "pending" },
  { date: "2026-12-25", title: "6-Month Follow-up Survey", description: "Scheduled survey", status: "upcoming" },
  { date: "2027-06-25", title: "12-Month Follow-up Survey", description: "Scheduled survey", status: "upcoming" },
];

const statusStyles = {
  completed: { icon: CheckCircle, color: "text-green-600 border-green-200 bg-green-50" },
  pending: { icon: Clock, color: "text-amber-600 border-amber-200 bg-amber-50" },
  upcoming: { icon: Circle, color: "text-slate-400 border-slate-200 bg-slate-50" },
};

const outcomes = [
  { interval: "3-Month", employed: true, title: "Junior Developer", salary: "₹18,000/mo", verified: true },
  { interval: "6-Month", employed: null, title: "Pending response" as const, salary: "—", verified: false as const },
  { interval: "12-Month", employed: null, title: "Not yet due" as const, salary: "—", verified: false as const },
];

export default function ProgressPage() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/candidate" className="hover:text-brand-600">← Back to Dashboard</Link>
        </nav>

        <h1 className="text-3xl font-bold text-slate-800 mb-2">My Journey</h1>
        <p className="text-slate-500 mb-8">Your training, follow-up surveys, and employment outcomes</p>

        <div className="rounded-lg border bg-white shadow-sm p-6 mb-8">
          <h3 className="font-semibold text-slate-800 mb-4">Timeline</h3>
          <div className="space-y-0">
            {timeline.map((item, i) => {
              const styles = statusStyles[item.status];
              const Icon = styles.icon;
              return (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-full border flex items-center justify-center ${styles.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-slate-200" />}
                  </div>
                  <div className="pb-8 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-slate-700">{item.title}</h4>
                      <span className="text-xs text-slate-400">{item.date}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h3 className="font-semibold text-slate-800">Employment Outcomes</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {outcomes.map((o, i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-slate-700">{o.interval} Follow-up</p>
                  <p className="text-sm text-slate-500">
                    {o.employed === true && <span className="text-green-600">{o.title} · {o.salary}</span>}
                    {o.employed === null && o.title}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  o.employed === true
                    ? "bg-green-100 text-green-700"
                    : o.employed === false
                    ? "bg-slate-100 text-slate-600"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {o.verified ? "Employer Verified" : o.employed === true ? "Self-Reported" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
