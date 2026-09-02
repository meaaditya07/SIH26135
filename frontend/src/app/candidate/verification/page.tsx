"use client";

import Link from "next/link";
import { useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldX, FileCheck, FileX, FileClock } from "lucide-react";

const statusConfig = {
  verified: { label: "Verified", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-100" },
  pending: { label: "Pending", icon: ShieldAlert, color: "text-amber-600", bg: "bg-amber-100" },
  rejected: { label: "Rejected", icon: ShieldX, color: "text-red-600", bg: "bg-red-100" },
};

interface DocRow {
  name: string;
  status: "verified" | "pending" | "rejected";
  date: string;
}

const mockDocs: DocRow[] = [
  { name: "Aadhaar Card", status: "verified", date: "2026-08-15" },
  { name: "10th Marksheet", status: "verified", date: "2026-08-15" },
  { name: "Training Certificate (PMKVY)", status: "pending", date: "—" },
];

export default function VerificationPage() {
  const [status] = useState<"verified" | "pending" | "rejected">("pending");
  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/candidate" className="hover:text-brand-600">← Back to Dashboard</Link>
        </nav>

        <h1 className="text-3xl font-bold text-slate-800 mb-2">Identity Verification</h1>
        <p className="text-slate-500 mb-8">Verify your identity via DigiLocker to unlock all features</p>

        <div className={`rounded-lg border ${cfg.bg} p-6 mb-6 flex items-center gap-4`}>
          <StatusIcon className={`h-12 w-12 ${cfg.color}`} />
          <div>
            <h3 className="font-semibold text-lg text-slate-800">{cfg.label}</h3>
            <p className="text-sm text-slate-600">
              {status === "pending" && "Your DigiLocker verification is in progress. Connect to complete verification."}
              {status === "verified" && "Your identity has been verified via DigiLocker."}
              {status === "rejected" && "Your documents were rejected. Please re-verify."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button className="rounded-lg border-2 border-dashed border-brand-300 p-6 text-center hover:bg-brand-50 transition-colors">
            <ShieldCheck className="h-8 w-8 mx-auto text-brand-600 mb-2" />
            <span className="font-semibold text-brand-700">Connect DigiLocker</span>
            <p className="text-xs text-slate-500 mt-1">OAuth2 authorization flow</p>
          </button>
          <div className="rounded-lg border bg-slate-50 p-6 text-center">
            <span className="font-semibold text-slate-600">Verified Documents</span>
            <p className="text-xs text-slate-400 mt-1">2 of 4 required documents verified</p>
          </div>
        </div>

        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h3 className="font-semibold text-slate-800">Document Status</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {mockDocs.map((doc, i) => {
              const d = statusConfig[doc.status];
              const DocIcon = d.icon;
              return (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <DocIcon className={`h-5 w-5 ${d.color}`} />
                    <div>
                      <p className="font-medium text-slate-700">{doc.name}</p>
                      <p className="text-xs text-slate-400">Verified: {doc.date}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${d.bg} ${d.color}`}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
