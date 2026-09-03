"use client";

import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useMyNotifications, markNotificationRead } from "@/lib/hooks/useDashboard";
import { Bell, BellOff, CheckCheck, MessageSquareText, Mail } from "lucide-react";
import { useState } from "react";

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-slate-100 text-slate-600",
  sent: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
};

const CHANNEL_ICON: Record<string, typeof Bell> = {
  whatsapp: MessageSquareText,
  sms: Mail,
};

export default function NotificationsPage() {
  const { data: notifications, loading } = useMyNotifications();
  const [read, setRead] = useState<Set<string>>(new Set());

  async function handleRead(id: string) {
    await markNotificationRead(id);
    setRead((prev) => new Set(prev).add(id));
  }

  const unread = notifications.filter(
    (n) => !n.read_at && !read.has(n.id)
  ).length;

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
            </div>

            {loading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass skeleton h-24" style={{ opacity: 0.4 }} />
                ))}
              </div>
            )}

            {!loading && notifications.length === 0 && (
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
              {notifications.map((n, idx) => {
                const isRead = !!n.read_at || read.has(n.id);
                const ChannelIcon = CHANNEL_ICON[n.channel] ?? Bell;
                return (
                  <div
                    key={n.id}
                    className={`glass card-hover animate-fade-up p-5 ${
                      isRead ? "" : "border-brand-300/70 bg-gradient-to-r from-brand-50/70 to-white/80"
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
                            {n.title ?? "Notification"}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                            <span className="capitalize">{n.channel}</span>
                            <span className="capitalize">{n.kind ?? "general"}</span>
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
                          className="btn-ghost shrink-0 px-3 py-1.5 text-xs"
                        >
                          <CheckCheck className="h-3.5 w-3.5" /> Mark read
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