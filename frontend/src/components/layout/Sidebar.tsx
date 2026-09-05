"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Map, BarChart3, AlertTriangle, FileText,
  MessageSquareText, ShieldCheck, GraduationCap, Briefcase, Sparkles,
  BookOpen, History, ClipboardCheck, Building2, Users, TrendingUp,
  Target, Bell, FolderGit2, Filter, CalendarDays,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const NAV: Record<string, { label: string; items: NavItem[] }> = {
  "/gov": {
    label: "Government Portal",
    items: [
      { href: "/gov", label: "Overview", icon: LayoutDashboard },
      { href: "/gov/manage", label: "Manage Content", icon: Filter },
      { href: "/gov/heatmap", label: "Skill Heatmap", icon: Map },
      { href: "/gov/scheme-roi", label: "Scheme ROI", icon: BarChart3 },
      { href: "/gov/surveys", label: "Surveys", icon: ClipboardCheck },
      { href: "/gov/alerts", label: "Policy Alerts", icon: AlertTriangle },
      { href: "/gov/reports", label: "Reports", icon: FileText },
    ],
  },
  "/candidate": {
    label: "Candidate Portal",
    items: [
      { href: "/candidate", label: "Dashboard", icon: LayoutDashboard },
      { href: "/candidate/verification", label: "Verification", icon: ShieldCheck },
      { href: "/candidate/skills", label: "My Skills", icon: Sparkles },
      { href: "/candidate/matches", label: "Job Matches", icon: Briefcase },
      { href: "/candidate/applications", label: "Applications", icon: FolderGit2 },
      { href: "/candidate/progress", label: "Progress", icon: History },
      { href: "/candidate/notifications", label: "Notifications", icon: Bell },
    ],
  },
  "/employer": {
    label: "Employer Portal",
    items: [
      { href: "/employer", label: "Overview", icon: LayoutDashboard },
      { href: "/employer/jobs", label: "Job Postings", icon: Briefcase },
      { href: "/employer/matches", label: "Candidate Matches", icon: Users },
      { href: "/employer/pipeline", label: "Pipeline", icon: TrendingUp },
      { href: "/employer/interviews", label: "Interviews", icon: CalendarDays },
    ],
  },
  "/partner": {
    label: "Training Partner",
    items: [
      { href: "/partner", label: "Overview", icon: LayoutDashboard },
      { href: "/partner/courses", label: "Courses", icon: BookOpen },
      { href: "/partner/students", label: "Students", icon: Users },
      { href: "/partner/enrollment", label: "Enrollments", icon: GraduationCap },
      { href: "/partner/curriculum-gap", label: "Curriculum Gap", icon: Target },
    ],
  },
};

const LOGOS: Record<string, { label: string; icon: typeof LayoutDashboard }> = {
  "/gov": { label: "Admin Console", icon: ShieldCheck },
  "/candidate": { label: "Candidate Hub", icon: GraduationCap },
  "/employer": { label: "Employer Suite", icon: Briefcase },
  "/partner": { label: "Partner Workspace", icon: Building2 },
};

export default function Sidebar() {
  const pathname = usePathname();

  const role = Object.keys(NAV)
    .filter((k) => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0] ?? "/gov";

  const { label, items } = NAV[role];
  const logo = LOGOS[role];
  const LogoIcon = logo.icon;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="sticky top-0 h-screen w-64 shrink-0 border-r border-white/10 bg-[#0d1325]/70 p-4 backdrop-blur-2xl">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-3 mb-1 px-2 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-brand-500 shadow-lg shadow-violet-600/40">
          <LogoIcon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="bg-gradient-to-r from-violet-300 via-white to-indigo-300 bg-clip-text text-sm font-bold leading-tight text-transparent">SkillTrace AI</p>
          <p className="text-[11px] font-medium text-slate-400">{label}</p>
        </div>
      </Link>

      <div className="mb-4 mt-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Menu
      </div>

      <nav className="space-y-1">
        {items.map(({ href, label: itemLabel, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-gradient-to-r from-violet-600/30 to-brand-500/20 text-white shadow-inner"
                  : "text-slate-400 hover:bg-white/[0.08] hover:text-slate-100"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-violet-500 to-brand-400" />
              )}
              <Icon
                className={`h-[18px] w-[18px] shrink-0 transition-transform duration-200 ${
                  active ? "text-violet-300" : "text-slate-400 group-hover:text-violet-400 group-hover:scale-110"
                }`}
              />
              <span className="truncate">{itemLabel}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 ml-1 text-[11px] text-slate-600">&copy; {new Date().getFullYear()} SkillTrace</div>
    </aside>
  );
}