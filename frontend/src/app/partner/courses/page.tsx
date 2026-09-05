"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import {
  useCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} from "@/lib/hooks/useDashboard";
import type { CourseListItem } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import Field from "@/components/ui/Field";
import Toast from "@/components/ui/Toast";
import { Plus, MoreHorizontal, Trash2, Pencil, BookOpen, Clock } from "lucide-react";

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-4 animate-pulse rounded" />
        </td>
      ))}
    </tr>
  );
}

interface CourseForm {
  name: string;
  sector: string;
  duration_weeks: string;
  skills_taught: string;
  scheme_id: string;
  cost_per_candidate: string;
  training_partner_id: string;
}

const EMPTY_FORM: CourseForm = {
  name: "",
  sector: "",
  duration_weeks: "",
  skills_taught: "",
  scheme_id: "",
  cost_per_candidate: "",
  training_partner_id: "",
};

export default function CoursesPage() {
  useRequireAuth("training_partner");

  const { data: courses, loading } = useCourses(50, 0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const set = useCallback((key: keyof CourseForm, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(c: CourseListItem) {
    setEditId(c.id);
    setForm({
      name: c.name,
      sector: c.sector,
      duration_weeks: String(c.duration_weeks),
      skills_taught: c.skills_taught.join(", "),
      scheme_id: c.scheme_id ?? "",
      cost_per_candidate: c.cost_per_candidate != null ? String(c.cost_per_candidate) : "",
      training_partner_id: c.training_partner_id,
    });
    setModalOpen(true);
    setActionMenu(null);
  }

  async function handleSubmit() {
    if (!form.name || !form.sector || !form.duration_weeks) return;
    setSaving(true);
    try {
      const payload = {
        training_partner_id: form.training_partner_id || courses[0]?.training_partner_id || "00000000-0000-0000-0000-000000000000",
        name: form.name,
        sector: form.sector,
        duration_weeks: Number(form.duration_weeks),
        skills_taught: form.skills_taught
          ? form.skills_taught.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        scheme_id: form.scheme_id || null,
        cost_per_candidate: form.cost_per_candidate ? Number(form.cost_per_candidate) : null,
      };

      if (editId) {
        await updateCourse(editId, payload);
        setToast({ message: "Course updated successfully", tone: "success" });
      } else {
        await createCourse(payload);
        setToast({ message: "Course created successfully", tone: "success" });
      }
      setModalOpen(false);
    } catch {
      setToast({ message: editId ? "Failed to update course" : "Failed to create course", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setConfirmDelete(null);
    setActionMenu(null);
    try {
      await deleteCourse(id);
      setToast({ message: "Course deleted", tone: "success" });
    } catch {
      setToast({ message: "Failed to delete course (may have enrollments)", tone: "error" });
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Courses" subtitle="Manage your training programs" />
        <main className="space-y-6 p-6">
          {toast && (
            <div className="animate-fade-in">
              <Toast message={toast.message} tone={toast.tone} />
            </div>
          )}

          <div className="flex items-center justify-between animate-fade-up">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">My Courses</h1>
              <p className="text-sm text-slate-500">
                {loading ? "Loading..." : `${courses.length} course${courses.length !== 1 ? "s" : ""} total`}
              </p>
            </div>
            <button onClick={openAdd} className="btn-glass flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Course
            </button>
          </div>

          <div className="glass p-6 overflow-hidden animate-fade-up delay-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Course Name</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Sector</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Duration</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Skills</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">Cost</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Scheme</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : courses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                      <p className="font-medium text-slate-500">No courses yet</p>
                      <p className="mt-1 text-sm text-slate-400">Create your first training program to get started.</p>
                      <button onClick={openAdd} className="btn-glass mt-4 inline-flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Add Course
                      </button>
                    </td>
                  </tr>
                ) : (
                  courses.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 hover:bg-white/70 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                      <td className="px-4 py-3">
                        <span className="chip bg-indigo-100 text-indigo-700 text-xs">{c.sector}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {c.duration_weeks} weeks
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {c.skills_taught.slice(0, 3).map((skill) => (
                            <span key={skill} className="chip bg-slate-100 text-slate-600 text-[11px]">
                              {skill}
                            </span>
                          ))}
                          {c.skills_taught.length > 3 && (
                            <span className="chip bg-slate-100 text-slate-400 text-[11px]">
                              +{c.skills_taught.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {c.cost_per_candidate != null
                          ? `\u20B9${c.cost_per_candidate.toLocaleString()}`
                          : "\u2014"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500 font-mono">
                          {c.scheme_id ? c.scheme_id.slice(0, 12) : "\u2014"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(c.created_at).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 relative">
                        <button
                          onClick={() => setActionMenu(actionMenu === c.id ? null : c.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {actionMenu === c.id && (
                          <div className="absolute right-4 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-scale-in">
                            <button
                              onClick={() => openEdit(c)}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => { setConfirmDelete(c.id); setActionMenu(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Modal
            open={modalOpen}
            title={editId ? "Edit Course" : "Add Course"}
            onClose={() => setModalOpen(false)}
            footer={
              <>
                <button onClick={() => setModalOpen(false)} className="btn-ghost text-sm">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving || !form.name || !form.sector || !form.duration_weeks}
                  className="btn-glass text-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : editId ? "Update" : "Create"}
                </button>
              </>
            }
          >
            <div className="space-y-4">
              <Field
                label="Course Name"
                name="name"
                value={form.name}
                onChange={(v) => set("name", v)}
                required
                placeholder="e.g. Python Programming"
              />
              <Field
                label="Sector"
                name="sector"
                value={form.sector}
                onChange={(v) => set("sector", v)}
                required
                placeholder="e.g. IT, Marketing"
              />
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Duration (weeks)"
                  name="duration_weeks"
                  value={form.duration_weeks}
                  onChange={(v) => set("duration_weeks", v)}
                  type="number"
                  required
                  placeholder="e.g. 24"
                />
                <Field
                  label="Cost per Candidate (\u20B9)"
                  name="cost_per_candidate"
                  value={form.cost_per_candidate}
                  onChange={(v) => set("cost_per_candidate", v)}
                  type="number"
                  placeholder="e.g. 5000"
                />
              </div>
              <Field
                label="Skills Taught"
                name="skills_taught"
                value={form.skills_taught}
                onChange={(v) => set("skills_taught", v)}
                placeholder="Comma-separated, e.g. Python, SQL, Flask"
                hint="Separate multiple skills with commas"
              />
              <Field
                label="Scheme ID"
                name="scheme_id"
                value={form.scheme_id}
                onChange={(v) => set("scheme_id", v)}
                placeholder="e.g. PMKVY 4.0"
              />
            </div>
          </Modal>

          <Modal
            open={confirmDelete !== null}
            title="Delete Course"
            onClose={() => setConfirmDelete(null)}
            footer={
              <>
                <button onClick={() => setConfirmDelete(null)} className="btn-ghost text-sm">
                  Cancel
                </button>
                <button
                  onClick={() => confirmDelete && handleDelete(confirmDelete)}
                  className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </>
            }
          >
            <p className="text-sm text-slate-600">
              Are you sure you want to delete this course? This action cannot be undone. Courses with existing enrollments cannot be deleted.
            </p>
          </Modal>
        </main>
      </div>
    </div>
  );
}
