"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn, Lock, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { login, homeForRole, DEMO_ACCOUNTS, type UserRole } from "@/lib/auth";

export default function AuthPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !password) {
      setError("Please enter your phone number and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await login(phone.trim(), password);
      router.push(homeForRole(user.role));
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || "Unable to sign in. Check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  function quickFill(a: (typeof DEMO_ACCOUNTS)[number]) {
    setPhone(a.phone);
    setPassword(a.password);
    setError(null);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -left-20 top-0 h-96 w-96 rounded-full bg-brand-400/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-violet-400/30 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center animate-fade-up">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-lg shadow-brand-500/30">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Sign in to <span className="gradient-text">SkillTrace</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Access your personalized portal
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-strong animate-fade-up delay-100 p-8"
        >
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Phone number
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="9876543210"
                className="input-glass pl-10"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="mb-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-glass pl-10 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 animate-fade-in">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-glass mt-5 w-full py-3 disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Signing in…
              </span>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Sign in
              </>
            )}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="mt-6 animate-fade-up delay-200">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Sparkles className="h-3.5 w-3.5" />
            Quick demo accounts
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                onClick={() => quickFill(acc)}
                className="glass-inner flex items-center justify-between px-3 py-2.5 text-left transition hover:border-brand-300 hover:bg-white"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">{acc.label}</p>
                  <p className="text-xs text-slate-400">{acc.phone}</p>
                </div>
                <span className="chip bg-brand-50/70 text-brand-600">{acc.role.replace("_", " ")}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}