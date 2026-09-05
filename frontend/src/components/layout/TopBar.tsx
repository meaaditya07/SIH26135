"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, User, LogOut, Home } from "lucide-react";
import { useState } from "react";
import { getStoredUser, logout, ROLE_LABEL } from "@/lib/auth";

const TITLES: { prefix: string; title: string }[] = [
  { prefix: "/gov", title: "Government Analytics" },
  { prefix: "/candidate", title: "Candidate Portal" },
  { prefix: "/employer", title: "Employer Portal" },
  { prefix: "/partner", title: "Training Partner" },
  { prefix: "/survey", title: "Outcome Survey" },
];

export default function TopBar({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const { push } = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const user =
    typeof window !== "undefined" ? getStoredUser() : null;
  const displayName = user?.full_name?.split(" ")[0] ?? "Guest";
  const roleLabel = user ? ROLE_LABEL[user.role] : "Not signed in";

  const resolvedTitle =
    title ?? TITLES.find((t) => pathname?.startsWith(t.prefix))?.title ?? "Dashboard";

  function handleLogout() {
    logout();
    push("/auth");
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-white/10 bg-[#0d1325]/70 px-6 backdrop-blur-2xl">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-slate-100">{resolvedTitle}</h1>
        {subtitle && <p className="hidden text-sm text-slate-400 md:inline">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-300 transition hover:bg-white/[0.12] hover:text-violet-300 hover:shadow-md"
          title="Home"
        >
          <Home className="h-4 w-4" />
        </Link>

        <Link
          href="/candidate/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-300 transition hover:bg-white/[0.12] hover:text-violet-300 hover:shadow-md"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gradient-to-r from-rose-500 to-red-500" />
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] py-1 pl-1 pr-3 transition hover:bg-white/[0.12] hover:shadow-md"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-brand-500">
              <User className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="hidden text-sm font-semibold text-slate-200 sm:inline">
              {displayName}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#141b33]/95 shadow-2xl shadow-black/50 animate-scale-in">
              <div className="border-b border-white/10 px-4 py-2.5">
                <p className="text-xs font-semibold text-slate-100">
                  {user?.full_name ?? "Visitor"}
                </p>
                <p className="text-xs text-slate-400">{roleLabel}</p>
                {user && <p className="mt-0.5 text-[11px] text-slate-500">{user.phone}</p>}
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-rose-400"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}