"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import api from "@/lib/api";
import type { SurveyTemplate, SurveyResponseRow } from "@/lib/types";

export default function GovSurveysPage() {
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
      ? "bg-green-100 text-green-700"
      : channel === "sms"
      ? "bg-blue-100 text-blue-700"
      : "bg-purple-100 text-purple-700";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Survey Management" />
        <main className="p-6 space-y-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-4">Survey Templates</h2>
            {loading ? (
              <p className="text-slate-500 text-sm">Loading templates…</p>
            ) : templates.length === 0 ? (
              <p className="text-slate-500 text-sm">No templates yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b">
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
                      <tr key={t.id}>
                        <td className="py-3 pr-4 font-medium text-slate-700">{t.name}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${channelBadge(t.channel)}`}>
                            {t.channel}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{t.interval || "—"}</td>
                        <td className="py-3 pr-4 text-slate-600">v{t.version}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            t.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
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

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-4">Recent Responses</h2>
            {loading ? (
              <p className="text-slate-500 text-sm">Loading responses…</p>
            ) : responses.length === 0 ? (
              <p className="text-slate-500 text-sm">No survey responses yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b">
                      <th className="pb-2 pr-4">Channel</th>
                      <th className="pb-2 pr-4">Received</th>
                      <th className="pb-2 pr-4">Raw Text</th>
                      <th className="pb-2">Outcome Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {responses.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 pr-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${channelBadge(r.channel)}`}>
                            {r.channel}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">
                          {r.received_at ? new Date(r.received_at).toLocaleString() : "—"}
                        </td>
                        <td className="py-3 pr-4 text-slate-600 max-w-xs truncate">{r.raw_text || "—"}</td>
                        <td className="py-3">
                          {r.outcome_id ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                              Yes
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500">
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
