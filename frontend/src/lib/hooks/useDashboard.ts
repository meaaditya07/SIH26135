"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import type {
  DashboardStats,
  PublicSummary,
  PublicScheme,
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
  PolicyAlert,
  CandidateListItem,
  CourseListItem,
  EmployerListItem,
  TrainingPartnerListItem,
  EnrollmentListItem,
  EnrollmentRich,
  OutcomeTimelineEntry,
  ShortlistCandidate,
  JobPostingListItem,
  CandidateCreatePayload,
  CourseCreatePayload,
  EmployerCreatePayload,
  TrainingPartnerCreatePayload,
  NotificationItem,
  EnrollmentCreatePayload,
  JobPostingCreatePayload,
  OutcomeImportResult,
  SectorBenchmark,
  PartnerCoverage,
  EmployerApplicationsOverview,
} from "@/lib/types";

export function usePublicSummary() {
  const [data, setData] = useState<PublicSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics/public-summary")
      .then((res) => setData(res.data ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function usePartnerCoverage() {
  const [data, setData] = useState<PartnerCoverage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics/partner-coverage")
      .then((res) => setData(res.data ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function usePublicSchemes(state?: string | null) {
  const [data, setData] = useState<PublicScheme[] | null>(null);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/analytics/public-schemes", { params: state ? { state } : {} })
      .then((res) => {
        setData(res.data?.schemes ?? []);
        setAvailableStates(res.data?.available_states ?? []);
      })
      .catch(() => {
        setData([]);
        setAvailableStates([]);
      })
      .finally(() => setLoading(false));
  }, [state]);

  return { data, availableStates, loading };
}

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

export function useEmployerApplicationsOverview(reloadKey = 0) {
  const [data, setData] = useState<EmployerApplicationsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/applications/overview")
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [reloadKey]);

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
  status: ApplicationStatus,
  feedback?: string | null,
  offer?: { start_date?: string | null; salary_offered?: number | null },
  interview?: { at?: string | null; note?: string | null }
) {
  const res = await api.patch(`/applications/${applicationId}/status`, {
    status,
    ...(feedback !== undefined && feedback !== null && feedback.trim() !== ""
      ? { feedback: feedback.trim() }
      : {}),
    ...(offer?.start_date ? { start_date: offer.start_date } : {}),
    ...(offer?.salary_offered != null
      ? { salary_offered: offer.salary_offered }
      : {}),
    ...(interview?.at ? { interview_at: interview.at } : {}),
    ...(interview?.note && interview.note.trim() !== ""
      ? { interview_note: interview.note.trim() }
      : {}),
  });
  return res.data as JobApplication;
}

export async function rescheduleInterview(
  applicationId: string,
  at: string | null,
  note?: string | null,
) {
  const res = await api.patch(`/applications/${applicationId}/interview`, {
    interview_at: at,
    ...(note !== undefined && note !== null && note.trim() !== ""
      ? { interview_note: note.trim() }
      : { interview_note: null }),
  });
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

export function useEmployerNotifications() {
  const [data, setData] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    api.get("/notifications/mine")
      .then((res) => setData(res.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}

export async function markEmployerNotificationRead(notificationId: string) {
  const res = await api.patch(`/notifications/${notificationId}/read`);
  return res.data;
}

export function usePolicyAlerts() {
  const [data, setData] = useState<PolicyAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics/alerts")
      .then((res) => setData(Array.isArray(res.data) ? res.data : res.data?.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useCandidates(limit = 20, skip = 0) {
  const [data, setData] = useState<CandidateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get("/candidates/", { params: { skip, limit } })
      .then((res) => setData(Array.isArray(res.data) ? res.data : res.data?.data ?? []))
      .catch((err) => {
        setError(err?.message ?? "Failed to load candidates");
        setData([]);
      })
      .finally(() => setLoading(false));
  }, [skip, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useCourses(limit = 20, skip = 0) {
  const [data, setData] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/courses/", { params: { skip, limit } })
      .then((res) => setData(Array.isArray(res.data) ? res.data : res.data?.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [limit, skip]);

  return { data, loading };
}

export function useEmployers(limit = 20, skip = 0) {
  const [data, setData] = useState<EmployerListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/employers/", { params: { skip, limit } })
      .then((res) => setData(Array.isArray(res.data) ? res.data : res.data?.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [limit, skip]);

  return { data, loading };
}

export function useTrainingPartners(limit = 20, skip = 0) {
  const [data, setData] = useState<TrainingPartnerListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/training-partners/", { params: { skip, limit } })
      .then((res) => setData(Array.isArray(res.data) ? res.data : res.data?.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [limit, skip]);

  return { data, loading };
}

export function useEnrollments(limit = 20, skip = 0) {
  const [data, setData] = useState<EnrollmentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/enrollments/", { params: { skip, limit } })
      .then((res) => setData(Array.isArray(res.data) ? res.data : res.data?.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [limit, skip]);

  return { data, loading };
}

export function useEnrollmentsEnriched(limit = 200, skip = 0) {
  const [data, setData] = useState<EnrollmentRich[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/enrollments/enriched", { params: { skip, limit } })
      .then((res) => setData(Array.isArray(res.data) ? res.data : res.data?.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [limit, skip]);

  return { data, loading };
}

export function useCandidateMe() {
  const [data, setData] = useState<CandidateListItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/candidates/me")
      .then((res) => setData(res.data ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export async function importOutcomesCsv(file: File): Promise<OutcomeImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/outcomes/import", formData, {
    headers: { "Content-Type": undefined },
  });
  return res.data as OutcomeImportResult;
}

export function useOutcomeTimeline(candidateId?: string) {
  const [data, setData] = useState<OutcomeTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!candidateId) {
      setLoading(false);
      return;
    }
    api.get(`/outcomes/candidate/${candidateId}/timeline`)
      .then((res) => {
        const list = res.data?.timeline ?? [];
        setData(Array.isArray(list) ? list : []);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [candidateId]);

  return { data, loading };
}

export function useJobPostings(limit = 50, skip = 0) {
  const [data, setData] = useState<JobPostingListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/job-postings/", { params: { skip, limit } })
      .then((res) => setData(Array.isArray(res.data) ? res.data : res.data?.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [limit, skip]);

  return { data, loading };
}

export async function createCandidate(payload: CandidateCreatePayload) {
  const res = await api.post("/candidates/", payload);
  return res.data as CandidateListItem;
}

export async function updateCandidate(id: string, payload: Partial<CandidateCreatePayload & { allow_employer_contact: boolean; preferred_job_states: string[] }>) {
  const res = await api.patch(`/candidates/${id}`, payload);
  return res.data as CandidateListItem;
}

export async function deactivateCandidate(id: string) {
  const res = await api.delete(`/candidates/${id}`);
  return res.data;
}

export async function createCourse(payload: CourseCreatePayload) {
  const res = await api.post("/courses/", payload);
  return res.data as CourseListItem;
}

export async function updateCourse(id: string, payload: CourseCreatePayload) {
  const res = await api.patch(`/courses/${id}`, payload);
  return res.data as CourseListItem;
}

export async function deleteCourse(id: string) {
  const res = await api.delete(`/courses/${id}`);
  return res.data;
}

export async function createEmployer(payload: EmployerCreatePayload) {
  const res = await api.post("/employers/", payload);
  return res.data as EmployerListItem;
}

export async function updateEmployer(id: string, payload: EmployerCreatePayload) {
  const res = await api.patch(`/employers/${id}`, payload);
  return res.data as EmployerListItem;
}

export async function deleteEmployer(id: string) {
  const res = await api.delete(`/employers/${id}`);
  return res.data;
}

export async function createTrainingPartner(payload: TrainingPartnerCreatePayload) {
  const res = await api.post("/training-partners/", payload);
  return res.data as TrainingPartnerListItem;
}

export async function updateTrainingPartner(id: string, payload: TrainingPartnerCreatePayload) {
  const res = await api.patch(`/training-partners/${id}`, payload);
  return res.data as TrainingPartnerListItem;
}

export async function deleteTrainingPartner(id: string) {
  const res = await api.delete(`/training-partners/${id}`);
  return res.data;
}

export async function approveTrainingPartner(id: string) {
  const res = await api.patch(`/training-partners/${id}/approve`);
  return res.data;
}

export async function createEnrollment(payload: EnrollmentCreatePayload) {
  const res = await api.post("/enrollments/", payload);
  return res.data as EnrollmentListItem;
}

export async function updateEnrollment(id: string, payload: EnrollmentCreatePayload) {
  const res = await api.patch(`/enrollments/${id}`, payload);
  return res.data as EnrollmentListItem;
}

export async function deleteEnrollment(id: string) {
  const res = await api.delete(`/enrollments/${id}`);
  return res.data;
}

export async function createJobPosting(payload: JobPostingCreatePayload) {
  const res = await api.post("/job-postings/", payload);
  return res.data as JobPostingListItem;
}

export async function updateJobPosting(id: string, payload: JobPostingCreatePayload) {
  const res = await api.patch(`/job-postings/${id}`, payload);
  return res.data as JobPostingListItem;
}

export async function deactivateJobPosting(id: string) {
  const res = await api.delete(`/job-postings/${id}`);
  return res.data;
}

export function useEmployerShortlist() {
  const [data, setData] = useState<ShortlistCandidate[] | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    api.get("/shortlist/")
      .then((res) => setData(res.data?.candidates ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}

export async function shortlistCandidate(candidateId: string) {
  const res = await api.post(`/shortlist/${candidateId}`);
  return res.data as { status: string; candidate_id: string };
}

export async function unshortlistCandidate(candidateId: string) {
  const res = await api.delete(`/shortlist/${candidateId}`);
  return res.data as { status: string; candidate_id: string };
}

export async function updateShortlistNote(candidateId: string, note: string | null) {
  const res = await api.patch(`/shortlist/${candidateId}/note`, { note });
  return res.data as { status: string; candidate_id: string; note: string | null };
}

export async function notifyShortlistedCandidates(jobId: string) {
  const res = await api.post(`/shortlist/${jobId}/notify`);
  return res.data as { notified: number };
}

export function useSectorBenchmark() {
  const [data, setData] = useState<SectorBenchmark | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics/sector-benchmark")
      .then((res) => setData(res.data ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
