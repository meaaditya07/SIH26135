"use client";

import { useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import {
  useMyNotifications,
  markNotificationRead,
} from "@/lib/hooks/useDashboard";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import {
  Bell, BellOff, CheckCheck, MessageSquareText, Mail,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-slate-100 text-slate-600",
  sent: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
};

const CHANNEL_ICON: Record<string, typeof Bell> = {
  whatsapp: MessageSquareText,
  sms: Mail,
};

const KIND_LABELS: Record<string, string> = {
  application_status: "Application Update",
  job_alert: "Job Alert",
  survey_reminder: "Survey Reminder",
  general: "General",
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  web_portal: "Web Portal",
};

export default function NotificationsPage() {
  useRequireAuth("candidate");

  const [statusFilter, setStatusFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const { data: notifications, loading } = useMyNotifications(statusFilter || undefined);
  const [read, setRead] = useState<Set<string>>(new Set());
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const kinds = useMemo(() => {
    const set = new Set<string>();
    for (const n of notifications) {
      if (n.kind) set.add(n.kind);
    }
    return Array.from(set);
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (!kindFilter) return notifications;
    return notifications.filter((n) => n.kind === kindFilter);
  }, [notifications, kindFilter]);

  const unread = filteredNotifications.filter(
    (n) => !n.read_at && !read.has(n.id)
  ).length;

  async function handleRead(id: string) {
    setMarkingId(id);
    try {
      await markNotificationRead(id);
      setRead((prev) => new Set(prev).add(id));
    } catch {
      // silent
    } finally {
      setMarkingId(null);
    }
  }

  async function handleMarkAllRead() {
    const unreadIds = filteredNotifications
      .filter((n) => !n.read_at && !read.has(n.id))
      .map((n) => n.id);
    if (unreadIds.length === 0) return;
    setMarkingAll(true);
    try {
      await Promise.all(unreadIds.map((id) => markNotificationRead(id)));
      setRead((prev) => {
        const next = new Set(prev);
        for (const id of unreadIds) next.add(id);
        return next;
      });
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
        <TopBar title="Notifications" subtitle="Application updates & job alerts" />
        <main className="p-6">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex items-center justify-between animate-fade-up">
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-1">Notifications</h1>
                <p className="text-slate-500">
                  Application updates and job alerts sent to you
                  {unread > 0 && (
                    <span className="chip ml-2 bg-gradient-to-r from-brand-500 to-indigo-500 text-white shadow-md shadow-brand-500/30">
                      <Bell className="h-3 w-3" /> {unread} unread
                    </span>
                  )}
                </p>
              </div>
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="btn-ghost text-xs px-3 py-1.5"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {markingAll ? "Marking…" : "Mark all read"}
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mb-6 animate-fade-up delay-100">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-glass w-auto text-sm"
              >
                <option value="">All statuses</option>
                <option value="queued">Queued</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
                className="input-glass w-auto text-sm"
              >
                <option value="">All kinds</option>
                {kinds.map((k) => (
                  <option key={k} value={k}>{KIND_LABELS[k] ?? k}</option>
                ))}
              </select>
            </div>

            {loading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass skeleton h-24" style={{ opacity: 0.4 }} />
                ))}
              </div>
            )}

            {!loading && filteredNotifications.length === 0 && (
              <div className="glass animate-scale-in flex flex-col items-center p-12 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300">
                  <BellOff className="h-6 w-6 text-slate-500" />
                </div>
                <p className="font-semibold text-slate-700">No notifications yet</p>
                <p className="mt-1 text-sm text-slate-400">
                  You will see application status updates and job alerts here.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {filteredNotifications.map((n, idx) => {
                const isRead = !!n.read_at || read.has(n.id);
                const ChannelIcon = CHANNEL_ICON[n.channel] ?? Bell;
                return (
                  <div
                    key={n.id}
                    className={`glass card-hover animate-fade-up p-5 ${
                      isRead ? "" : "border-violet-400/60 bg-gradient-to-r from-violet-600/25 to-brand-500/20"
                    }`}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                            isRead
                              ? "bg-slate-100 text-slate-400"
                              : "bg-gradient-to-br from-brand-500 to-indigo-500 text-white"
                          }`}
                        >
                          <ChannelIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">
                            {n.title ?? KIND_LABELS[n.kind ?? ""] ?? "Notification"}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                            <span>{CHANNEL_LABELS[n.channel] ?? n.channel}</span>
                            <span>{KIND_LABELS[n.kind ?? ""] ?? n.kind ?? "general"}</span>
                            <span>
                              {n.created_at
                                ? new Date(n.created_at).toLocaleString()
                                : "—"}
                            </span>
                            <span
                              className={`chip capitalize ${
                                STATUS_STYLES[n.status] ?? STATUS_STYLES.queued
                              }`}
                            >
                              {n.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      {!isRead && (
                        <button
                          onClick={() => handleRead(n.id)}
                          disabled={markingId === n.id}
                          className="btn-ghost shrink-0 px-3 py-1.5 text-xs"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          {markingId === n.id ? "Saving…" : "Mark read"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
