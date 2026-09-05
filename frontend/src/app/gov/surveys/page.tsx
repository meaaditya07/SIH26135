"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useRequireAuth } from "@/lib/hooks/useAuthGuard";
import api from "@/lib/api";
import type { SurveyTemplate, SurveyResponseRow } from "@/lib/types";
import { ClipboardList, MessageSquare, RefreshCw, Plus, Loader2 } from "lucide-react";
import Toast from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import Field from "@/components/ui/Field";

const CHANNEL_OPTIONS = ["All", "whatsapp", "sms", "web_portal"] as const;

export default function GovSurveysPage() {
  useRequireAuth("gov_admin");
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [responses, setResponses] = useState<SurveyResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const [channelFilter, setChannelFilter] = useState<string>("All");
  const [detailRow, setDetailRow] = useState<SurveyResponseRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", channel: "whatsapp" as "whatsapp" | "sms" | "web_portal", interval: "", body: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([
        api.get("/surveys/templates"),
        api.get("/surveys/responses", { params: { limit: 20 } }),
      ]);
      setTemplates(t.data);
      setResponses(r.data);
    } catch {
      setToast({ message: "Failed to load survey data. Please try again.", tone: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const filteredResponses =
    channelFilter === "All"
      ? responses
      : responses.filter((r) => r.channel === channelFilter);

  async function handleCreateTemplate() {
    if (!form.name.trim() || !form.body.trim()) {
      setToast({ message: "Name and body are required.", tone: "error" });
      return;
    }
    setCreating(true);
    try {
      await api.post("/surveys/templates", {
        name: form.name.trim(),
        channel: form.channel,
        body: form.body.trim(),
        interval: form.interval || null,
      });
      setToast({ message: "Template created successfully.", tone: "success" });
      setCreateOpen(false);
      setForm({ name: "", channel: "whatsapp", interval: "", body: "" });
      fetchData();
    } catch {
      setToast({ message: "Failed to create template.", tone: "error" });
    } finally {
      setCreating(false);
    }
  }

  const channelBadge = (channel: string) =>
    channel === "whatsapp"
      ? "bg-emerald-100 text-emerald-700"
      : channel === "sms"
        ? "bg-blue-100 text-blue-700"
        : "bg-purple-100 text-purple-700";

  const channelLabel = (channel: string) =>
    channel === "whatsapp"
      ? "WhatsApp"
      : channel === "sms"
        ? "SMS"
        : channel === "web_portal"
          ? "Web Portal"
          : channel;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar title="Survey Management" />
        <main className="p-6 space-y-6">
          {toast && <Toast message={toast.message} tone={toast.tone} />}

          <div className="glass p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="panel-title"><ClipboardList className="h-5 w-5 text-brand-600" /> Survey Templates</h2>
              <div className="flex gap-2">
                <button
                  onClick={fetchData}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Template
                </button>
              </div>
            </div>
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
                            {channelLabel(t.channel)}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="panel-title"><MessageSquare className="h-5 w-5 text-brand-600" /> Recent Responses</h2>
              <div className="flex items-center gap-2">
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="input-glass w-auto text-xs"
                >
                  {CHANNEL_OPTIONS.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch === "All" ? "All Channels" : channelLabel(ch)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={fetchData}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>
            {loading ? (
              <div className="space-y-3">
                <div className="glass skeleton h-16" />
                <div className="glass skeleton h-16" />
              </div>
            ) : filteredResponses.length === 0 ? (
              <p className="text-slate-500 text-sm">
                {responses.length === 0
                  ? "No survey responses yet."
                  : `No responses for ${channelLabel(channelFilter)}.`}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                      <th className="pb-2 pr-4">Channel</th>
                      <th className="pb-2 pr-4">Received</th>
                      <th className="pb-2 pr-4">Raw Text</th>
                      <th className="pb-2 pr-4">Outcome Created</th>
                      <th className="pb-2">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredResponses.map((r) => (
                      <tr key={r.id} className="hover:bg-white/70 transition-colors">
                        <td className="py-3 pr-4">
                          <span className={`chip ${channelBadge(r.channel)}`}>
                            {channelLabel(r.channel)}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">
                          {r.received_at ? new Date(r.received_at).toLocaleString() : "—"}
                        </td>
                        <td className="py-3 pr-4 text-slate-600 max-w-xs truncate">{r.raw_text || "—"}</td>
                        <td className="py-3 pr-4">
                          {r.outcome_id ? (
                            <span className="chip bg-emerald-100 text-emerald-700">Yes</span>
                          ) : (
                            <span className="chip bg-slate-100 text-slate-500">No</span>
                          )}
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => setDetailRow(r)}
                            className="text-xs font-medium text-brand-600 hover:text-brand-700 transition"
                          >
                            View
                          </button>
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

      <Modal
        open={!!detailRow}
        title="Response Details"
        subtitle={detailRow ? `ID: ${detailRow.id}` : undefined}
        onClose={() => setDetailRow(null)}
      >
        {detailRow && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">Channel</p>
                <span className={`chip ${channelBadge(detailRow.channel)}`}>
                  {channelLabel(detailRow.channel)}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-400">Received</p>
                <p className="text-slate-700">
                  {detailRow.received_at
                    ? new Date(detailRow.received_at).toLocaleString()
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Schedule ID</p>
                <p className="text-slate-600 font-mono text-xs break-all">
                  {detailRow.schedule_id}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Outcome</p>
                <p className="text-slate-700">
                  {detailRow.outcome_id ? (
                    <span className="chip bg-emerald-100 text-emerald-700">
                      Created
                    </span>
                  ) : (
                    <span className="chip bg-slate-100 text-slate-500">
                      None
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Raw Text</p>
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-sm text-slate-700 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                {detailRow.raw_text || "No raw text captured."}
              </div>
            </div>
            {detailRow.parsed && Object.keys(detailRow.parsed).length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Parsed Data</p>
                <pre className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 overflow-x-auto max-h-40 overflow-y-auto">
                  {JSON.stringify(detailRow.parsed, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={createOpen}
        title="Create Survey Template"
        subtitle="Define a new survey template for outcome tracking"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button
              onClick={() => setCreateOpen(false)}
              className="btn-ghost px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateTemplate}
              disabled={creating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {creating ? "Creating…" : "Create"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field
            label="Template Name"
            name="name"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            required
            placeholder="e.g. 3-Month Employment Check"
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Channel<span className="ml-0.5 text-rose-500">*</span>
            </span>
            <select
              value={form.channel}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  channel: e.target.value as typeof form.channel,
                }))
              }
              className="input-glass w-full"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="web_portal">Web Portal</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Interval
            </span>
            <select
              value={form.interval}
              onChange={(e) =>
                setForm((f) => ({ ...f, interval: e.target.value }))
              }
              className="input-glass w-full"
            >
              <option value="">None</option>
              <option value="3_month">3 Month</option>
              <option value="6_month">6 Month</option>
              <option value="12_month">12 Month</option>
            </select>
          </label>
          <Field
            label="Body"
            name="body"
            value={form.body}
            onChange={(v) => setForm((f) => ({ ...f, body: v }))}
            required
            placeholder="Template message body text"
          />
        </div>
      </Modal>
    </div>
  );
}
