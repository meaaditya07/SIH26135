"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import {
  Users, BookOpen, Building2, GraduationCap, Briefcase, Landmark,
  Plus, Pencil, Trash2, ArrowLeft, RefreshCw, Search, CheckCircle2, ShieldCheck,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import Field from "@/components/ui/Field";
import Toast from "@/components/ui/Toast";
import {
  useCandidates, useCourses, useEmployers, useTrainingPartners,
  useEnrollments, useJobPostings,
  createCandidate, updateCandidate, deactivateCandidate,
  createCourse, updateCourse, deleteCourse,
  createEmployer, updateEmployer, deleteEmployer,
  createTrainingPartner, updateTrainingPartner, deleteTrainingPartner, approveTrainingPartner,
  createEnrollment, updateEnrollment, deleteEnrollment,
  createJobPosting, updateJobPosting, deactivateJobPosting,
} from "@/lib/hooks/useDashboard";
import type {
  CandidateListItem, CourseListItem, EmployerListItem,
  TrainingPartnerListItem, EnrollmentListItem, JobPostingListItem,
} from "@/lib/types";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";

type EntityKey = "candidates" | "courses" | "employers" | "partners" | "enrollments" | "jobs";

interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "number" | "date";
  required?: boolean;
  placeholder?: string;
}

interface EntityConfig {
  key: EntityKey;
  label: string;
  icon: typeof Users;
  tint: string;
  fetch: () => { data: any[]; loading: boolean };
  create: (p: any) => Promise<any>;
  update: (id: string, p: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
  fields: FieldDef[];
  rowKey: string;
  display: (row: any) => string;
}

export default function ManagePage() {
  useRequireAuth("gov_admin");
  const [tab, setTab] = useState<EntityKey>("candidates");
  const [refreshKey, setRefreshKey] = useState(0);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; row?: any } | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const hookResults: Record<EntityKey, any> = {
    candidates: useCandidates(200, 0),
    courses: useCourses(200, 0),
    employers: useEmployers(200, 0),
    partners: useTrainingPartners(200, 0),
    enrollments: useEnrollments(200, 0),
    jobs: useJobPostings(200, 0),
  };

  const configs: Record<EntityKey, EntityConfig> = {
    candidates: {
      key: "candidates", label: "Candidates", icon: Users, tint: "from-brand-500 to-indigo-500",
      fetch: () => hookResults.candidates,
      create: createCandidate, update: updateCandidate, delete: deactivateCandidate,
      rowKey: "id",
      display: (r: CandidateListItem) => r.full_name,
      fields: [
        { key: "full_name", label: "Full Name", required: true },
        { key: "phone", label: "Phone", required: true, placeholder: "10-digit mobile" },
        { key: "aadhaar_number", label: "Aadhaar Number", required: true, placeholder: "12 digits" },
        { key: "email", label: "Email" },
        { key: "state", label: "State" },
        { key: "district", label: "District" },
        { key: "gender", label: "Gender" },
        { key: "pincode", label: "PIN Code" },
      ],
    },
    courses: {
      key: "courses", label: "Courses", icon: BookOpen, tint: "from-sky-500 to-cyan-500",
      fetch: () => hookResults.courses,
      create: createCourse, update: updateCourse, delete: deleteCourse,
      rowKey: "id",
      display: (r: CourseListItem) => r.name,
      fields: [
        { key: "training_partner_id", label: "Training Partner ID", required: true },
        { key: "name", label: "Course Name", required: true },
        { key: "sector", label: "Sector", required: true },
        { key: "duration_weeks", label: "Duration (weeks)", type: "number", required: true },
        { key: "scheme_id", label: "Scheme ID" },
        { key: "cost_per_candidate", label: "Cost per Candidate", type: "number" },
        { key: "ncvt_code", label: "NCVT Code" },
        { key: "skills_taught", label: "Skills (comma separated)" },
      ],
    },
    employers: {
      key: "employers", label: "Employers", icon: Building2, tint: "from-violet-500 to-fuchsia-500",
      fetch: () => hookResults.employers,
      create: createEmployer, update: updateEmployer, delete: deleteEmployer,
      rowKey: "id",
      display: (r: EmployerListItem) => r.name,
      fields: [
        { key: "name", label: "Company Name", required: true },
        { key: "industry", label: "Industry" },
        { key: "state", label: "State" },
        { key: "district", label: "District" },
        { key: "website", label: "Website" },
        { key: "contact_person", label: "Contact Person" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
      ],
    },
    partners: {
      key: "partners", label: "Training Partners", icon: Landmark, tint: "from-emerald-500 to-teal-500",
      fetch: () => hookResults.partners,
      create: createTrainingPartner, update: updateTrainingPartner, delete: deleteTrainingPartner,
      rowKey: "id",
      display: (r: TrainingPartnerListItem) => r.name,
      fields: [
        { key: "name", label: "Partner Name", required: true },
        { key: "registration_number", label: "Registration #", required: true },
        { key: "state", label: "State", required: true },
        { key: "district", label: "District", required: true },
        { key: "pan_number", label: "PAN" },
        { key: "contact_person", label: "Contact Person" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "address", label: "Address" },
      ],
    },
    enrollments: {
      key: "enrollments", label: "Enrollments", icon: GraduationCap, tint: "from-orange-500 to-amber-500",
      fetch: () => hookResults.enrollments,
      create: createEnrollment, update: updateEnrollment, delete: deleteEnrollment,
      rowKey: "id",
      display: (r: EnrollmentListItem) => r.id.slice(0, 8),
      fields: [
        { key: "candidate_id", label: "Candidate ID", required: true },
        { key: "course_id", label: "Course ID", required: true },
        { key: "training_partner_id", label: "Training Partner ID", required: true },
        { key: "enrollment_date", label: "Enrollment Date", type: "date", required: true },
      ],
    },
    jobs: {
      key: "jobs", label: "Job Postings", icon: Briefcase, tint: "from-rose-500 to-red-500",
      fetch: () => hookResults.jobs,
      create: createJobPosting, update: updateJobPosting, delete: deactivateJobPosting,
      rowKey: "id",
      display: (r: JobPostingListItem) => r.title,
      fields: [
        { key: "title", label: "Job Title", required: true },
        { key: "employer_id", label: "Employer ID" },
        { key: "state", label: "State" },
        { key: "district", label: "District" },
        { key: "salary_min", label: "Min Salary", type: "number" },
        { key: "salary_max", label: "Max Salary", type: "number" },
        { key: "required_skills", label: "Required Skills (comma separated)" },
        { key: "preferred_skills", label: "Preferred Skills (comma separated)" },
        { key: "description_raw", label: "Description" },
      ],
    },
  };

  const cfg = configs[tab];
  const { data, loading } = cfg.fetch();

  const filtered = data.filter((row) => {
    if (!query) return true;
    const hay = Object.values(row).join(" ").toLowerCase();
    return hay.includes(query.toLowerCase());
  });

  const flash = (message: string, tone: "success" | "error" = "success") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3500);
  };

  const openCreate = () => {
    const initial: Record<string, string> = {};
    cfg.fields.forEach((f) => { initial[f.key] = ""; });
    setForm(initial);
    setModal({ mode: "create" });
  };

  const openEdit = (row: any) => {
    const initial: Record<string, string> = {};
    cfg.fields.forEach((f) => {
      const v = row[f.key];
      initial[f.key] = Array.isArray(v) ? v.join(", ") : v != null ? String(v) : "";
    });
    setForm(initial);
    setModal({ mode: "edit", row });
  };

  const handleSubmit = async () => {
    setPending(true);
    try {
      const payload: Record<string, any> = {};
      cfg.fields.forEach((f) => {
        const raw = (form[f.key] ?? "").trim();
        const isNumber = f.type === "number";
        const isListField = /skills|description/i.test(f.key) && !isNumber;
        if (isNumber) payload[f.key] = raw === "" ? null : Number(raw);
        else if (isListField && /skills/i.test(f.key)) payload[f.key] = raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
        else payload[f.key] = raw === "" ? null : raw;
      });

      if (modal?.mode === "create") {
        await cfg.create(payload);
        flash(`${cfg.label.slice(0, -1)} created successfully`);
      } else if (modal?.row) {
        await cfg.update(modal.row[cfg.rowKey], payload);
        flash(`${cfg.label.slice(0, -1)} updated successfully`);
      }
      setModal(null);
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      flash(e?.response?.data?.detail || "Operation failed", "error");
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async (row: any) => {
    if (!confirm(`Delete this ${cfg.label.slice(0, -1).toLowerCase()}? This may be restricted if it has related records.`)) return;
    try {
      await cfg.delete(row[cfg.rowKey]);
      flash(`${cfg.label.slice(0, -1)} deleted/deactivated`);
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      flash(e?.response?.data?.detail || "Delete failed", "error");
    }
  };

  const tabs: { key: EntityKey; label: string; icon: typeof Users; count: number }[] = [
    { key: "candidates", label: "Candidates", icon: Users, count: hookResults.candidates.data.length },
    { key: "courses", label: "Courses", icon: BookOpen, count: hookResults.courses.data.length },
    { key: "employers", label: "Employers", icon: Building2, count: hookResults.employers.data.length },
    { key: "partners", label: "Training Partners", icon: Landmark, count: hookResults.partners.data.length },
    { key: "enrollments", label: "Enrollments", icon: GraduationCap, count: hookResults.enrollments.data.length },
    { key: "jobs", label: "Job Postings", icon: Briefcase, count: hookResults.jobs.data.length },
  ];

  const HeaderIcon = cfg.icon;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Content Management" subtitle="Edit, add, and remove everything from the portal" />
        <main className="space-y-6 p-6">
          <div className="flex items-center justify-between animate-fade-up">
            <Link href="/gov" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
            <button onClick={() => { setRefreshKey((k) => k + 1); flash("Data refreshed"); }} className="btn-ghost">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>

          {toast && (
            <div className="fixed bottom-4 right-4 z-50">
              <Toast message={toast.message} tone={toast.tone} />
            </div>
          )}

          <div className="glass p-6 animate-fade-up">
            <div className="flex flex-wrap items-center gap-3">
              {tabs.map(({ key, label, icon: Icon, count }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                    tab === key
                      ? "border-transparent bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-600/25"
                      : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white hover:shadow-md"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${tab === key ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="glass p-6 animate-fade-up delay-100">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${cfg.tint} shadow-md`}>
                  <HeaderIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{cfg.label}</h2>
                  <p className="text-sm text-slate-500">{filtered.length} records</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search..."
                    className="input-glass pl-9"
                  />
                </div>
                <button onClick={openCreate} className="btn-glass">
                  <Plus className="h-4 w-4" /> Add {cfg.label.slice(0, -1)}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="glass-inner skeleton h-24 rounded-xl" />
                  ))
                : filtered.map((row) => (
                    <div key={row[cfg.rowKey]} className="glass-inner flex items-center justify-between gap-3 p-4 transition hover:bg-white">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">{cfg.display(row)}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {Object.entries(row)
                            .filter(([k, v]) =>
                              k !== cfg.rowKey && ["full_name", "name", "title", "industry", "sector", "state"].includes(k) && v
                            )
                            .slice(0, 3)
                            .map(([k, v]) => (
                              <span key={k} className="chip bg-slate-100 text-slate-500">{String(v)}</span>
                            ))}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button onClick={() => openEdit(row)} className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(row)} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              {!loading && filtered.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400">
                  <ShieldCheck className="mx-auto mb-2 h-10 w-10" />
                  <p>No {cfg.label.toLowerCase()} found.</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass p-4 text-center text-xs text-slate-400 animate-fade-up delay-200">
            Tip: Editing here updates the live portal instantly. Deletion is blocked for records with dependent children.
          </div>

          <Modal
            open={!!modal}
            onClose={() => setModal(null)}
            title={modal?.mode === "create" ? `Add ${cfg.label.slice(0, -1)}` : `Edit ${cfg.display(modal?.row ?? {} as any)}`}
            subtitle={modal?.mode === "create" ? "Create a new record" : "Update the fields below"}
            footer={
              <>
                <button onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
                <button onClick={handleSubmit} disabled={pending} className="btn-glass">
                  {pending ? "Saving..." : modal?.mode === "create" ? "Create" : "Save Changes"}
                </button>
              </>
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {cfg.fields.map((f) => (
                <div key={f.key} className={f.key.includes("description") ? "sm:col-span-2" : ""}>
                  <Field
                    label={f.label}
                    name={f.key}
                    type={f.type ?? "text"}
                    value={form[f.key]}
                    onChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                    required={f.required}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
            </div>
          </Modal>
        </main>
      </div>
    </div>
  );
}
