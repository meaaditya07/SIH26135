"use client";

import Link from "next/link";
import {
  Sparkles, ArrowUpRight, ShieldCheck, Zap, LogIn,
  Map, BarChart3, TrendingUp,
} from "lucide-react";

const highlights = [
  { icon: Map, text: "Live national skill-gap heatmaps" },
  { icon: BarChart3, text: "Real-time scheme ROI analytics" },
  { icon: ShieldCheck, text: "DigiLocker identity verification" },
  { icon: TrendingUp, text: "AI-powered placement prediction" },
];

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-400/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-violet-400/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="relative z-10 max-w-3xl text-center animate-fade-up">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/60 px-4 py-1.5 text-xs font-semibold text-brand-700 shadow-sm backdrop-blur-md">
          <Zap className="h-3.5 w-3.5" />
          Vocational Education Intelligence Platform
        </div>

        <h1 className="mb-4 text-5xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-6xl">
          SkillTrace <span className="gradient-text">AI</span>
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-lg text-slate-600">
          Outcome tracking, skill-gap intelligence, and labor analytics —
          connecting training to real-world employment outcomes.
        </p>

        <Link
          href="/auth"
          className="btn-glass mb-12 px-8 py-3.5 text-base"
        >
          <LogIn className="h-5 w-5" />
          Sign in to your portal
        </Link>

        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {highlights.map(({ icon: Icon, text }) => (
            <span
              key={text}
              className="chip border border-white/60 bg-white/60 text-slate-600 shadow-sm backdrop-blur-md"
            >
              <Icon className="h-3.5 w-3.5 text-brand-600" />
              {text}
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-2xl animate-fade-up delay-100">
        <Link
          href="/auth"
          className="group glass card-hover flex items-center justify-between p-6"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-lg shadow-brand-500/30 transition-transform duration-300 group-hover:scale-110">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 group-hover:text-brand-700">
                Open your workspace
              </h3>
              <p className="text-sm text-slate-500">
                Government, candidate, employer, or training partner — sign in to continue.
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-6 w-6 text-slate-300 transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-brand-500" />
        </Link>
      </div>
    </main>
  );
}