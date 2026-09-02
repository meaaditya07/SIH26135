"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import type {
  DashboardStats,
  SchemeAnalytics,
  SkillGapScore,
  TrendData,
  TopSkillsData,
  HeatmapPoint,
  CandidateJobMatchResponse,
  JobCandidateMatchResponse,
  PlacementScore,
  JobApplication,
  JobApplicantsResponse,
  PipelineResponse,
  ApplicationStatus,
  AvailableReports,
  AnalyticsSnapshot,
  ReportFormat,
  AppNotification,
  NotificationStats,
} from "@/lib/types";

export function useDashboardStats() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/analytics/dashboard")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

export function useEnrollmentTrends(months = 6) {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics/trends", { params: { months } })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [months]);

  return { data, loading };
}

export function useTopSkills(limit = 10) {
  const [data, setData] = useState<TopSkillsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics/top-skills", { params: { limit } })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [limit]);

  return { data, loading };
}

export function useHeatmapData(state?: string, sector?: string) {
  const [data, setData] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (state) params.state = state;
    if (sector) params.sector = sector;
    api.get("/skill-gap/heatmap-data", { params })
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        setData(rows);
      })
      .finally(() => setLoading(false));
  }, [state, sector]);

  return { data, loading };
}

export function useCandidateJobMatches(candidateId?: string, minScore = 0) {
  const [data, setData] = useState<CandidateJobMatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!candidateId) return;
    setLoading(true);
    api.get(`/matches/candidates/${candidateId}/jobs`, { params: { min_score: minScore } })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [candidateId, minScore]);

  return { data, loading, error };
}

export function useJobCandidateMatches(jobId?: string, minScore = 0) {
  const [data, setData] = useState<JobCandidateMatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    api.get(`/matches/jobs/${jobId}/candidates`, { params: { min_score: minScore } })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [jobId, minScore]);

  return { data, loading, error };
}

export function usePlacementScore(candidateId?: string) {
  const [data, setData] = useState<PlacementScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!candidateId) return;
    setLoading(true);
    api.get(`/ml/placement/${candidateId}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [candidateId]);

  return { data, loading, error };
}

export function usePlacementHealth() {
  const [ready, setReady] = useState<boolean | null>(null);
  useEffect(() => {
    api.get("/ml/health")
      .then((res) => setReady(res.data?.model_ready ?? false))
      .catch(() => setReady(false));
  }, []);
  return { ready };
}

export function useSchemeROI(schemeId?: string) {
  const [data, setData] = useState<SchemeAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = schemeId ? { scheme_id: schemeId } : {};
    api.get("/analytics/scheme-roi", { params })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [schemeId]);

  return { data, loading };
}

export function useSkillGaps(state: string) {
  const [data, setData] = useState<SkillGapScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!state) return;
    api.get("/skill-gap/regional", { params: { state } })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [state]);

  return { data, loading };
}

export function useMyApplications(statusFilter?: string) {
  const [data, setData] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = statusFilter ? { status_filter: statusFilter } : {};
    api.get("/applications/mine", { params })
      .then((res) => setData(res.data ?? []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return { data, loading };
}

export function useJobApplicants(jobId?: string, statusFilter?: string, reloadKey = 0) {
  const [data, setData] = useState<JobApplicantsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    const params = statusFilter ? { status_filter: statusFilter } : {};
    api.get(`/applications/job/${jobId}`, { params })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [jobId, statusFilter, reloadKey]);

  return { data, loading };
}

export function usePipeline(jobId?: string, reloadKey = 0) {
  const [data, setData] = useState<PipelineResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    api.get(`/applications/pipeline/${jobId}`)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [jobId, reloadKey]);

  return { data, loading };
}

export async function applyToJob(jobPostingId: string, coverNote?: string) {
  const res = await api.post("/applications/", {
    job_posting_id: jobPostingId,
    cover_note: coverNote || null,
  });
  return res.data as JobApplication;
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
) {
  const res = await api.patch(`/applications/${applicationId}/status`, { status });
  return res.data as JobApplication;
}

export function useAvailableReports() {
  const [data, setData] = useState<AvailableReports | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/reports/available")
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useAnalyticsSnapshot() {
  const [data, setData] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/reports/snapshot")
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export async function downloadReport(reportType: string, format: ReportFormat) {
  const res = await api.get(`/reports/${reportType}.${format}`, {
    responseType: "blob",
  });
  const disposition = res.headers["content-disposition"] ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const fallback = `skilltrace-${reportType}.${format}`;
  const filename = match ? match[1] : fallback;

  const url = window.URL.createObjectURL(res.data);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function useMyNotifications(status?: string) {
  const [data, setData] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = status ? { status } : {};
    api.get("/notifications/mine", { params })
      .then((res) => setData(res.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [status]);

  return { data, loading };
}

export function useNotificationStats() {
  const [data, setData] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/notifications/stats")
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export async function markNotificationRead(notificationId: string) {
  const res = await api.patch(`/notifications/${notificationId}/read`);
  return res.data;
}

export async function sendNotification(payload: {
  recipient_type: string;
  recipient_id?: string;
  channel: "whatsapp" | "sms";
  kind: string;
  template_name: string;
  variables?: Record<string, string>;
}) {
  const res = await api.post("/notifications/send", payload);
  return res.data;
}
