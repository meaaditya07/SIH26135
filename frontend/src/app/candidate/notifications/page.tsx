"use client";

import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useMyNotifications, markNotificationRead } from "@/lib/hooks/useDashboard";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { useState } from "react";

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-slate-100 text-slate-600",
  sent: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
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
        <TopBar title="Notifications" />
        <main className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-1">Notifications</h1>
                <p className="text-slate-500">
                  Application updates and job alerts sent to you
                  {unread > 0 && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      <Bell className="h-3 w-3" /> {unread} unread
                    </span>
                  )}
                </p>
              </div>
            </div>

            {loading && <p className="text-slate-500">Loading…</p>}

            {!loading && notifications.length === 0 && (
              <div className="rounded-lg border bg-white p-12 flex flex-col items-center text-center">
                <BellOff className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">No notifications yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  You will see application status updates and job alerts here.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {notifications.map((n) => {
                const isRead = !!n.read_at || read.has(n.id);
                return (
                  <div
                    key={n.id}
                    className={`rounded-lg border bg-white p-5 shadow-sm ${
                      isRead ? "" : "border-brand-200 bg-brand-50/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">
                          {n.title ?? "Notification"}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">{n.body}</p>
                        <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                          <span className="capitalize">{n.channel}</span>
                          <span className="capitalize">{n.kind ?? "general"}</span>
                          <span>
                            {n.created_at
                              ? new Date(n.created_at).toLocaleString()
                              : "—"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full capitalize ${
                              STATUS_STYLES[n.status] ?? STATUS_STYLES.queued
                            }`}
                          >
                            {n.status}
                          </span>
                        </div>
                      </div>
                      {!isRead && (
                        <button
                          onClick={() => handleRead(n.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
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
