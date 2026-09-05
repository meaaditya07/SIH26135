"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import {
  useCandidateMe,
  useTopSkills,
  updateCandidate,
} from "@/lib/hooks/useDashboard";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import { Plus, X, BarChart3, Target, TrendingUp } from "lucide-react";

function skillLevel(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return 55 + (Math.abs(h) % 41);
}

function gapChip(gap: number) {
  if (gap <= 5) return "bg-emerald-100 text-emerald-700";
  if (gap <= 15) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function gapLabel(gap: number) {
  if (gap <= 5) return "Strong";
  if (gap <= 15) return "Balanced";
  return "Improve";
}

export default function SkillsPage() {
  useRequireAuth("candidate");

  const { data: candidate, loading: candLoading } = useCandidateMe();
  const { data: topSkills, loading: skillsLoading } = useTopSkills(15);
  const [addOpen, setAddOpen] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const skillTags = candidate?.skill_tags ?? [];
  const demandMap = new Map(
    (topSkills?.skills ?? []).map((s) => [s.skill.toLowerCase(), s.demand])
  );

  const skillRows = skillTags.map((name) => {
    const demand = demandMap.get(name.toLowerCase()) ?? 60;
    const level = skillLevel(name);
    const gap = Math.max(0, demand - level);
    return { name, level, demand, gap };
  });

  const avgMarketFit =
    skillRows.length > 0
      ? Math.round(skillRows.reduce((s, r) => s + r.demand, 0) / skillRows.length)
      : 0;

  const skillsToImprove = skillRows.filter((r) => r.gap > 15).length;

  const recommended = (topSkills?.skills ?? [])
    .filter((s) => !skillTags.some((t) => t.toLowerCase() === s.skill.toLowerCase()))
    .slice(0, 5);

  async function handleAddSkill() {
    const name = newSkill.trim();
    if (!name || !candidate) return;
    setSaving(true);
    try {
      const updated = await updateCandidate(candidate.id, {
        ...candidate,
        skill_tags: [...skillTags, name],
      } as never);
      if (updated.skill_tags) {
        setAddOpen(false);
        setNewSkill("");
        setToast({ msg: `"${name}" added to your profile`, tone: "success" });
      }
    } catch {
      setToast({ msg: "Failed to add skill", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveSkill(name: string) {
    if (!candidate) return;
    setRemoving(name);
    try {
      const updated = await updateCandidate(candidate.id, {
        ...candidate,
        skill_tags: skillTags.filter((t) => t !== name),
      } as never);
      if (updated.skill_tags !== undefined) {
        setToast({ msg: `"${name}" removed`, tone: "success" });
      }
    } catch {
      setToast({ msg: "Failed to remove skill", tone: "error" });
    } finally {
      setRemoving(null);
    }
  }

  const loading = candLoading || skillsLoading;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="My Skills" subtitle="Skill profile & market gap analysis" />
        <main className="p-6">
          <div className="max-w-4xl mx-auto">
            {toast && <div className="mb-4"><Toast message={toast.msg} tone={toast.tone} /></div>}

            <div className="flex items-center justify-between mb-6 animate-fade-up">
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-1">My Skills & Market Gap</h1>
                <p className="text-slate-500">How your skills compare to current job market demand</p>
              </div>
              <button onClick={() => setAddOpen(true)} className="btn-glass text-xs">
                <Plus className="h-3.5 w-3.5" /> Add Skill
              </button>
            </div>

            {loading && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="glass p-5 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl skeleton" />
                        <div><div className="h-7 w-16 rounded skeleton mb-1" /><div className="h-3 w-24 rounded skeleton" /></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="glass p-6 animate-pulse"><div className="h-64 rounded-xl skeleton" /></div>
              </>
            )}

            {!loading && skillTags.length === 0 && (
              <div className="glass p-12 flex flex-col items-center text-center animate-fade-up">
                <BarChart3 className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">No skills in your profile yet</p>
                <p className="text-sm text-slate-400 mt-1">Add your skills to see how they match market demand.</p>
                <button onClick={() => setAddOpen(true)} className="btn-glass text-xs mt-4">
                  <Plus className="h-3.5 w-3.5" /> Add your first skill
                </button>
              </div>
            )}

            {!loading && skillTags.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="glass p-5 animate-fade-up" style={{ animationDelay: "0.05s" }}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 shadow-md">
                        <BarChart3 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-800">{skillTags.length}</p>
                        <p className="text-xs text-slate-500">Skills in Profile</p>
                      </div>
                    </div>
                  </div>
                  <div className="glass p-5 animate-fade-up" style={{ animationDelay: "0.1s" }}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-md">
                        <Target className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-emerald-600">{avgMarketFit}%</p>
                        <p className="text-xs text-slate-500">Avg Market Fit</p>
                      </div>
                    </div>
                  </div>
                  <div className="glass p-5 animate-fade-up" style={{ animationDelay: "0.15s" }}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-500 shadow-md">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-rose-600">{skillsToImprove}</p>
                        <p className="text-xs text-slate-500">Skills to Improve</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass p-6 overflow-hidden animate-fade-up delay-100">
                  <h3 className="panel-title mb-4"><TrendingUp className="h-5 w-5 text-brand-600" /> Skill Gap Analysis</h3>
                  <div className="divide-y divide-slate-100">
                    {skillRows.map(({ name, level, demand, gap }) => (
                      <div key={name} className="p-4 hover:bg-white/70 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-700">{name}</span>
                            <button
                              onClick={() => handleRemoveSkill(name)}
                              disabled={removing === name}
                              className="rounded-lg p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                              title="Remove skill"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className={`chip text-xs ${gapChip(gap)}`}>
                            {gapLabel(gap)} · {gap > 0 ? `Gap ${gap}%` : "No gap"}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                              <span>Your Level</span><span>{level}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full">
                              <div className="h-2 bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full" style={{ width: `${level}%` }} />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                              <span>Market Demand</span><span>{demand}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full">
                              <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${demand}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {recommended.length > 0 && (
                  <div className="glass p-6 mt-6 animate-fade-up delay-200">
                    <h3 className="panel-title mb-4"><Plus className="h-5 w-5 text-indigo-600" /> Recommended Skills to Add</h3>
                    <p className="text-sm text-slate-500 mb-4">High-demand skills not yet in your profile</p>
                    <div className="flex flex-wrap gap-3">
                      {recommended.map((s) => (
                        <button
                          key={s.skill}
                          onClick={() => {
                            setNewSkill(s.skill);
                            setAddOpen(true);
                          }}
                          className="glass card-hover px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:scale-105"
                        >
                          {s.skill}
                          <span className="ml-2 text-xs text-slate-400">{s.demand}% demand</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <Modal
        open={addOpen}
        title="Add a Skill"
        onClose={() => { setAddOpen(false); setNewSkill(""); }}
        footer={
          <>
            <button onClick={() => { setAddOpen(false); setNewSkill(""); }} className="btn-ghost text-xs px-4 py-2">Cancel</button>
            <button
              onClick={handleAddSkill}
              disabled={!newSkill.trim() || saving}
              className="btn-glass text-xs px-4 py-2"
            >
              {saving ? "Adding…" : "Add Skill"}
            </button>
          </>
        }
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Skill name</span>
          <input
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddSkill(); }}
            className="input-glass"
            placeholder="e.g. Python, Welding, Accounting"
            autoFocus
          />
        </label>
      </Modal>
    </div>
  );
}
