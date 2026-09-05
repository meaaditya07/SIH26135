"use client";

import { useMemo, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import {
  useEmployerNotifications,
  markEmployerNotificationRead,
} from "@/lib/hooks/useDashboard";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import type { NotificationItem } from "@/lib/types";
import {
  Bell, CheckCheck, Clock, Inbox,
} from "lucide-react";

const KIND_LABELS: Record<string, string> = {
  new_application: "NEW APPLICATION",
  application_status: "APPLICATION UPDATE",
  job_alert: "JOB ALERT",
  survey_reminder: "SURVEY REMINDER",
  general: "GENERAL",
};

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  sent: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  failed: "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
};

type Filter = "all" | "unread" | "read";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
];

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function kindLabel(n: NotificationItem): string {
  if (n.kind) return KIND_LABELS[n.kind] ?? n.kind.replace(/_/g, " ").toUpperCase();
  return "GENERAL";
}

export default function EmployerNotificationsPage() {
  useRequireAuth("employer");

  const { data: notifications, loading, refresh } = useEmployerNotifications();
  const [filter, setFilter] = useState<Filter>("all");
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications],
  );

  const lastReceived = useMemo(() => {
    if (notifications.length === 0) return "";
    const latest = notifications.reduce((max: string, n) => {
      if (!n.created_at) return max;
      return n.created_at > max ? n.created_at : max;
    }, "");
    return timeAgo(latest || null);
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.read_at);
    if (filter === "read") return notifications.filter((n) => !!n.read_at);
    return notifications;
  }, [notifications, filter]);

  async function handleRead(id: string) {
    setMarkingId(id);
    try {
      await markEmployerNotificationRead(id);
      await refresh();
    } catch {
      // silent — refresh keeps state consistent
    } finally {
      setMarkingId(null);
    }
  }

  async function handleMarkAllRead() {
    const unread = notifications.filter((n) => !n.read_at).slice(0, 50);
    if (unread.length === 0) return;
    setMarkingAll(true);
    try {
      for (const n of unread) {
        await markEmployerNotificationRead(n.id);
      }
      await refresh();
    } catch {
      // partial — some may have succeeded
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Notifications" subtitle="Application alerts across your job postings" />
        <main className="p-6">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 animate-fade-up">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-1">Notifications</h1>
                <p className="text-slate-500">Application alerts across your job postings</p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="btn-ghost flex items-center gap-1.5 text-xs px-3 py-1.5"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {markingAll ? "Marking…" : "Mark all as read"}
                </button>
              )}
            </div>

            {/* Summary chips */}
            <div className="mb-6 flex flex-wrap gap-3 animate-fade-up delay-100">
              <div className="glass glass-inner flex items-center gap-2 px-4 py-2.5 rounded-xl">
                <span className="flex h-2.5 w-2.5 rounded-full bg-violet-500 shadow-sm shadow-violet-500/40" />
                <span className="text-sm text-slate-600">
                  <span className="font-bold text-slate-800">{unreadCount}</span> unread
                </span>
              </div>
              <div className="glass glass-inner flex items-center gap-2 px-4 py-2.5 rounded-xl">
                <Bell className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">
                  <span className="font-bold text-slate-800">{notifications.length}</span> total
                </span>
              </div>
              <div className="glass glass-inner flex items-center gap-2 px-4 py-2.5 rounded-xl">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">
                  Last received{" "}
                  <span className="font-semibold text-slate-800">
                    {lastReceived || "—"}
                  </span>
                </span>
              </div>
            </div>

            {/* Filter chips */}
            <div className="mb-6 flex flex-wrap gap-2 animate-fade-up delay-150">
              {FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`chip text-xs px-3 py-1.5 transition ${active
                      ? "bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-md shadow-brand-600/25"
                      : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                    {f.key === "unread" && unreadCount > 0 && (
                      <span className="ml-1.5 font-bold">{unreadCount}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {loading && (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="glass skeleton h-24 animate-fade-up"
                    style={{ animationDelay: `${i * 0.08}s` }}
                  />
                ))}
              </div>
            )}

            {!loading && filteredNotifications.length === 0 && (
              <div className="glass glass-inner p-12 text-center animate-fade-up">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-brand-500/20">
                  <Inbox className="h-6 w-6 text-violet-500" />
                </div>
                <p className="font-semibold text-slate-700">No activity yet</p>
                <p className="mt-1 text-sm text-slate-400">
                  When a candidate applies to your job, you&apos;ll see it here.
                </p>
              </div>
            )}

            {!loading && filteredNotifications.length > 0 && (
              <div className="space-y-3">
                {filteredNotifications.map((n, idx) => {
                  const isRead = !!n.read_at;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => !isRead && !markingAll && handleRead(n.id)}
                      disabled={isRead}
                      className={`glass glass-inner flex w-full items-start gap-3 p-5 text-left animate-fade-up transition ${
                        isRead
                          ? "opacity-75 cursor-default"
                          : "cursor-pointer border-violet-400/60 bg-gradient-to-r from-violet-600/25 to-brand-500/20 hover:bg-white/80"
                      }`}
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <span className="mt-1 flex flex-shrink-0 items-center justify-center">
                        {!isRead ? (
                          <span className="block h-2.5 w-2.5 rounded-full bg-violet-500 shadow-sm shadow-violet-500/40" />
                        ) : (
                          <span className="block h-2.5 w-2.5 rounded-full border border-slate-300 bg-transparent" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm ${isRead ? "font-medium text-slate-500" : "font-bold text-slate-800"}`}>
                          {n.title || "Notification"}
                        </span>
                        {n.body && (
                          <span className="mt-0.5 block text-sm text-slate-600">{n.body}</span>
                        )}
                        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                          <span>{timeAgo(n.created_at)}</span>
                          <span className={`chip text-[10px] ${isRead
                            ? "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                            : "bg-violet-100 text-violet-700 ring-1 ring-violet-200"
                          }`}>
                            {kindLabel(n)}
                          </span>
                          <span className={`chip text-[10px] capitalize ${STATUS_STYLES[n.status] ?? STATUS_STYLES.queued}`}>
                            {n.status}
                          </span>
                        </span>
                      </span>
                      {!isRead && markingId === n.id && (
                        <CheckCheck className="h-4 w-4 shrink-0 text-violet-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}