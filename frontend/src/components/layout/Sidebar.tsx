"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Map, BarChart3, AlertTriangle, FileText, MessageSquareText } from "lucide-react";

const navItems = [
  { href: "/gov", label: "Overview", icon: LayoutDashboard },
  { href: "/gov/heatmap", label: "Skill Heatmap", icon: Map },
  { href: "/gov/scheme-roi", label: "Scheme ROI", icon: BarChart3 },
  { href: "/gov/surveys", label: "Surveys", icon: MessageSquareText },
  { href: "/gov/alerts", label: "Policy Alerts", icon: AlertTriangle },
  { href: "/gov/reports", label: "Reports", icon: FileText },
];

export default function GovSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen p-4">
      <div className="mb-8">
        <h2 className="text-lg font-bold text-brand-700">SkillTrace AI</h2>
        <p className="text-xs text-slate-500">Government Portal</p>
      </div>
      <nav className="space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === href
                ? "bg-brand-50 text-brand-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
