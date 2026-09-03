"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import api from "@/lib/api";
import type { SurveyTemplate, SurveyResponseRow } from "@/lib/types";
import { ClipboardList, MessageSquare } from "lucide-react";

export default function GovSurveysPage() {
  useRequireAuth("gov_admin");
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [responses, setResponses] = useState<SurveyResponseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/surveys/templates"),
      api.get("/surveys/responses", { params: { limit: 20 } }),
    ])
      .then(([t, r]) => {
        setTemplates(t.data);
        setResponses(r.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const channelBadge = (channel: string) =>
    channel === "whatsapp"
      ? "bg-emerald-100 text-emerald-700"
      : channel === "sms"
      ? "bg-blue-100 text-blue-700"
      : "bg-purple-100 text-purple-700";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Survey Management" />
        <main className="p-6 space-y-6">
          <div className="glass p-6 animate-fade-up">
            <h2 className="panel-title mb-4"><ClipboardList className="h-5 w-5 text-brand-600" /> Survey Templates</h2>
            {loading ? (
              <div className="space-y-3">
                <div className="glass skeleton h-16" />
                <div className="glass skeleton h-16" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-slate-500 text-sm">No templates yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">Channel</th>
                      <th className="pb-2 pr-4">Interval</th>
                      <th className="pb-2 pr-4">Version</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2">Body</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {templates.map((t) => (
                      <tr key={t.id} className="hover:bg-white/70 transition-colors">
                        <td className="py-3 pr-4 font-medium text-slate-700">{t.name}</td>
                        <td className="py-3 pr-4">
                          <span className={`chip ${channelBadge(t.channel)}`}>
                            {t.channel}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{t.interval || "—"}</td>
                        <td className="py-3 pr-4 text-slate-600">v{t.version}</td>
                        <td className="py-3 pr-4">
                          <span className={`chip ${
                            t.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}>
                            {t.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 text-slate-500 max-w-xs truncate">{t.body}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="glass p-6 animate-fade-up delay-100">
            <h2 className="panel-title mb-4"><MessageSquare className="h-5 w-5 text-brand-600" /> Recent Responses</h2>
            {loading ? (
              <div className="space-y-3">
                <div className="glass skeleton h-16" />
                <div className="glass skeleton h-16" />
              </div>
            ) : responses.length === 0 ? (
              <p className="text-slate-500 text-sm">No survey responses yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                      <th className="pb-2 pr-4">Channel</th>
                      <th className="pb-2 pr-4">Received</th>
                      <th className="pb-2 pr-4">Raw Text</th>
                      <th className="pb-2">Outcome Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {responses.map((r) => (
                      <tr key={r.id} className="hover:bg-white/70 transition-colors">
                        <td className="py-3 pr-4">
                          <span className={`chip ${channelBadge(r.channel)}`}>
                            {r.channel}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">
                          {r.received_at ? new Date(r.received_at).toLocaleString() : "—"}
                        </td>
                        <td className="py-3 pr-4 text-slate-600 max-w-xs truncate">{r.raw_text || "—"}</td>
                        <td className="py-3">
                          {r.outcome_id ? (
                            <span className="chip bg-emerald-100 text-emerald-700">
                              Yes
                            </span>
                          ) : (
                            <span className="chip bg-slate-100 text-slate-500">
                              No
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
