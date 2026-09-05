"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import { useCandidateMe } from "@/lib/hooks/useDashboard";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import {
  ShieldCheck, ShieldAlert, ShieldX, FileCheck, FileClock, FileX,
} from "lucide-react";

const statusConfig: Record<string, { label: string; icon: typeof ShieldCheck; color: string; bg: string }> = {
  verified: { label: "Verified", icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-100" },
  pending: { label: "Pending", icon: ShieldAlert, color: "text-amber-600", bg: "bg-amber-100" },
  rejected: { label: "Rejected", icon: ShieldX, color: "text-red-600", bg: "bg-red-100" },
};

interface DocRow {
  name: string;
  status: "verified" | "pending" | "rejected";
  date: string;
}

function docsFromProfile(digiStatus: string, verifiedDocs?: Record<string, unknown>): DocRow[] {
  if (verifiedDocs && Object.keys(verifiedDocs).length > 0) {
    return Object.entries(verifiedDocs).map(([name, val]) => ({
      name,
      status: (val as { status?: string })?.status === "verified" ? "verified" as const
        : (val as { status?: string })?.status === "rejected" ? "rejected" as const
        : "pending" as const,
      date: (val as { verified_at?: string })?.verified_at ?? "—",
    }));
  }
  const ds = digiStatus === "verified" ? "verified" as const : digiStatus === "rejected" ? "rejected" as const : "pending" as const;
  return [
    { name: "Aadhaar Card", status: ds, date: ds === "verified" ? "Verified via DigiLocker" : "—" },
    { name: "10th Marksheet", status: ds, date: ds === "verified" ? "Verified via DigiLocker" : "—" },
    { name: "Training Certificate", status: "pending", date: "—" },
    { name: "Caste Certificate", status: "pending", date: "—" },
  ];
}

export default function VerificationPage() {
  useRequireAuth("candidate");

  const { data: candidate, loading } = useCandidateMe();
  const [digiModalOpen, setDigiModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const digiStatus = (candidate?.digilocker_status as "verified" | "pending" | "rejected") ?? "pending";
  const cfg = statusConfig[digiStatus];
  const StatusIcon = cfg.icon;
  const docs = docsFromProfile(digiStatus, candidate?.verified_docs as Record<string, unknown> | undefined);
  const verifiedCount = docs.filter((d) => d.status === "verified").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Identity Verification" subtitle="Verify your identity via DigiLocker" />
        <main className="p-6">
          <div className="max-w-3xl mx-auto">
            {toast && <div className="mb-4"><Toast message={toast} tone="info" /></div>}

            <div className="mb-6 animate-fade-up">
              <h1 className="text-3xl font-extrabold text-slate-900 mb-1">Identity Verification</h1>
              <p className="text-slate-500">Verify your identity via DigiLocker to unlock all features</p>
            </div>

            {loading && (
              <div className="space-y-4">
                <div className="glass skeleton h-28" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glass skeleton h-36" />
                  <div className="glass skeleton h-36" />
                </div>
                <div className="glass skeleton h-48" />
              </div>
            )}

            {!loading && !candidate && (
              <div className="glass p-12 flex flex-col items-center text-center animate-fade-up">
                <ShieldAlert className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">Profile not found</p>
                <p className="text-sm text-slate-400 mt-1">Please complete your candidate profile first.</p>
              </div>
            )}

            {!loading && candidate && (
              <>
                <div className="glass p-6 mb-6 flex items-center gap-4 animate-fade-up">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${digiStatus === "verified" ? "from-emerald-500 to-teal-500" : digiStatus === "pending" ? "from-amber-500 to-orange-500" : "from-red-500 to-red-600"} shadow-md`}>
                    <StatusIcon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800">{cfg.label}</h3>
                    <p className="text-sm text-slate-600">
                      {digiStatus === "pending" && "Your DigiLocker verification is in progress. Connect to complete verification."}
                      {digiStatus === "verified" && "Your identity has been verified via DigiLocker."}
                      {digiStatus === "rejected" && "Your documents were rejected. Please re-verify."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <button
                    onClick={() => setDigiModalOpen(true)}
                    className="glass card-hover p-6 text-center animate-fade-up"
                    style={{ animationDelay: "0.05s" }}
                  >
                    <ShieldCheck className="h-8 w-8 mx-auto text-brand-600 mb-2" />
                    <span className="font-semibold text-brand-700">
                      {digiStatus === "verified" ? "DigiLocker Connected" : "Connect DigiLocker"}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      {digiStatus === "verified" ? "Identity already verified" : "OAuth2 authorization flow"}
                    </p>
                  </button>
                  <div className="glass-inner p-6 text-center animate-fade-up" style={{ animationDelay: "0.1s" }}>
                    <span className="font-semibold text-slate-600">Verified Documents</span>
                    <p className="text-xs text-slate-400 mt-1">
                      {verifiedCount} of {docs.length} required documents verified
                    </p>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                        style={{ width: `${docs.length > 0 ? (verifiedCount / docs.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="glass p-6 overflow-hidden animate-fade-up delay-200">
                  <h3 className="panel-title mb-4"><FileCheck className="h-5 w-5 text-brand-600" /> Document Status</h3>
                  <div className="divide-y divide-slate-100">
                    {docs.map((doc, i) => {
                      const d = statusConfig[doc.status];
                      const DocIcon = d.icon;
                      return (
                        <div key={i} className="flex items-center justify-between p-4 hover:bg-white/70 transition-colors">
                          <div className="flex items-center gap-3">
                            <DocIcon className={`h-5 w-5 ${d.color}`} />
                            <div>
                              <p className="font-medium text-slate-700">{doc.name}</p>
                              <p className="text-xs text-slate-400">{doc.date}</p>
                            </div>
                          </div>
                          <span className={`chip ${d.bg} ${d.color}`}>{d.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <Modal
        open={digiModalOpen}
        title="DigiLocker Integration"
        subtitle="Identity verification via DigiLocker"
        onClose={() => setDigiModalOpen(false)}
        footer={
          <button onClick={() => {
            setDigiModalOpen(false);
            setToast("DigiLocker integration connects automatically when available.");
          }} className="btn-glass text-xs px-4 py-2">
            Got it
          </button>
        }
      >
        <div className="space-y-4 text-sm text-slate-600">
          <p>
            DigiLocker integration allows automatic verification of your identity
            documents (Aadhaar, educational certificates, etc.) without manual uploads.
          </p>
          {digiStatus === "verified" ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="font-medium text-emerald-700">Your identity is already verified via DigiLocker.</p>
              <p className="mt-1 text-xs text-emerald-600">No further action needed.</p>
            </div>
          ) : digiStatus === "pending" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-medium text-amber-700">Verification is in progress.</p>
              <p className="mt-1 text-xs text-amber-600">You will be notified once DigiLocker connects.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="font-medium text-red-700">Verification was rejected.</p>
              <p className="mt-1 text-xs text-red-600">Please ensure your DigiLocker documents are up to date and re-verify.</p>
            </div>
          )}
          <p className="text-xs text-slate-400">
            This integration is handled by the system and requires no manual OAuth flow on your end.
          </p>
        </div>
      </Modal>
    </div>
  );
}
