"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import {
  useJobPostings,
  createJobPosting,
  deactivateJobPosting,
  useEmployerApplicationsOverview,
} from "@/lib/hooks/useDashboard";
import type { JobPostingListItem } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import Field from "@/components/ui/Field";
import Toast from "@/components/ui/Toast";
import { Plus, MoreHorizontal, Briefcase, MapPin, IndianRupee, Calendar, Users, CheckCircle2, Sparkles } from "lucide-react";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Jammu and Kashmir","Ladakh",
];

function formatSalary(n: number | null) {
  if (n == null) return null;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function EmployerJobsPage() {
  useRequireAuth("employer");

  const { data: jobs, loading, } = useJobPostings(50);
  const { data: overview } = useEmployerApplicationsOverview();
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<JobPostingListItem | null>(null);

  const [form, setForm] = useState({
    title: "",
    state: "",
    district: "",
    salary_min: "",
    salary_max: "",
    required_skills: "",
  });

  const resetForm = () =>
    setForm({ title: "", state: "", district: "", salary_min: "", salary_max: "", required_skills: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createJobPosting({
        title: form.title,
        state: form.state || undefined,
        district: form.district || undefined,
        salary_min: form.salary_min ? Number(form.salary_min) : undefined,
        salary_max: form.salary_max ? Number(form.salary_max) : undefined,
        required_skills: form.required_skills
          ? form.required_skills.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
      });
      setToast({ message: "Job posting created!", tone: "success" });
      setModalOpen(false);
      resetForm();
    } catch {
      setToast({ message: "Failed to create job posting.", tone: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (job: JobPostingListItem) => {
    try {
      await deactivateJobPosting(job.id);
      setToast({ message: `"${job.title}" has been deactivated.`, tone: "success" });
      setActiveMenu(null);
      setConfirmDeactivate(null);
    } catch {
      setToast({ message: "Failed to deactivate job posting.", tone: "error" });
    }
  };

  const jobStats = useMemo(() => {
    const map = new Map<string, { count: number; hired: number; applied: number; sumMatch: number; updatedAt: string | null }>();
    for (const a of overview?.applications ?? []) {
      const s = map.get(a.job_posting_id) ?? { count: 0, hired: 0, applied: 0, sumMatch: 0, updatedAt: null };
      s.count += 1;
      if (a.match_score != null) s.sumMatch += a.match_score;
      if (a.status === "hired") s.hired += 1;
      if (a.status === "applied") s.applied += 1;
      if (!s.updatedAt || new Date(a.applied_at).getTime() > new Date(s.updatedAt).getTime()) {
        s.updatedAt = a.applied_at;
      }
      map.set(a.job_posting_id, s);
    }
    return map;
  }, [overview]);

  const totalApplicants = useMemo(
    () => Array.from(jobStats.values()).reduce((sum, s) => sum + s.count, 0),
    [jobStats],
  );
  const totalHired = useMemo(
    () => Array.from(jobStats.values()).reduce((sum, s) => sum + s.hired, 0),
    [jobStats],
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Job Postings" />
        <main className="p-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-1">Job Postings</h1>
                <p className="text-slate-500">Create and manage your job listings</p>
              </div>
              <button onClick={() => setModalOpen(true)} className="btn-glass">
                <Plus className="h-4 w-4" /> New Posting
              </button>
            </div>

            {toast && (
              <div className="mb-4">
                <Toast message={toast.message} tone={toast.tone} />
              </div>
            )}

            {!loading && jobs.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
                <div className="glass p-4 animate-fade-up">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Active postings</p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-800">{jobs.filter((j) => j.is_active).length}</p>
                </div>
                <div className="glass p-4 animate-fade-up delay-100">
                  <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                    <Users className="h-3 w-3" /> Applicants
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-800">{totalApplicants}</p>
                </div>
                <div className="glass p-4 animate-fade-up delay-200">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Avg / posting</p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-800">
                    {totalApplicants > 0 ? (totalApplicants / jobs.length).toFixed(1) : "0"}
                  </p>
                </div>
                <div className="glass p-4 animate-fade-up delay-300">
                  <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                    <CheckCircle2 className="h-3 w-3" /> Hired
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-emerald-600">{totalHired}</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass skeleton h-28 animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }} />
                ))}
              </div>
            )}

            {!loading && jobs.length === 0 && (
              <div className="glass p-12 text-center animate-fade-up">
                <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No job postings yet</p>
                <p className="text-sm text-slate-400 mt-1">Create your first posting to start receiving candidates.</p>
                <button onClick={() => setModalOpen(true)} className="btn-glass mt-4">
                  <Plus className="h-4 w-4" /> Create First Posting
                </button>
              </div>
            )}

            {!loading && jobs.length > 0 && (
              <div className="space-y-3">
                {jobs.map((job, i) => (
                  <div
                    key={job.id}
                    className="glass card-hover p-5 animate-fade-up"
                    style={{ animationDelay: `${0.04 * (i + 1)}s` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-800 truncate">{job.title}</h3>
                          <span className={`chip text-xs shrink-0 ${job.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {job.is_active ? "Active" : "Closed"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mb-2">
                          {(job.state || job.district) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {[job.district, job.state].filter(Boolean).join(", ")}
                            </span>
                          )}
                          {(job.salary_min != null || job.salary_max != null) && (
                            <span className="flex items-center gap-1">
                              <IndianRupee className="h-3.5 w-3.5" />
                              {formatSalary(job.salary_min)} – {formatSalary(job.salary_max)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(job.created_at)}
                          </span>
                        </div>
                        {job.required_skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {job.required_skills.map((s) => (
                              <span key={s} className="chip bg-brand-100 text-brand-700 text-xs">{s}</span>
                            ))}
                          </div>
                        )}

                        {(() => {
                          const s = jobStats.get(job.id);
                          if (!s) return null;
                          const avgMatch = s.count > 0 ? Math.round(s.sumMatch / s.count) : 0;
                          const progress =
                            s.count > 0 ? Math.min((s.hired / s.count) * 100, 100) : 0;
                          return (
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                              <span className="flex items-center gap-1 font-semibold text-slate-700">
                                <Users className="h-3.5 w-3.5 text-brand-500" />
                                {s.count} applicant{s.count !== 1 ? "s" : ""}
                              </span>
                              <span className="flex items-center gap-1">
                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                {avgMatch}% avg match
                              </span>
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                {s.hired} hired
                              </span>
                              {s.updatedAt && (
                                <span className="text-slate-400">
                                  Last application {timeAgo(s.updatedAt)}
                                </span>
                              )}
                              <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                  style={{ width: `${progress}%` }}
                                  title={`${s.hired}/${s.count} hired`}
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setActiveMenu(activeMenu === job.id ? null : job.id)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded-lg transition"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {activeMenu === job.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 glass rounded-xl py-1 z-20 shadow-lg animate-scale-in">
                            <Link
                              href="/employer/pipeline"
                              onClick={() => setActiveMenu(null)}
                              className="block px-4 py-2 text-sm text-slate-700 hover:bg-white/70 transition"
                            >
                              View Applicants
                            </Link>
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                setConfirmDeactivate(job);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                            >
                              {job.is_active ? "Deactivate" : "Reactivate"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Posting Modal */}
      <Modal open={modalOpen} title="Create Job Posting" onClose={() => !submitting && setModalOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Field
            label="Job Title"
            name="title"
            value={form.title}
            onChange={(v) => setForm({ ...form, title: v })}
            required
            placeholder="e.g. Junior Python Developer"
          />
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">State</span>
              <select
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="input-glass w-full"
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <Field
              label="District"
              name="district"
              value={form.district}
              onChange={(v) => setForm({ ...form, district: v })}
              placeholder="e.g. Bengaluru Urban"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Salary Min (₹/year)"
              name="salary_min"
              type="number"
              value={form.salary_min}
              onChange={(v) => setForm({ ...form, salary_min: v })}
              placeholder="400000"
            />
            <Field
              label="Salary Max (₹/year)"
              name="salary_max"
              type="number"
              value={form.salary_max}
              onChange={(v) => setForm({ ...form, salary_max: v })}
              placeholder="600000"
            />
          </div>
          <Field
            label="Required Skills"
            name="required_skills"
            value={form.required_skills}
            onChange={(v) => setForm({ ...form, required_skills: v })}
            placeholder="Python, SQL, Django (comma-separated)"
            hint="Separate skills with commas"
          />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost" disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-glass" disabled={submitting}>
              {submitting ? "Creating…" : "Create Posting"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Confirmation */}
      <Modal
        open={!!confirmDeactivate}
        title={confirmDeactivate?.is_active ? "Deactivate Posting?" : "Reactivate Posting?"}
        onClose={() => setConfirmDeactivate(null)}
        footer={
          <>
            <button onClick={() => setConfirmDeactivate(null)} className="btn-ghost">
              Cancel
            </button>
            <button
              onClick={() => confirmDeactivate && handleDeactivate(confirmDeactivate)}
              className="btn-glass"
            >
              {confirmDeactivate?.is_active ? "Deactivate" : "Reactivate"}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          {confirmDeactivate?.is_active
            ? `This will close "${confirmDeactivate?.title}" and stop showing it to candidates.`
            : `This will reopen "${confirmDeactivate?.title}" for new applications.`}
        </p>
      </Modal>

      {/* Click-away for menu */}
      {activeMenu && <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />}
    </div>
  );
}
