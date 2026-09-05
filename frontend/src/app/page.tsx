"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sparkles, ShieldCheck, BarChart3, TrendingUp, LogIn, Map,
  LineChart, Users, Building2, GraduationCap, ArrowUpRight, CheckCircle2,
  Workflow, BrainCircuit, FileText, Bell, MoveRight, Landmark, X, IndianRupee, Target,
} from "lucide-react";
import { Bar, BarChart as ReBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { PublicScheme, PartnerCoverageState } from "@/lib/types";
import { usePublicSummary, usePublicSchemes, usePartnerCoverage } from "@/lib/hooks/useDashboard";

function CountUp({ end, duration = 1200, decimals = 0 }: { end: number; duration?: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * end);
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [end, duration]);

  return <>{display.toFixed(decimals)}</>;
}

const pillars = [
  { key: "total_candidates" as const, label: "Candidates Trained", suffix: "", icon: Users, tint: "from-violet-500 to-brand-500" },
  { key: "total_employers" as const, label: "Active Employers", suffix: "", icon: Building2, tint: "from-brand-500 to-indigo-500" },
  { key: "total_courses" as const, label: "Training Programs", suffix: "", icon: GraduationCap, tint: "from-indigo-500 to-sky-500" },
  { key: "active_schemes" as const, label: "Gov Schemes Tracked", suffix: "", icon: Landmark, tint: "from-fuchsia-500 to-violet-500" },
];

const roles = [
  { icon: Landmark, title: "Government", desc: "Scheme ROI, skill-gap heatmaps & policy alerts to steer skilling policy.", href: "/auth" },
  { icon: Users, title: "Candidate", desc: "AI placement score, job matches & a personalized outcome journey.", href: "/auth" },
  { icon: Building2, title: "Employer", desc: "Skill-match candidates, run a live hiring pipeline & track placements.", href: "/auth" },
  { icon: GraduationCap, title: "Training Partner", desc: "Manage courses, track student outcomes & close curriculum gaps.", href: "/auth" },
];

const features = [
  { icon: Map, title: "Skill-Gap Heatmaps", desc: "National & regional deficit maps that show where jobs outpace supply." },
  { icon: LineChart, title: "Scheme ROI Analytics", desc: "Cost-per-placement and ROI tracking across every skilling scheme." },
  { icon: BrainCircuit, title: "AI Placement Prediction", desc: "ML-driven probability of employment per candidate in real time." },
  { icon: ShieldCheck, title: "DigiLocker Verification", desc: "Tamper-proof identity and credential verification at onboarding." },
  { icon: Workflow, title: "Hiring Pipeline", desc: "Manage shortlist → interview → offer → hired with one click." },
  { icon: Bell, title: "Smart Notifications", desc: "Automated WhatsApp/SMS/email updates at every stage of the journey." },
];

const steps = [
  { n: "01", icon: GraduationCap, title: "Skill", desc: "Candidates enroll in PMKVY & NSDC-aligned training programs." },
  { n: "02", icon: TrendingUp, title: "Track", desc: "Outcomes are captured via scheduled follow-up surveys & employer data." },
  { n: "03", icon: BarChart3, title: "Analyze", desc: "Policymakers see placement, ROI & labor-intelligence insights live." },
];

function placementRate(sc: PublicScheme): number {
  const placed = sc.placed_12m || sc.placed_6m || sc.placed_3m;
  return sc.total_enrolled ? Math.round((placed / sc.total_enrolled) * 100) : 0;
}

function SchemeModal({ scheme, onClose }: { scheme: PublicScheme; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const chartData = [
    { label: "3-month", placed: scheme.placed_3m },
    { label: "6-month", placed: scheme.placed_6m },
    { label: "12-month", placed: scheme.placed_12m },
  ];
  const maxPlaced = Math.max(scheme.placed_3m, scheme.placed_6m, scheme.placed_12m, 1);

  return (
    <div className="fixed z-[100] inset-0 flex items-center justify-center overflow-y-auto p-4 bg-black/60 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg glass glass-inner rounded-2xl p-6 text-left animate-fade-up shadow-2xl shadow-violet-900/40">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-white">{scheme.scheme_id}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="chip bg-gradient-to-r from-violet-500/25 to-brand-500/25 text-violet-200">State scheme</span>
              {scheme.roi_score != null && (
                <span className="chip bg-emerald-500/15 text-emerald-300">ROI {scheme.roi_score}</span>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="chip hover:bg-white/10" aria-label="Close details">
            <X className="h-4 w-4 text-slate-300" />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/[0.05] p-3 text-left">
            <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-400">
              <Users className="h-3 w-3" /> Enrolled
            </p>
            <p className="text-lg font-bold text-white">{scheme.total_enrolled.toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-white/[0.05] p-3 text-left">
            <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-400">
              <GraduationCap className="h-3 w-3" /> Completion
            </p>
            <p className="text-lg font-bold text-white">{scheme.completion_rate}%</p>
          </div>
          <div className="rounded-xl bg-white/[0.05] p-3 text-left">
            <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-400">
              <IndianRupee className="h-3 w-3" /> Avg salary
            </p>
            <p className="text-lg font-bold text-white">
              {scheme.avg_salary_at_placement != null ? `₹${scheme.avg_salary_at_placement.toLocaleString()}` : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.05] p-3 text-left">
            <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-400">
              <Target className="h-3 w-3" /> Placement
            </p>
            <p className="text-lg font-bold text-white">{placementRate(scheme)}%</p>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <p className="panel-title text-sm font-semibold text-slate-300">Placements over time</p>
          <span className="text-xs text-slate-500">{maxPlaced.toLocaleString()} max</span>
        </div>
        <div className="mb-5 h-36">
          <ResponsiveContainer width="100%" height="100%">
            <ReBarChart data={chartData} barCategoryGap="25%">
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} tickLine={false} axisLine={false} width={36} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={{ background: "#0f0a1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                formatter={(value) => [Number(value).toLocaleString(), "placed"]}
              />
              <Bar dataKey="placed" fill="url(#schemeBarGrad)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="schemeBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#6d28d9" />
                </linearGradient>
              </defs>
            </ReBarChart>
          </ResponsiveContainer>
        </div>

        <p className="text-sm leading-relaxed text-slate-400">
          National skilling programme tracked under <span className="text-violet-300">{scheme.scheme_id}</span>.
          {scheme.total_cost > 0 && (
            <> Total programme outlay of <span className="text-slate-200">₹{scheme.total_cost.toLocaleString()}</span>.</>
          )}
          {scheme.roi_score != null && (
            <> Estimated ROI score of <span className="text-slate-200">{scheme.roi_score}</span>.</>
          )}
        </p>
      </div>
    </div>
  );
}

function PartnerCoverageSection() {
  const { data, loading } = usePartnerCoverage();

  const states: PartnerCoverageState[] = data?.states ?? [];
  const maxPartners = states.reduce((m, s) => Math.max(m, s.partner_count), 1);
  const chartData = states.map((s) => ({ state: s.state, partners: s.partner_count }));
  const chartHeight = Math.max(240, Math.min(chartData.length * 30, 520));

  return (
    <section id="partners" className="relative z-10 mx-auto max-w-6xl px-6 py-10">
      <div className="glass glass-inner p-6 sm:p-8 animate-fade-up">
        <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-3xl font-bold text-white">Training partners across India</h2>
            <p className="mt-1 text-slate-400">
              A pan-India network of certified training centers delivering skills on the ground.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-violet-500/15 text-violet-200">
              <Building2 className="h-3.5 w-3.5" />
              {loading ? "—" : (data?.total_partners ?? 0)} partners
            </span>
            <span className="chip bg-indigo-500/15 text-indigo-200">
              <Users className="h-3.5 w-3.5" />
              {loading ? "—" : (data?.total_states ?? 0)} states
            </span>
            <span className="chip bg-fuchsia-500/15 text-fuchsia-200">
              <GraduationCap className="h-3.5 w-3.5" />
              {loading ? "—" : (data?.total_courses ?? 0)} courses
            </span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="skeleton h-72 rounded-2xl" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-10 rounded-xl" />
              ))}
            </div>
          </div>
        ) : !data || states.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-slate-400">No partner coverage data available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <p className="panel-title mb-3 text-sm font-semibold text-slate-300">Partners per state</p>
              <div style={{ height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={chartData} layout="vertical" barCategoryGap="28%">
                    <CartesianGrid stroke="#3b3550" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="rgba(255,255,255,0.4)"
                      tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="state"
                      width={130}
                      stroke="rgba(255,255,255,0.4)"
                      tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      contentStyle={{ background: "#0f0a1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                      labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                      formatter={(value) => [Number(value).toLocaleString(), "partners"]}
                    />
                    <Bar dataKey="partners" fill="#7c3aed" radius={[0, 6, 6, 0]} barSize={14} />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="lg:col-span-3">
              <p className="panel-title mb-3 text-sm font-semibold text-slate-300">State footprint</p>
              <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
                {states.map((s) => (
                  <div key={s.state} className="rounded-xl border border-white/5 bg-white/[0.04] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-white">{s.state}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="chip bg-violet-500/15 text-violet-200">{s.partner_count} partners</span>
                        <span className="chip bg-fuchsia-500/15 text-fuchsia-200">{s.course_count} courses</span>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-brand-500"
                        style={{ width: `${Math.max((s.partner_count / maxPartners) * 100, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { data: stats, loading } = usePublicSummary();
  const [schemeFilter, setSchemeFilter] = useState<string | null>(null);
  const { data: schemes, availableStates, loading: schemeLoading } = usePublicSchemes(schemeFilter);
  const [selectedScheme, setSelectedScheme] = useState<PublicScheme | null>(null);
  const closeModal = useCallback(() => setSelectedScheme(null), []);

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-violet-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-24 h-[24rem] w-[24rem] rounded-full bg-brand-500/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pb-16 pt-20 text-center">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-4 py-1.5 text-xs font-semibold text-violet-200 backdrop-blur-md animate-fade-up">
          <Sparkles className="h-3.5 w-3.5" />
          Vocational Education Intelligence Platform
        </span>

        <h1 className="mb-5 text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl animate-fade-up delay-100">
          SkillTrace <span className="gradient-text">AI</span>
        </h1>
        <p className="mx-auto mb-9 max-w-2xl text-lg text-slate-300 animate-fade-up delay-150">
          Outcome tracking, skill-gap intelligence, and labor analytics —
          connecting vocational training to real-world employment at national scale.
        </p>

        <div className="flex flex-wrap justify-center gap-3 animate-fade-up delay-200">
          <Link href="/auth" className="btn-glass px-8 py-3.5 text-base">
            <LogIn className="h-5 w-5" />
            Enter your portal
          </Link>
          <Link href="#features" className="btn-ghost px-8 py-3.5 text-base">
            Explore features
            <MoveRight className="h-5 w-5" />
          </Link>
        </div>

        {/* Live stats bar */}
        <div className="mt-12 grid w-full grid-cols-2 gap-4 sm:grid-cols-4 animate-fade-up delay-300">
          {pillars.map(({ key, label, suffix, icon: Icon, tint }, i) => (
            <div key={label} className="glass glass-inner card-hover p-5 text-left">
              <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tint} shadow-md`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">
                {loading ? "—" : <CountUp end={stats?.[key] ?? 0} />}
              </p>
              <p className="text-sm text-slate-400">{label}</p>
            </div>
          ))}
        </div>
        {!loading && typeof stats?.overall_placement_rate === "number" && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-300 animate-fade-up delay-400">
            <span className="chip bg-emerald-500/15 text-emerald-300">
              <TrendingUp className="h-3.5 w-3.5" />
              {stats.overall_placement_rate}% placement rate
            </span>
            <span className="text-slate-500">across {stats.skills_taught} skills tracked</span>
          </div>
        )}
      </section>

      {/* ── Roles ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <h2 className="mb-2 text-center text-3xl font-bold text-white">One platform, four portals</h2>
        <p className="mb-10 text-center text-slate-400">
          Purpose-built workspaces for everyone in the skilling ecosystem.
        </p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map(({ icon: Icon, title, desc }, i) => (
            <Link key={title} href="/auth" className="group glass card-hover animate-fade-up p-6" style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-brand-500 shadow-lg shadow-violet-600/30 transition-transform duration-300 group-hover:scale-110">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-1 text-lg font-bold text-white">{title}</h3>
              <p className="text-sm text-slate-400">{desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-300">
                Sign in <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <h2 className="mb-2 text-center text-3xl font-bold text-white">Built for real outcomes</h2>
        <p className="mb-10 text-center text-slate-400">Intelligence that turns training into measurable employment.</p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className="glass glass-inner card-hover animate-fade-up p-6" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-brand-500 shadow-md">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mb-1 text-base font-bold text-white">{title}</h3>
              <p className="text-sm text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured schemes ────────────────────────────────────────────── */}
      <section id="schemes" className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <div className="mb-10 flex flex-col items-center justify-between gap-2 sm:flex-row">
          <div>
            <h2 className="text-3xl font-bold text-white">Featured skilling schemes</h2>
            <p className="mt-1 text-slate-400">National programmes driving vocational outcomes.</p>
          </div>
          <span className="chip">
            <Landmark className="h-3.5 w-3.5" />
            {stats?.active_schemes ?? "—"} schemes tracked
          </span>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSchemeFilter(null)}
            className={`chip ${schemeFilter === null ? "bg-gradient-to-r from-violet-500 to-brand-500 text-white" : "hover:bg-white/10"}`}
          >
            All states
          </button>
          {availableStates.map((state) =>
            {
              const active = schemeFilter === state;
              return (
                <button
                  key={state}
                  type="button"
                  onClick={() => setSchemeFilter(active ? null : state)}
                  className={`chip ${active ? "bg-gradient-to-r from-violet-500 to-brand-500 text-white" : "hover:bg-white/10"}`}
                >
                  {state}
                </button>
              );
            }
          )}
        </div>

        {schemeFilter !== null && (
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
            <span>filtered by <span className="font-semibold text-violet-300">{schemeFilter}</span></span>
            <button
              type="button"
              onClick={() => setSchemeFilter(null)}
              className="chip hover:bg-white/10"
              aria-label="Clear state filter"
            >
              <span className="text-slate-300">clear</span>
              <span className="text-slate-400">×</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {schemeLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass glass-inner card-hover p-6">
                <div className="skeleton mb-3 h-14 w-14 rounded-2xl" />
                <div className="skeleton mb-2 h-5 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            ))
          ) : (schemes ?? []).map((sc) => {
            const rate = placementRate(sc);
            return (
              <div key={sc.scheme_id} role="button" tabIndex={0} onClick={() => setSelectedScheme(sc)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedScheme(sc); } }} className="glass glass-inner card-hover cursor-pointer p-6 animate-fade-up">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">{sc.scheme_id}</h3>
                  <span className="chip bg-gradient-to-r from-violet-500/25 to-brand-500/25 text-violet-200">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    View details
                  </span>
                </div>
                <p className="mb-4 text-3xl font-extrabold text-white">
                  <CountUp end={sc.total_enrolled} />
                </p>
                <p className="mb-3 text-sm text-slate-400">learners enrolled</p>
                <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-brand-500 transition-all duration-700"
                    style={{ width: `${Math.min(sc.completion_rate, 100)}%` }}
                  />
                </div>
                <p className="mb-4 text-xs text-slate-400">
                  {sc.completion_rate}% completion · <span className="text-violet-200">{rate}% placed</span>
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white/[0.05] p-2">
                    <p className="text-sm font-bold text-white">{sc.placed_3m.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">3-months</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.05] p-2">
                    <p className="text-sm font-bold text-white">{sc.placed_6m.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">6-months</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.05] p-2">
                    <p className="text-sm font-bold text-white">{sc.placed_12m.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">12-months</p>
                  </div>
                </div>
                {sc.avg_salary_at_placement != null && (
                  <p className="mt-4 text-xs text-slate-400">
                    Avg salary at placement{" "}
                    <span className="font-semibold text-emerald-300">
                      ₹{sc.avg_salary_at_placement.toLocaleString()}
                    </span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Training partners across India ──────────────────────────────── */}
      <PartnerCoverageSection />

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-10">
        <h2 className="mb-10 text-center text-3xl font-bold text-white">How it works</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {steps.map(({ n, icon: Icon, title, desc }, i) => (
            <div key={n} className="relative glass glass-inner card-hover p-6 animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
              <span className="gradient-text text-3xl font-extrabold">{n}</span>
              <div className="mb-3 mt-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-500 shadow-md">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mb-1 text-base font-bold text-white">{title}</h3>
              <p className="text-sm text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        <div className="glass-strong card-hover relative overflow-hidden p-10 text-center animate-fade-up">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-600/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="relative">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-violet-300" />
            <h2 className="mb-3 text-3xl font-bold text-white">Ready to connect skills to jobs?</h2>
            <p className="mx-auto mb-7 max-w-xl text-slate-300">
              Join the growing ecosystem turning vocational training into verified employment outcomes.
            </p>
            <Link href="/auth" className="btn-glass px-10 py-3.5 text-base">
              Sign in to get started
              <ArrowUpRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-sm text-slate-400">
          <span className="flex items-center gap-2 font-semibold text-slate-200">
            <FileText className="h-4 w-4 text-violet-300" /> SkillTrace AI
          </span>
          <span>Vocational education outcome tracking &amp; labor analytics</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>

      {selectedScheme && <SchemeModal scheme={selectedScheme} onClose={closeModal} />}
    </main>
  );
}
