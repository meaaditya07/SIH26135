export interface Candidate {
  id: string;
  phone: string;
  email: string | null;
  full_name: string;
  state: string | null;
  district: string | null;
  digilocker_status: "pending" | "verified" | "rejected";
  skill_tags: string[];
  is_active: boolean;
  created_at: string;
}

export interface TrainingPartner {
  id: string;
  name: string;
  registration_number: string;
  state: string;
  district: string;
  is_approved: boolean;
  created_at: string;
}

export interface Employer {
  id: string;
  name: string;
  industry: string | null;
  state: string | null;
  district: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface Course {
  id: string;
  training_partner_id: string;
  name: string;
  sector: string;
  duration_weeks: number;
  skills_taught: string[];
  scheme_id: string | null;
  cost_per_candidate: number | null;
  created_at: string;
}

export interface JobPosting {
  id: string;
  title: string;
  required_skills: string[];
  preferred_skills: string[];
  state: string | null;
  district: string | null;
  salary_min: number | null;
  salary_max: number | null;
  is_active: boolean;
  created_at: string;
}

export interface SkillGapScore {
  state: string;
  district: string | null;
  sector: string;
  skill_name: string;
  demand_score: number;
  supply_score: number;
  gap_score: number;
  gap_direction: "surplus" | "deficit" | "balanced";
  computed_at: string;
}

export interface SchemeAnalytics {
  scheme_id: string;
  period: string;
  total_enrolled: number;
  total_completed: number;
  completion_rate: number | null;
  total_placed_3m: number;
  total_placed_6m: number;
  total_placed_12m: number;
  cost_per_placement: number | null;
  roi_score: number | null;
  alert_status: string;
  state?: string;
  district?: string;
}

export interface DashboardStats {
  total_candidates: number;
  total_training_partners: number;
  total_employers: number;
  total_enrollments: number;
  total_courses: number;
  active_schemes: number;
  overall_placement_rate: number | null;
}

export interface PublicSummary {
  total_candidates: number;
  total_training_partners: number;
  total_employers: number;
  total_enrollments: number;
  total_courses: number;
  active_schemes: number;
  skills_taught: number;
  overall_placement_rate: number | null;
}

export interface PublicScheme {
  scheme_id: string;
  total_enrolled: number;
  completion_rate: number;
  placed_3m: number;
  placed_6m: number;
  placed_12m: number;
  total_cost: number;
  roi_score: number | null;
  avg_salary_at_placement: number | null;
}

export interface PartnerCoverageState {
  state: string;
  partner_count: number;
  course_count: number;
}

export interface PartnerCoverage {
  total_partners: number;
  total_states: number;
  total_courses: number;
  states: PartnerCoverageState[];
}

export type UserRole = "candidate" | "training_partner" | "employer" | "gov_admin";

export interface AuthTokens {
  access_token: string;
  token_type: string;
  user_id: string;
  role: UserRole;
}

export interface SurveyTemplate {
  id: string;
  name: string;
  channel: "whatsapp" | "sms" | "web_portal";
  template_sid: string | null;
  body: string;
  variables: Array<{ key: string; label: string }>;
  allowed_replies: string[];
  interval: string | null;
  version: number;
  is_active: boolean;
}

export interface SurveySchedule {
  id: string;
  candidate_id: string;
  enrollment_id: string;
  scheduled_interval: string;
  scheduled_date: string;
  channel: string;
  status: string;
  attempts: number;
  last_attempt_at: string | null;
  response_received_at: string | null;
}

export interface SurveyResponseRow {
  id: string;
  schedule_id: string;
  candidate_id: string;
  channel: string;
  raw_text: string | null;
  parsed: Record<string, unknown>;
  outcome_id: string | null;
  received_at: string | null;
}

export interface PortalInfo {
  schedule_id: string;
  scheduled_interval: string;
  status: string;
  candidate_name: string | null;
}

export interface TrendPoint {
  month: string;
  enrollments: number;
  completions: number;
}

export interface TrendData {
  months: TrendPoint[];
}

export interface TopSkill {
  skill: string;
  demand: number;
}

export interface TopSkillsData {
  skills: TopSkill[];
}

export interface CandidateJobMatch {
  job_id: string;
  title: string;
  company: string | null;
  state: string | null;
  district: string | null;
  salary_min: number | null;
  salary_max: number | null;
  match_score: number;
  skill_overlap: string[];
  skill_gaps: string[];
  location_compatible: boolean;
  location: string | null;
}

export interface CandidateJobMatchResponse {
  candidate_id: string;
  count: number;
  matches: CandidateJobMatch[];
}

export interface JobCandidateMatch {
  candidate_id: string;
  full_name: string;
  phone: string;
  state: string | null;
  district: string | null;
  skill_overlap: string[];
  skill_gaps: string[];
  match_score: number;
  location_compatible: boolean;
}

export interface JobCandidateMatchResponse {
  job_id: string;
  count: number;
  matches: JobCandidateMatch[];
}

export interface HeatmapPoint {
  lat: number | null;
  lng: number | null;
  state: string;
  district: string | null;
  avg_gap_score: number;
  top_deficit_skills: string[];
}

export interface PlacementFactor {
  factor: string;
  effect: string;
  detail: string;
}

export interface PlacementScore {
  candidate_id: string;
  full_name: string;
  placement_score: number;
  score_pct: number;
  factors: PlacementFactor[];
}

export interface PlacementBatchItem {
  candidate_id: string;
  full_name: string;
  placement_score: number;
  score_pct: number;
}

export interface PlacementBatchResponse {
  count: number;
  results: PlacementBatchItem[];
}

export interface MLHealth {
  model_ready: boolean;
}

export type ApplicationStatus =
  | "applied"
  | "shortlisted"
  | "interview"
  | "offered"
  | "hired"
  | "rejected";

export interface JobApplication {
  id: string;
  candidate_id: string;
  job_posting_id: string;
  status: ApplicationStatus;
  cover_note: string | null;
  match_score: number | null;
  feedback?: string | null;
  offer_start_date?: string | null;
  offer_salary?: number | null;
  interview_at?: string | null;
  interview_note?: string | null;
  applied_at: string;
  updated_at: string;
}

export interface ApplicantDetail {
  full_name: string | null;
  state: string | null;
  district: string | null;
  phone: string | null;
}

export interface JobApplicant extends JobApplication {
  skill_overlap: string[];
  skill_gaps: string[];
  candidate: ApplicantDetail;
}

export interface JobApplicantsResponse {
  job_id: string;
  title: string;
  count: number;
  applicants: JobApplicant[];
}

export interface PipelineResponse {
  job_id: string;
  title: string;
  total_applicants: number;
  stages: Record<string, number>;
  hired: number;
}

export interface OverviewApplication {
  id: string;
  candidate_id: string;
  job_posting_id: string;
  status: string;
  match_score: number | null;
  cover_note: string | null;
  feedback: string | null;
  offer_start_date: string | null;
  offer_salary: number | null;
  interview_at: string | null;
  interview_note: string | null;
  applied_at: string;
  candidate: {
    full_name: string | null;
    state: string | null;
    district: string | null;
    phone: string | null;
    skill_tags: string[];
  };
  job: {
    title: string | null;
    location: string | null;
    state: string | null;
  };
}

export interface EmployerApplicationsOverview {
  employer_id: string;
  total: number;
  status_counts: Record<string, number>;
  applications: OverviewApplication[];
}

export type ReportFormat = "csv" | "xlsx" | "pdf";

export interface ReportTypeInfo {
  report_type: string;
  label: string;
  formats: ReportFormat[];
}

export interface AvailableReports {
  reports: ReportTypeInfo[];
  formats: ReportFormat[];
}

export interface AnalyticsSnapshot {
  generated_at: string;
  counts: {
    total_candidates: number;
    total_training_partners: number;
    total_employers: number;
    total_enrollments: number;
    total_courses: number;
  };
  outcomes: {
    total_outcomes: number;
    total_employed: number;
    overall_placement_rate: number | null;
  };
  placements_per_scheme: Record<string, number>;
}

export type NotificationChannel = "whatsapp" | "sms";
export type NotificationStatus = "queued" | "sent" | "failed";

export interface AppNotification {
  id: string;
  kind: string | null;
  title: string | null;
  body: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  created_at: string | null;
  read_at: string | null;
}

export interface NotificationStats {
  total: number;
  by_status: {
    queued: number;
    sent: number;
    failed: number;
  };
  delivery_rate: number;
}

export interface NotificationTemplateInfo {
  id: string;
  name: string;
  channel: NotificationChannel;
  kind: string | null;
  body: string;
}

export interface PolicyAlert {
  scheme_id: string;
  alert_status: "underperforming" | "alert";
  alert_reason: string | null;
  cost_per_placement: number | null;
  roi_score: number | null;
  computed_at: string | null;
}

export interface CandidateListItem {
  id: string;
  phone: string;
  email: string | null;
  full_name: string;
  state: string | null;
  district: string | null;
  digilocker_status: string;
  verified_docs?: Record<string, unknown>;
  skill_tags: string[];
  is_active: boolean;
  created_at: string;
  allow_employer_contact?: boolean;
  preferred_job_states?: string[];
}

export interface ShortlistCandidate {
  candidate_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  state: string | null;
  district: string | null;
  digilocker_status: "pending" | "verified" | "rejected";
  skill_tags: string[];
  shortlisted_at: string | null;
  note: string | null;
}

export interface ShortlistResponse {
  count: number;
  candidates: ShortlistCandidate[];
}

export interface EnrollmentRich {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_phone: string;
  course_id: string;
  course_name: string;
  training_partner_id: string;
  enrollment_date: string;
  completion_date: string | null;
  is_completed: boolean;
  certificate_id: string | null;
  is_employed: boolean | null;
  is_self_employed: boolean;
  current_job_title: string | null;
  monthly_salary: number | null;
  survey_interval: string | null;
  job_location: string | null;
}

export interface OutcomeTimelineEntry {
  interval: string;
  survey_date: string;
  is_employed: boolean;
  job_title: string | null;
  monthly_salary: number | null;
  job_location: string | null;
  is_relevant: boolean | null;
  skills_used: string[];
  months_at_employer: number | null;
  channel: string | null;
}

export interface OutcomeImportError {
  row: number;
  error: string;
}

export interface OutcomeImportResult {
  imported: number;
  errors: OutcomeImportError[];
}

export interface CourseListItem {
  id: string;
  training_partner_id: string;
  name: string;
  sector: string;
  duration_weeks: number;
  total_seats?: number | null;
  skills_taught: string[];
  scheme_id: string | null;
  cost_per_candidate: number | null;
  created_at: string;
}

export interface EmployerListItem {
  id: string;
  name: string;
  industry: string | null;
  state: string | null;
  district: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface TrainingPartnerListItem {
  id: string;
  name: string;
  registration_number: string | null;
  state: string | null;
  district: string | null;
  is_approved: boolean;
  created_at: string;
}

export interface EnrollmentListItem {
  id: string;
  candidate_id: string;
  course_id: string;
  training_partner_id: string;
  enrollment_date: string;
  completion_date: string | null;
  is_completed: boolean;
  certificate_id: string | null;
  created_at: string;
}

export interface JobPostingListItem {
  id: string;
  employer_id: string | null;
  title: string;
  required_skills: string[];
  preferred_skills: string[];
  location: string | null;
  state: string | null;
  district: string | null;
  salary_min: number | null;
  salary_max: number | null;
  is_active: boolean;
  created_at: string;
}

export interface CandidateCreatePayload {
  phone: string;
  email?: string | null;
  full_name: string;
  aadhaar_number: string;
  date_of_birth?: string | null;
  gender?: string | null;
  state?: string | null;
  district?: string | null;
  pincode?: string | null;
}

export interface CourseCreatePayload {
  training_partner_id: string;
  name: string;
  sector: string;
  duration_weeks: number;
  ncvt_code?: string | null;
  skills_taught?: string[];
  scheme_id?: string | null;
  cost_per_candidate?: number | null;
}

export interface EmployerCreatePayload {
  name: string;
  industry?: string | null;
  state?: string | null;
  district?: string | null;
  website?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface TrainingPartnerCreatePayload {
  name: string;
  registration_number: string;
  pan_number?: string | null;
  state: string;
  district: string;
  address?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface EnrollmentCreatePayload {
  candidate_id: string;
  course_id: string;
  training_partner_id: string;
  enrollment_date: string;
}

export interface JobPostingCreatePayload {
  employer_id?: string | null;
  title: string;
  description_raw?: string | null;
  required_skills?: string[];
  preferred_skills?: string[];
  location?: string | null;
  state?: string | null;
  district?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  experience_min_months?: number | null;
}

export interface NotificationItem {
  id: string;
  kind: string | null;
  title: string | null;
  body: string | null;
  channel: string;
  status: string;
  created_at: string | null;
  read_at: string | null;
}

export type FunnelStage = "applied" | "shortlisted" | "interview" | "offered" | "hired";

export interface BenchmarkFunnel {
  total: number;
  counts: Record<FunnelStage, number>;
  pct: Record<FunnelStage, number>;
}

export interface SectorBenchmarkSide {
  job_count: number;
  total: number;
  counts: Record<FunnelStage, number>;
  pct: Record<FunnelStage, number>;
  avg_match_score: number | null;
  hired_rate: number;
}

export interface SectorBenchmark {
  industry: string;
  sector: SectorBenchmarkSide;
  own: SectorBenchmarkSide;
}
