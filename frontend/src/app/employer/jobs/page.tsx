"use client";

import { useState } from "react";
import { Plus, MoreHorizontal } from "lucide-react";

export default function JobsPage() {
  const [showForm, setShowForm] = useState(false);
  const [jobs, setJobs] = useState([
    { id: "j1", title: "Junior Python Developer", status: "active", applicants: 12, posted: "2026-08-01", location: "Bengaluru" },
    { id: "j2", title: "Data Analyst", status: "active", applicants: 18, posted: "2026-08-05", location: "Pune" },
    { id: "j3", title: "Python Developer - ML", status: "active", applicants: 8, posted: "2026-08-10", location: "Bengaluru" },
    { id: "j4", title: "IT Support Engineer", status: "closed", applicants: 25, posted: "2026-07-15", location: "Chennai" },
  ]);

  const [form, setForm] = useState({
    title: "",
    location: "",
    requiredSkills: "",
    salaryMin: "",
    salaryMax: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJobs([
      ...jobs,
      {
        id: `j${jobs.length + 1}`,
        title: form.title,
        status: "active",
        applicants: 0,
        posted: "2026-09-02",
        location: form.location,
      },
    ]);
    setShowForm(false);
    setForm({ title: "", location: "", requiredSkills: "", salaryMin: "", salaryMax: "" });
  };

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-1">Job Postings</h1>
            <p className="text-slate-500">Create and manage job listings</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> New Posting
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border bg-white shadow-sm p-6 mb-8"
          >
            <h3 className="font-semibold text-slate-800 mb-4">Create Job Posting</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Job Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="e.g. Junior Python Developer"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Location</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="e.g. Bengaluru"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Required Skills (comma-separated)</label>
                <input
                  value={form.requiredSkills}
                  onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="e.g. Python, SQL, Django"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Salary Min</label>
                  <input
                    type="number"
                    value={form.salaryMin}
                    onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="400000"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Salary Max</label>
                  <input
                    type="number"
                    value={form.salaryMax}
                    onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="600000"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
              >
                Create Posting
              </button>
            </div>
          </form>
        )}

        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-4 py-3 text-left font-medium text-slate-600">Job Title</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Location</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Applicants</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Posted</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{j.title}</td>
                  <td className="px-4 py-3 text-slate-600">{j.location}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{j.applicants}</td>
                  <td className="px-4 py-3 text-slate-500">{j.posted}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      j.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {j.status}
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
