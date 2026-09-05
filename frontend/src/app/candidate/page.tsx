"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  usePlacementScore,
  useMyApplications,
  useMyNotifications,
  useCandidateJobMatches,
  useTopSkills,
  useOutcomeTimeline,
  useCourses,
  updateCandidate,
} from "@/lib/hooks/useDashboard";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import type { CandidateListItem, CourseListItem, JobApplication, TopSkill } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import Field from "@/components/ui/Field";
import Toast from "@/components/ui/Toast";
import {
  Target,
  ShieldCheck,
  Sparkles,
  Briefcase,
  History,
  ArrowUpRight,
  Pencil,
  FileText,
  Bell,
  MapPin,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  UserCheck,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Map,
  Zap,
  Award,
  CircleDot,
  Check,
  ChevronRight,
  X,
  ArrowRight,
  GraduationCap,
  CalendarDays,
} from "lucide-react";
import { formatISODateTime } from "@/lib/utils";

const ONBOARDING_SESSION_KEY = "onboarding-dismissed";

const ONBOARDING_SKILLS = [
  "Python", "Django", "React", "SQL", "AWS", "JavaScript", "Node.js",
  "Data Science", "Excel", "Tally", "Digital Marketing", "Healthcare",
  "CNC", "Accounting", "Customer Service", "English",
];

const JOB_ALERT_STATES = [
  "Andhra Pradesh", "Bihar", "Delhi", "Gujarat", "Haryana",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Punjab",
  "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal",
];

function useCountUp(target: number, duration = 800, active = true) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active || target === 0) { setCount(target); return; }
    let start = 0;
    const step = Math.max(1, Math.ceil(target / (duration / 16)));
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(id); }
      else setCount(start);
    }, 16);
    return () => clearInterval(id);
  }, [target, duration, active]);
  return count;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  applied:      { bg: "bg-indigo-100",   text: "text-indigo-700",   icon: FileText },
  shortlisted:  { bg: "bg-amber-100",   text: "text-amber-700",   icon: Star },
  interview:    { bg: "bg-purple-100",   text: "text-purple-700",  icon: Clock },
  offered:      { bg: "bg-sky-100",      text: "text-sky-700",     icon: CheckCircle2 },
  hired:        { bg: "bg-emerald-100",  text: "text-emerald-700", icon: UserCheck },
  rejected:     { bg: "bg-rose-100",     text: "text-rose-700",    icon: XCircle },
};

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { bg: "bg-slate-100", text: "text-slate-600", icon: FileText };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function interviewCountdown(iso: string): { label: string; tone: string } {
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return { label: "Finished", tone: "bg-slate-100 text-slate-500" };
  if (days === 0) return { label: "Today", tone: "bg-violet-100 text-violet-700 ring-1 ring-violet-200" };
  if (days === 1) return { label: "Tomorrow", tone: "bg-violet-100 text-violet-700 ring-1 ring-violet-200" };
  return { label: `In ${days} days`, tone: "bg-violet-50 text-violet-600" };
}

/* ═══════════════════════════════════════════════
   Onboarding Wizard
   ═══════════════════════════════════════════════ */

function isProfileIncomplete(c: CandidateListItem | null): boolean {
  if (!c) return false;
  if (!c.state?.trim()) return true;
  if (!c.district?.trim()) return true;
  const pincode = (c as unknown as Record<string, string>).pincode;
  if (!pincode?.trim()) return true;
  if ((c.skill_tags?.length ?? 0) < 3) return true;
  if (!c.email?.trim()) return true;
  return false;
}

interface OnboardingWizardProps {
  candidate: CandidateListItem;
  onComplete: () => void;
  onDismiss: () => void;
}

function OnboardingWizard({ candidate, onComplete, onDismiss }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [fullName] = useState(candidate.full_name ?? "");
  const [email, setEmail] = useState(candidate.email ?? "");
  const [state, setState] = useState(candidate.state ?? "");
  const [district, setDistrict] = useState(candidate.district ?? "");
  const [pincode, setPincode] = useState(
    (candidate as unknown as Record<string, string>).pincode ?? "",
  );

  const existingSkills = useMemo(() => {
    const raw = candidate.skill_tags ?? [];
    return new Set(raw.filter((s) => ONBOARDING_SKILLS.includes(s)));
  }, [candidate]);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(existingSkills);

  const [allowContact, setAllowContact] = useState(
    candidate.allow_employer_contact !== false,
  );

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return next;
    });
  };

  const step2Valid = selectedSkills.size >= 3;

  const stepLabels = ["Personal", "Skills", "Visibility"];

  const handleFinish = async () => {
    setSaving(true);
    try {
      await updateCandidate(candidate.id, {
        email: email || null,
        full_name: fullName,
        state: state || null,
        district: district || null,
        pincode: pincode || null,
        skill_tags: Array.from(selectedSkills),
        allow_employer_contact: allowContact,
      } as unknown as Parameters<typeof updateCandidate>[1]);
      onComplete();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in" />

      <button
        onClick={onDismiss}
        className="absolute right-6 top-6 z-[101] flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-400 backdrop-blur-sm transition-all hover:bg-white/10 hover:text-slate-200"
      >
        I&apos;ll do this later
        <X className="h-4 w-4" />
      </button>

      <div className="relative z-[101] w-full max-w-lg animate-scale-in rounded-2xl border border-white/15 bg-[#151c35]/95 p-8 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="mb-2 text-center">
          <h2 className="bg-gradient-to-r from-violet-300 to-brand-200 bg-clip-text text-xl font-bold text-transparent">
            Complete Your Profile
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            A few details help us find the best opportunities for you.
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-3 my-5">
          {stepLabels.map((label, i) => {
            const num = i + 1;
            const active = num === step;
            const done = num < step;
            return (
              <div key={label} className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                      done
                        ? "bg-emerald-500 text-white"
                        : active
                        ? "bg-gradient-to-r from-brand-500 to-violet-500 text-white shadow-lg shadow-brand-500/30"
                        : "bg-white/10 text-slate-500"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : num}
                  </div>
                  <span
                    className={`text-[11px] font-medium ${
                      active ? "text-violet-300" : done ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div
                    className={`mb-5 h-0.5 w-10 rounded-full transition-all duration-300 ${
                      done ? "bg-emerald-500" : "bg-white/10"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="min-h-[260px] mt-4">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <Field
                label="Full Name"
                name="onb_full_name"
                value={fullName}
                onChange={() => {}}
                required
                placeholder="Your full name"
              />
              <p className="text-xs text-slate-500 -mt-2 ml-0.5">Read-only from your account</p>
              <Field
                label="Email"
                name="onb_email"
                value={email}
                onChange={setEmail}
                placeholder="email@example.com"
              />
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="State"
                  name="onb_state"
                  value={state}
                  onChange={setState}
                  required
                  placeholder="e.g. Maharashtra"
                />
                <Field
                  label="District"
                  name="onb_district"
                  value={district}
                  onChange={setDistrict}
                  required
                  placeholder="e.g. Pune"
                />
              </div>
              <Field
                label="Pincode"
                name="onb_pincode"
                value={pincode}
                onChange={setPincode}
                required
                placeholder="e.g. 411001"
              />
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-300">
                  Select your skills
                </p>
                <span className="text-xs text-slate-500">
                  {selectedSkills.size} selected · 3+ recommended
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ONBOARDING_SKILLS.map((skill) => {
                  const active = selectedSkills.has(skill);
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-gradient-to-r from-brand-500 to-violet-500 text-white shadow-md shadow-brand-500/25"
                          : "border border-white/10 bg-white/5 text-slate-400 hover:border-violet-300/40 hover:text-violet-300"
                      }`}
                    >
                      {active && <Check className="inline h-3 w-3 mr-1 -mt-0.5" />}
                      {skill}
                    </button>
                  );
                })}
              </div>
              {!step2Valid && (
                <p className="mt-3 text-xs text-amber-400/80">
                  Select at least 3 skills to continue.
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in space-y-5">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-200">
                      Contact visibility
                    </p>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                      When enabled, employers can see your phone number on job matches and
                      applications. Turn off to keep your contact private.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={allowContact}
                    onClick={() => setAllowContact((v) => !v)}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
                      allowContact
                        ? "bg-gradient-to-r from-brand-500 to-violet-500"
                        : "bg-slate-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                        allowContact ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2">
                  <ShieldCheck className={`h-4 w-4 ${allowContact ? "text-emerald-400" : "text-slate-500"}`} />
                  <span className="text-xs text-slate-400">
                    {allowContact
                      ? "Visible — employers can contact you directly"
                      : "Hidden — your phone number is private"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4">
                <p className="text-sm font-medium text-violet-300">All set!</p>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Click <span className="font-semibold text-violet-200">Finish</span> to save your profile.
                  You can always update these details from your dashboard.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/10">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-white/[0.06] hover:text-slate-200"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 2 && !step2Valid}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:brightness-110 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : "Finish"}
              {!saving && <Check className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Candidate Dashboard
   ═══════════════════════════════════════════════ */

export default function CandidateDashboard() {
  useRequireAuth("candidate");

  const [candidate, setCandidate] = useState<CandidateListItem | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    state: "",
    district: "",
    pincode: "",
    skill_tags: "",
    allow_employer_contact: true,
    preferred_job_states: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const [skillAlertDismissed, setSkillAlertDismissed] = useState(false);

  const [showOnboarding, setShowOnboarding] = useState(false);

  const candidateId = candidate?.id;

  const { data: score, loading: scoreLoading } = usePlacementScore(candidateId);
  const { data: applications, loading: appsLoading } = useMyApplications();
  const { data: notifications, loading: notifLoading } = useMyNotifications();
  const { data: jobMatches, loading: matchesLoading } = useCandidateJobMatches(candidateId);
  const { data: topSkills, loading: topSkillsLoading } = useTopSkills(15);
  const { data: courses, loading: coursesLoading } = useCourses(200);
  const { data: outcomeTimeline, loading: outcomeLoading } = useOutcomeTimeline(candidateId);

  const refreshProfile = useCallback(() => {
    setProfileLoading(true);
    api
      .get("/candidates/me")
      .then((res) => setCandidate(res.data))
      .catch(() => undefined)
      .finally(() => setProfileLoading(false));
  }, []);

  useEffect(() => { refreshProfile(); }, [refreshProfile]);

  useEffect(() => {
    if (profileLoading || !candidate) return;
    if (sessionStorage.getItem(ONBOARDING_SESSION_KEY)) return;
    if (isProfileIncomplete(candidate)) {
      setShowOnboarding(true);
    }
  }, [profileLoading, candidate]);

  const handleOnboardingComplete = useCallback(() => {
    setToast({ message: "Profile complete — welcome!", tone: "success" });
    setShowOnboarding(false);
    refreshProfile();
  }, [refreshProfile]);

  const handleOnboardingDismiss = useCallback(() => {
    sessionStorage.setItem(ONBOARDING_SESSION_KEY, "1");
    setShowOnboarding(false);
  }, []);

  const openEdit = () => {
    if (!candidate) return;
    setEditForm({
      full_name: candidate.full_name ?? "",
      email: candidate.email ?? "",
      state: candidate.state ?? "",
      district: candidate.district ?? "",
      pincode: ((candidate as unknown as Record<string, string>).pincode) ?? "",
      skill_tags: (candidate.skill_tags ?? []).join(", "),
      allow_employer_contact: candidate.allow_employer_contact !== false,
      preferred_job_states: candidate.preferred_job_states ?? [],
    });
    setEditOpen(true);
  };

  const togglePreferredState = (state: string) => {
    setEditForm((f) => ({
      ...f,
      preferred_job_states: f.preferred_job_states.includes(state)
        ? f.preferred_job_states.filter((s) => s !== state)
        : [...f.preferred_job_states, state],
    }));
  };

  const jobAlertStateOptions = useMemo(() => {
    const set = new Set<string>(JOB_ALERT_STATES);
    if (candidate?.state?.trim()) set.add(candidate.state.trim());
    return Array.from(set);
  }, [candidate]);

  const handleSave = async () => {
    if (!candidateId) return;
    setSaving(true);
    try {
      await updateCandidate(candidateId, {
        phone: candidate?.phone ?? "",
        full_name: editForm.full_name,
        email: editForm.email || null,
        state: editForm.state || null,
        district: editForm.district || null,
        pincode: editForm.pincode || null,
        allow_employer_contact: editForm.allow_employer_contact,
        preferred_job_states: editForm.preferred_job_states,
      });
      setToast({ message: "Profile updated successfully", tone: "success" });
      setEditOpen(false);
      refreshProfile();
    } catch {
      setToast({ message: "Failed to update profile", tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const pct = score?.score_pct ?? 0;
  const tone =
    pct >= 70 ? "text-emerald-600" : pct >= 45 ? "text-amber-600" : "text-rose-600";
  const barTone =
    pct >= 70 ? "from-emerald-500 to-teal-500" : pct >= 45 ? "from-amber-500 to-yellow-500" : "from-rose-500 to-red-500";
  const ringTone =
    pct >= 70 ? "stroke-emerald-500" : pct >= 45 ? "stroke-amber-500" : "stroke-rose-500";

  const appCount = applications.length;
  const notifCount = notifications.filter((n) => !n.read_at).length;
  const skillCount = candidate?.skill_tags?.length ?? 0;

  const displayApps = useCountUp(appCount, 600, !appsLoading);
  const displayNotifs = useCountUp(notifCount, 600, !notifLoading);
  const displaySkills = useCountUp(skillCount, 600, !profileLoading);

  const recentApps = [...applications]
    .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime())
    .slice(0, 3);

  const nextInterview = useMemo(
    () =>
      applications
        .filter((a) => a.status === "interview" && a.interview_at)
        .sort((x, y) => new Date(x.interview_at!).getTime() - new Date(y.interview_at!).getTime())[0],
    [applications],
  );
  const offeredPending = applications.filter((a) => a.status === "offered").length;
  const hiredCount = applications.filter((a) => a.status === "hired").length;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const navCards = [
    { href: "/candidate/verification", title: "Identity Verification", desc: "DigiLocker document verification status", icon: ShieldCheck, tint: "from-amber-500 to-orange-500", tag: "Pending", tagTone: "bg-amber-100 text-amber-700" },
    { href: "/candidate/skills", title: "My Skills", desc: "View skill gaps and market demand", icon: Sparkles, tint: "from-brand-500 to-indigo-500" },
    { href: "/candidate/matches", title: "Job Matches", desc: "Personalized job recommendations", icon: Briefcase, tint: "from-sky-500 to-cyan-500" },
    { href: "/candidate/progress", title: "My Progress", desc: "Training completion and survey history", icon: History, tint: "from-violet-500 to-fuchsia-500" },
    { href: "/candidate/applications", title: "My Applications", desc: "Track your job applications and statuses", icon: Layers, tint: "from-teal-500 to-emerald-500", badge: appCount || undefined },
    { href: "/candidate/notifications", title: "Notifications", desc: "Messages and updates from the platform", icon: Bell, tint: "from-rose-500 to-pink-500", badge: notifCount || undefined },
  ];

  /* ── Feature 5: Profile Completeness ── */
  const completeness = useMemo(() => {
    if (!candidate) return { pct: 0, checks: [] as { label: string; done: boolean }[] };
    const checks = [
      { label: "Full name", done: !!candidate.full_name?.trim() },
      { label: "Email", done: !!candidate.email?.trim() },
      { label: "State", done: !!candidate.state?.trim() },
      { label: "District", done: !!candidate.district?.trim() },
      { label: "At least 1 skill", done: (candidate.skill_tags?.length ?? 0) > 0 },
      { label: "DigiLocker verified", done: candidate.digilocker_status === "verified" },
    ];
    const done = checks.filter((c) => c.done).length;
    return { pct: Math.round((done / checks.length) * 100), checks };
  }, [candidate]);

  /* ── Feature 4: Skill Demand Gap ── */
  const missingSkills = useMemo(() => {
    if (!topSkills?.skills || !candidate?.skill_tags) return [];
    const have = new Set(candidate.skill_tags.map((s) => s.toLowerCase()));
    return topSkills.skills
      .filter((s) => !have.has(s.skill.toLowerCase()))
      .slice(0, 5);
  }, [topSkills, candidate]);

  /* ── Skill-Gap Courses: top 8 in-demand skills not yet in profile ── */
  const gapSkills = useMemo<TopSkill[]>(() => {
    if (!topSkills?.skills || !candidate?.skill_tags) return [];
    const have = new Set(candidate.skill_tags.map((s) => s.toLowerCase()));
    return topSkills.skills
      .filter((s) => !have.has(s.skill.toLowerCase()))
      .slice(0, 8);
  }, [topSkills, candidate]);

  const gapSkillNames = useMemo(() => {
    const set = new Set<string>();
    for (const s of gapSkills) set.add(s.skill.toLowerCase());
    return set;
  }, [gapSkills]);

  const rankedGapCourses = useMemo(() => {
    if (!courses || courses.length === 0 || gapSkillNames.size === 0) return [];
    const scored = courses
      .map((c) => {
        const covered = (c.skills_taught ?? []).filter((sk) =>
          gapSkillNames.has(sk.toLowerCase())
        );
        const demandWeight = covered.reduce((sum, sk) => {
          const top = gapSkills.find(
            (g) => g.skill.toLowerCase() === sk.toLowerCase()
          );
          return sum + (top?.demand ?? 1);
        }, 0);
        return { course: c, covered, matchCount: covered.length, demandWeight };
      })
      .filter((c) => c.matchCount > 0)
      .sort((a, b) =>
        b.matchCount === a.matchCount
          ? b.demandWeight - a.demandWeight
          : b.matchCount - a.matchCount
      )
      .slice(0, 5);
    return scored;
  }, [courses, gapSkillNames, gapSkills]);

  const gapCoursesLoading = profileLoading || topSkillsLoading || coursesLoading;

  const allLoading = profileLoading && scoreLoading && appsLoading && notifLoading;

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl">

        {showOnboarding && candidate && (
          <OnboardingWizard
            candidate={candidate}
            onComplete={handleOnboardingComplete}
            onDismiss={handleOnboardingDismiss}
          />
        )}

        {toast && (
          <div className="fixed right-6 top-6 z-[60]">
            <Toast message={toast.message} tone={toast.tone} />
          </div>
        )}

        {/* ── Welcome Banner ── */}
        <div className="glass p-6 mb-6 animate-fade-up">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {profileLoading ? (
                <Skeleton className="mb-2 h-8 w-64 rounded-lg" />
              ) : (
                <h1 className="text-2xl font-extrabold text-slate-900">
                  {greeting()}, <span className="gradient-text">{candidate?.full_name ?? "Candidate"}</span>
                </h1>
              )}
              <p className="mt-1 text-sm text-slate-500">Your skills, verification status, and job matches</p>
              {candidate && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  {candidate.state && (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{candidate.state}{candidate.district ? `, ${candidate.district}` : ""}</span>
                  )}
                  {candidate.skill_tags.length > 0 && (
                    <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{candidate.skill_tags.length} skills</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 self-start">
              {candidate && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    candidate.allow_employer_contact !== false
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {candidate.allow_employer_contact !== false
                    ? "Visible to employers"
                    : "Contact hidden"}
                </span>
              )}
              <button
                onClick={openEdit}
                disabled={profileLoading}
                className="btn-glass inline-flex items-center gap-2"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
          {[
            {
              label: "Applications",
              value: appsLoading ? null : displayApps,
              icon: FileText,
              gradient: "from-indigo-500 to-violet-500",
              delay: "delay-100",
            },
            {
              label: "Unread Notifications",
              value: notifLoading ? null : displayNotifs,
              icon: Bell,
              gradient: "from-rose-500 to-pink-500",
              delay: "delay-200",
            },
            {
              label: "Skills Listed",
              value: profileLoading ? null : displaySkills,
              icon: Sparkles,
              gradient: "from-amber-500 to-orange-500",
              delay: "delay-300",
            },
          ].map(({ label, value, icon: Icon, gradient, delay }) => (
            <div
              key={label}
              className={`glass glass-inner animate-fade-up ${delay} flex items-center gap-4 p-5`}
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-md`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
                {value === null ? (
                  <Skeleton className="mt-1 h-7 w-12 rounded" />
                ) : (
                  <p className="text-2xl font-extrabold text-slate-800">{value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Hiring Spotlight ── */}
        {!appsLoading && applications.length > 0 && (
          <div className="glass p-6 mb-6 animate-fade-up delay-100">
            <div className="flex items-center justify-between mb-4">
              <div className="panel-title">
                <CalendarDays className="h-5 w-5 text-violet-600" />
                Your Hiring Spotlight
              </div>
              <Link href="/candidate/applications" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                View applications
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Next interview */}
              <div className="glass-inner rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-violet-500" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Next interview</p>
                </div>
                {nextInterview ? (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-lg font-extrabold text-slate-800">{formatISODateTime(nextInterview.interview_at!)}</p>
                      <span className={`chip flex-shrink-0 text-[10px] ${interviewCountdown(nextInterview.interview_at!).tone}`}>
                        {interviewCountdown(nextInterview.interview_at!).label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">Application #{nextInterview.id.slice(0, 8)}</p>
                    {nextInterview.interview_note && (
                      <p className="mt-1.5 line-clamp-1 text-[11px] text-slate-400 italic">"{nextInterview.interview_note}"</p>
                    )}
                  </div>
                ) : (
                  <div className="py-2">
                    <p className="text-sm font-medium text-slate-500">Nothing scheduled</p>
                    <p className="mt-1 text-xs text-slate-400">Interviews appear here once an employer schedules them</p>
                  </div>
                )}
              </div>

              {/* Offered waiting */}
              <div className="glass-inner rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-sky-500" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Offers awaiting your response</p>
                </div>
                <p className="text-lg font-extrabold text-slate-800">{offeredPending}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {offeredPending === 0
                    ? "No open offers — keep an eye on your applications"
                    : offeredPending === 1
                    ? "Review the offer details on your applications page"
                    : `Review your ${offeredPending} offers to move forward`}
                </p>
              </div>

              {/* Hired */}
              <div className="glass-inner rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="h-4 w-4 text-emerald-500" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hired</p>
                </div>
                <p className="text-lg font-extrabold text-slate-800">{hiredCount}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {hiredCount === 0
                    ? "Your first job offer is one step away"
                    : hiredCount === 1
                    ? "Congratulations — complete your onboarding checklist"
                    : `Congratulations on ${hiredCount} offers — complete your onboarding`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Placement Score ── */}
        <div className="glass p-6 mb-6 animate-fade-up delay-100">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="panel-title mb-1">
                <Target className="h-5 w-5 text-brand-600" />
                Placement Likelihood
              </div>
              <p className="text-sm text-slate-500">
                AI estimate of your probability of employment within 6 months
              </p>
            </div>

            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
              {scoreLoading ? (
                <Skeleton className="h-28 w-28 rounded-full" />
              ) : (
                <>
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 112 112">
                    <circle cx="56" cy="56" r="50" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                    <circle
                      cx="56"
                      cy="56"
                      r="50"
                      fill="none"
                      className={ringTone}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(pct / 100) * 314} 314`}
                      style={{ transition: "stroke-dasharray 1s ease-out" }}
                    />
                  </svg>
                  <span className={`text-2xl font-extrabold ${tone}`}>{pct}%</span>
                </>
              )}
            </div>
          </div>

          {!scoreLoading && score && (
            <div className="mt-5">
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${barTone} transition-all duration-1000 ease-out`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {score.factors.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {score.factors.map((f) => (
                    <span
                      key={f.factor}
                      className={`chip ${
                        f.effect === "boost" || f.effect === "high"
                          ? "bg-emerald-100 text-emerald-700"
                          : f.effect === "concern" || f.effect === "low"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                      title={f.detail}
                    >
                      {f.detail}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Nav Cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          {navCards.map(({ href, title, desc, icon: Icon, tint, tag, tagTone, badge }, i) => (
            <Link
              key={href}
              href={href}
              className="group glass card-hover animate-fade-up p-5"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="flex items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tint} shadow-md transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  {badge !== undefined && badge !== null && (
                    <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-brand-500 px-2 text-xs font-bold text-white">
                      {badge}
                    </span>
                  )}
                  <ArrowUpRight className="h-4 w-4 text-slate-300 transition-all group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-brand-500" />
                </div>
              </div>
              <h3 className="mt-3 font-bold text-slate-800 group-hover:text-brand-700">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{desc}</p>
              {tag && <span className={`chip mt-2 ${tagTone}`}>{tag}</span>}
            </Link>
          ))}
        </div>

        {/* ── Recent Applications ── */}
        <div className="glass p-6 animate-fade-up delay-200">
          <div className="flex items-center justify-between mb-4">
            <div className="panel-title">
              <FileText className="h-5 w-5 text-brand-600" />
              Recent Applications
            </div>
            {appCount > 3 && (
              <Link href="/candidate/applications" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                View all ({appCount})
              </Link>
            )}
          </div>

          {appsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-100 p-4">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="mb-2 h-4 w-40 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentApps.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <FileText className="h-7 w-7 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">No applications yet</p>
              <p className="mt-1 text-xs text-slate-400">Start applying to jobs to see them here</p>
              <Link
                href="/candidate/matches"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110"
              >
                <Briefcase className="h-4 w-4" />
                Browse Job Matches
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentApps.map((app: JobApplication, i: number) => (
                <div
                  key={app.id}
                  className="flex items-center gap-4 rounded-xl border border-slate-100 p-4 transition-all hover:border-brand-200 hover:bg-brand-50/30 animate-fade-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                    <FileText className="h-4 w-4 text-brand-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      Application #{app.job_posting_id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-slate-400">
                      Applied {new Date(app.applied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      {app.match_score !== null && app.match_score !== undefined && (
                        <span className="ml-2 font-medium text-brand-500">
                          {(app.match_score * 100).toFixed(0)}% match
                        </span>
                      )}
                    </p>
                  </div>
                  <StatusChip status={app.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════
            NEW FEATURE 1 — Job Match Highlights
           ═══════════════════════════════════════════════ */}
        <div className="glass p-6 mt-6 animate-fade-up delay-100">
          <div className="flex items-center justify-between mb-4">
            <div className="panel-title">
              <Briefcase className="h-5 w-5 text-sky-600" />
              Job Match Highlights
            </div>
            {jobMatches && jobMatches.matches.length > 3 && (
              <Link href="/candidate/matches" className="text-sm font-medium text-sky-600 hover:text-sky-700 transition-colors flex items-center gap-1">
                View all <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {matchesLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-inner rounded-xl p-4">
                  <Skeleton className="mb-3 h-4 w-32 rounded" />
                  <Skeleton className="mb-2 h-3 w-20 rounded" />
                  <Skeleton className="mb-3 h-2 w-full rounded-full" />
                  <Skeleton className="h-3 w-40 rounded" />
                </div>
              ))}
            </div>
          ) : !jobMatches || jobMatches.matches.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Briefcase className="h-7 w-7 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">No job matches yet</p>
              <p className="mt-1 text-xs text-slate-400">Complete your profile to get personalized recommendations</p>
              <Link
                href="/candidate/skills"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110"
              >
                <Sparkles className="h-4 w-4" />
                Add Skills
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {jobMatches.matches.slice(0, 3).map((match, i) => {
                const matchPct = Math.round(match.match_score * 100);
                const matchTone =
                  matchPct >= 70 ? "text-emerald-600" : matchPct >= 45 ? "text-amber-600" : "text-rose-600";
                const matchBar =
                  matchPct >= 70 ? "from-emerald-500 to-teal-500" : matchPct >= 45 ? "from-amber-500 to-yellow-500" : "from-rose-500 to-red-500";
                return (
                  <Link
                    key={match.job_id}
                    href="/candidate/matches"
                    className="group glass-inner rounded-xl p-4 transition-all hover:border-sky-200 hover:bg-sky-50/30 animate-fade-up"
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-bold text-slate-800 group-hover:text-sky-700 text-sm leading-tight">
                        {match.title}
                      </h4>
                      <span className={`text-sm font-extrabold ${matchTone} ml-2 shrink-0`}>
                        {matchPct}%
                      </span>
                    </div>
                    {match.company && (
                      <p className="text-xs text-slate-500 mb-2">{match.company}</p>
                    )}
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 mb-3">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${matchBar} transition-all duration-700`}
                        style={{ width: `${matchPct}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {(match.state || match.district) && (
                        <span className="flex items-center gap-1">
                          <Map className="h-3 w-3" />
                          {match.district}{match.district && match.state ? ", " : ""}{match.state}
                        </span>
                      )}
                      {match.skill_overlap.length > 0 && (
                        <span className="flex items-center gap-1 text-emerald-500">
                          <Zap className="h-3 w-3" />
                          {match.skill_overlap.length} skill{match.skill_overlap.length !== 1 ? "s" : ""} matched
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════
            NEW FEATURE 2 — Placement Factor Callouts
           ═══════════════════════════════════════════════ */}
        {score && score.factors.length > 0 && (
          <div className="glass p-6 mt-6 animate-fade-up delay-200">
            <div className="flex items-center justify-between mb-4">
              <div className="panel-title">
                <Zap className="h-5 w-5 text-amber-600" />
                Placement Score Breakdown
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {score.factors.map((f, i) => {
                const isPositive = f.effect === "boost" || f.effect === "high";
                const isNegative = f.effect === "concern" || f.effect === "low";
                return (
                  <div
                    key={f.factor}
                    className={`flex items-start gap-3 rounded-xl border p-4 transition-all animate-fade-up ${
                      isPositive
                        ? "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50"
                        : isNegative
                        ? "border-rose-200 bg-rose-50/60 hover:bg-rose-50"
                        : "border-slate-200 bg-slate-50/60 hover:bg-slate-50"
                    }`}
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isPositive
                          ? "bg-emerald-100 text-emerald-600"
                          : isNegative
                          ? "bg-rose-100 text-rose-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : isNegative ? (
                        <TrendingDown className="h-4 w-4" />
                      ) : (
                        <CircleDot className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{f.detail}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{f.factor}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isPositive
                          ? "bg-emerald-200 text-emerald-700"
                          : isNegative
                          ? "bg-rose-200 text-rose-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {f.effect}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            NEW FEATURE 3 — Outcome Journey Snapshot
           ═══════════════════════════════════════════════ */}
        <div className="glass p-6 mt-6 animate-fade-up delay-100">
          <div className="flex items-center justify-between mb-4">
            <div className="panel-title">
              <History className="h-5 w-5 text-violet-600" />
              Outcome Journey
            </div>
            {outcomeTimeline && outcomeTimeline.length > 0 && (
              <span className="text-xs text-slate-400">
                {outcomeTimeline.length} checkpoint{outcomeTimeline.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {outcomeLoading ? (
            <div className="flex items-center gap-6">
              {["3-month", "6-month", "12-month"].map((label) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-2.5 w-12 rounded" />
                </div>
              ))}
            </div>
          ) : !outcomeTimeline || outcomeTimeline.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <History className="h-7 w-7 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">No outcome data yet</p>
              <p className="mt-1 text-xs text-slate-400">Your employment tracking will appear here after training</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gradient-to-b from-violet-300 via-brand-300 to-emerald-300" />
              <div className="space-y-6">
                {outcomeTimeline.map((entry, i) => {
                  const isEmployed = entry.is_employed;
                  const label =
                    entry.interval === "3m"
                      ? "3 Months"
                      : entry.interval === "6m"
                      ? "6 Months"
                      : entry.interval === "12m"
                      ? "12 Months"
                      : entry.interval;
                  return (
                    <div
                      key={`${entry.interval}-${i}`}
                      className="relative flex items-start gap-5 pl-2 animate-fade-up"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      <div
                        className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                          isEmployed
                            ? "border-emerald-400 bg-emerald-100 text-emerald-600"
                            : "border-slate-300 bg-slate-100 text-slate-400"
                        }`}
                      >
                        {isEmployed ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 rounded-xl border border-slate-100 p-4 transition-all hover:border-violet-200">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-bold text-slate-800">{label}</h4>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isEmployed
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {isEmployed ? "Employed" : "Awaiting"}
                          </span>
                        </div>
                        {entry.job_title && (
                          <p className="text-xs text-slate-600 mb-1">
                            {entry.job_title}
                            {entry.job_location ? ` · ${entry.job_location}` : ""}
                          </p>
                        )}
                        {entry.monthly_salary !== null && entry.monthly_salary !== undefined && (
                          <p className="text-xs text-emerald-600 font-semibold">
                            ₹{entry.monthly_salary.toLocaleString("en-IN")}/month
                          </p>
                        )}
                        {entry.skills_used && entry.skills_used.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {entry.skills_used.map((s) => (
                              <span key={s} className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="mt-1 text-[10px] text-slate-400">
                          Surveyed {new Date(entry.survey_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════
            NEW FEATURE 4 — Skill Demand Alert
           ═══════════════════════════════════════════════ */}
        {!topSkillsLoading && !skillAlertDismissed && missingSkills.length > 0 && (
          <div className="glass p-5 mt-6 animate-fade-up delay-200">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-md">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">Upgrade your skills</h3>
                  <button
                    onClick={() => setSkillAlertDismissed(true)}
                    className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  These top-demand skills are missing from your profile. Adding them could improve your match score.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {missingSkills.map((s) => (
                    <span
                      key={s.skill}
                      className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                    >
                      <Sparkles className="h-3 w-3" />
                      {s.skill}
                      <span className="text-amber-400">· demand {s.demand}</span>
                    </span>
                  ))}
                </div>
                <Link
                  href="/candidate/skills"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  Add skills to your profile
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            NEW FEATURE 6 — Skill-Gap Courses
           ═══════════════════════════════════════════════ */}
        <div className="glass p-6 mt-6 animate-fade-up delay-200">
          <div className="flex items-center justify-between mb-1">
            <div className="panel-title">
              <GraduationCap className="h-5 w-5 text-violet-600" />
              Close your skill gaps
            </div>
            {!gapCoursesLoading && gapSkills.length > 0 && (
              <span className="chip bg-violet-100 text-violet-700">
                <Layers className="h-3 w-3" />
                {gapSkills.length} skill gap{gapSkills.length !== 1 ? "s" : ""} → learning path
              </span>
            )}
          </div>

          {gapCoursesLoading ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-inner rounded-xl p-4">
                  <Skeleton className="mb-3 h-4 w-40 rounded" />
                  <Skeleton className="mb-3 h-3 w-24 rounded" />
                  <Skeleton className="mb-3 h-6 w-28 rounded-full" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
              ))}
            </div>
          ) : gapSkills.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                All in-demand skills covered — you're market-ready! Keep it up
              </p>
              <p className="mt-1 text-xs text-slate-400">
                You already have the top skills employers are looking for
              </p>
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-500">
                {gapSkills.length} skill{gapSkills.length !== 1 ? "s" : ""} in demand you haven&apos;t added yet.
                Enroll in a course to cover them and boost your marketability.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {gapSkills.map((s) => (
                  <span
                    key={s.skill}
                    className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700"
                  >
                    <Sparkles className="h-3 w-3" />
                    {s.skill}
                    <span className="text-violet-400">· demand {s.demand}</span>
                  </span>
                ))}
              </div>

              {/* Learning path stepper */}
              <div className="mt-6 mb-2">
                <div className="flex items-center gap-2 mb-4">
                  <Map className="h-4 w-4 text-violet-600" />
                  <h4 className="text-sm font-bold text-slate-800">Your learning path</h4>
                  <span className="text-xs text-slate-400">
                    {gapSkills.length} step{gapSkills.length !== 1 ? "s" : ""} to market-ready
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute left-[15px] top-3 bottom-3 w-0.5 border-l-2 border-dashed border-violet-300" />
                  <div className="space-y-5">
                    {gapSkills.map((s, i) => {
                      const best = rankedGapCourses.find((r) =>
                        r.covered.some((sk) => sk.toLowerCase() === s.skill.toLowerCase())
                      );
                      return (
                        <div
                          key={s.skill}
                          className="relative flex items-start gap-4 pl-1 animate-fade-up"
                          style={{ animationDelay: `${i * 0.06}s` }}
                        >
                          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-sm font-bold text-white shadow-md shadow-violet-500/25">
                            {i + 1}
                          </div>
                          <div className="min-w-0 flex-1 rounded-xl border border-slate-100 p-4 transition-all hover:border-violet-200 hover:bg-violet-50/30">
                            <div className="flex flex-wrap items-center gap-2">
                              <h5 className="text-sm font-bold text-slate-800">{s.skill}</h5>
                              <span className="chip bg-amber-100 text-amber-700">
                                <TrendingUp className="h-3 w-3" />
                                In demand · {s.demand}
                              </span>
                            </div>
                            {best ? (
                              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-violet-50/60 px-3 py-2">
                                <GraduationCap className="h-4 w-4 shrink-0 text-violet-500" />
                                <span className="min-w-0 text-xs font-semibold text-violet-800">
                                  {best.course.name}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {best.course.duration_weeks} wk ·{" "}
                                  {best.course.cost_per_candidate !== null && best.course.cost_per_candidate !== undefined
                                    ? best.course.cost_per_candidate === 0
                                      ? "Free"
                                      : `₹${best.course.cost_per_candidate.toLocaleString("en-IN")}`
                                    : "Fees on request"}
                                </span>
                              </div>
                            ) : (
                              <p className="mt-2 text-xs text-slate-400">
                                No course covering this skill yet — check back soon.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {rankedGapCourses.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-slate-200 py-8 text-center">
                  <p className="text-sm font-medium text-slate-500">No courses found yet</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Courses covering your gap skills will appear here as they launch
                  </p>
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rankedGapCourses.map(({ course, covered }, i) => (
                    <div
                      key={course.id}
                      className="group glass-inner rounded-xl p-4 transition-all hover:border-violet-200 hover:bg-violet-50/30 animate-fade-up"
                      style={{ animationDelay: `${i * 0.06}s` }}
                    >
                      <h4 className="text-sm font-bold text-slate-800 leading-tight group-hover:text-violet-700">
                        {course.name}
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">{course.sector}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="chip bg-violet-100 text-violet-700">
                          <Clock className="h-3 w-3" />
                          {course.duration_weeks} wk{course.duration_weeks !== 1 ? "s" : ""}
                        </span>
                        <span className="chip bg-emerald-100 text-emerald-700">
                          {course.cost_per_candidate !== null && course.cost_per_candidate !== undefined
                            ? course.cost_per_candidate === 0
                              ? "Free"
                              : `₹${course.cost_per_candidate.toLocaleString("en-IN")}`
                            : "Fees on request"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {covered.map((sk) => (
                          <span
                            key={sk}
                            className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700"
                          >
                            <Check className="h-3 w-3 text-emerald-600" />
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════════════
            NEW FEATURE 5 — Profile Completeness Meter
           ═══════════════════════════════════════════════ */}
        <div className="glass p-6 mt-6 mb-6 animate-fade-up delay-100">
          <div className="flex items-center justify-between mb-4">
            <div className="panel-title">
              <Award className="h-5 w-5 text-emerald-600" />
              Profile Completeness
            </div>
            {!profileLoading && (
              <span className={`text-sm font-extrabold ${completeness.pct === 100 ? "text-emerald-600" : completeness.pct >= 60 ? "text-amber-600" : "text-rose-600"}`}>
                {completeness.pct}%
              </span>
            )}
          </div>

          {profileLoading ? (
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="flex-1 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-4 w-full rounded" />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="42" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                  <circle
                    cx="48"
                    cy="48"
                    r="42"
                    fill="none"
                    stroke="url(#completeness-gradient)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(completeness.pct / 100) * 264} 264`}
                    style={{ transition: "stroke-dasharray 1s ease-out" }}
                  />
                  <defs>
                    <linearGradient id="completeness-gradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="text-lg font-extrabold text-slate-800">{completeness.pct}%</span>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 flex-1">
                {completeness.checks.map((c) => (
                  <div key={c.label} className="flex items-center gap-2 text-sm">
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        c.done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {c.done ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    </div>
                    <span className={c.done ? "text-slate-700" : "text-slate-400"}>
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Edit Profile Modal ── */}
        <Modal
          open={editOpen}
          title="Edit Profile"
          subtitle="Update your personal information"
          onClose={() => setEditOpen(false)}
          footer={
            <>
              <button onClick={() => setEditOpen(false)} className="btn-ghost">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-glass inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-indigo-500 text-white hover:brightness-110"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <Field
              label="Full Name"
              name="full_name"
              value={editForm.full_name}
              onChange={(v) => setEditForm((f) => ({ ...f, full_name: v }))}
              required
              placeholder="Your full name"
            />
            <Field
              label="Email"
              name="email"
              value={editForm.email}
              onChange={(v) => setEditForm((f) => ({ ...f, email: v }))}
              placeholder="email@example.com"
            />
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="State"
                name="state"
                value={editForm.state}
                onChange={(v) => setEditForm((f) => ({ ...f, state: v }))}
                placeholder="e.g. Maharashtra"
              />
              <Field
                label="District"
                name="district"
                value={editForm.district}
                onChange={(v) => setEditForm((f) => ({ ...f, district: v }))}
                placeholder="e.g. Pune"
              />
            </div>
            <Field
              label="Pincode"
              name="pincode"
              value={editForm.pincode}
              onChange={(v) => setEditForm((f) => ({ ...f, pincode: v }))}
              placeholder="e.g. 411001"
            />
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-violet-300" />
                <p className="text-sm font-semibold text-slate-200">Job alert locations</p>
              </div>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Get alerts only for jobs in states you pick (leave empty for all India).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {jobAlertStateOptions.map((st) => {
                  const active = editForm.preferred_job_states.includes(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => togglePreferredState(st)}
                      aria-pressed={active}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-gradient-to-r from-brand-500 to-violet-500 text-white shadow-md shadow-brand-500/25"
                          : "border border-white/10 bg-white/5 text-slate-400 hover:border-violet-300/40 hover:text-violet-300"
                      }`}
                    >
                      {active && <Check className="mr-1 -mt-0.5 inline h-3 w-3" />}
                      {st}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2.5 text-[11px] text-violet-300/70">
                {editForm.preferred_job_states.length === 0
                  ? "All India — alerts for jobs everywhere"
                  : `${editForm.preferred_job_states.length} state${editForm.preferred_job_states.length !== 1 ? "s" : ""} selected`}
              </p>
            </div>
            <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Contact visibility</p>
                <p className="text-xs text-slate-500">
                  When off, your phone is hidden from employers on matches &amp; applications.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={editForm.allow_employer_contact}
                onClick={() => setEditForm((f) => ({ ...f, allow_employer_contact: !f.allow_employer_contact }))}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
                  editForm.allow_employer_contact
                    ? "bg-gradient-to-r from-brand-500 to-violet-500"
                    : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    editForm.allow_employer_contact ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </main>
  );
}
