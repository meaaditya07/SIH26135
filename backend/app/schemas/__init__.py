from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from uuid import UUID


# ─── Auth ───

class LoginRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)
    role: str = Field(default="candidate", pattern="^(candidate|training_partner|employer|gov_admin)$")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str


class DigiLockerCallback(BaseModel):
    code: str
    state: Optional[str] = None


# ─── Candidate ───

class CandidateCreate(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)
    email: Optional[str] = None
    full_name: str = Field(..., min_length=2, max_length=255)
    aadhaar_number: str = Field(..., min_length=12, max_length=12)
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    pincode: Optional[str] = None


class CandidateResponse(BaseModel):
    id: UUID
    phone: str
    email: Optional[str]
    full_name: str
    state: Optional[str]
    district: Optional[str]
    digilocker_status: str
    verified_docs: dict = Field(default_factory=dict)
    skill_tags: list
    allow_employer_contact: bool = True
    preferred_job_states: list = Field(default_factory=list)
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CandidateUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    pincode: Optional[str] = None
    skill_tags: Optional[list[str]] = None
    allow_employer_contact: Optional[bool] = None
    preferred_job_states: Optional[list[str]] = None


# ─── Training Partner ───

class TrainingPartnerCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    registration_number: str = Field(..., min_length=3, max_length=50)
    pan_number: Optional[str] = Field(None, max_length=10)
    state: str = Field(..., min_length=2, max_length=100)
    district: str = Field(..., min_length=2, max_length=100)
    address: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class TrainingPartnerResponse(BaseModel):
    id: UUID
    name: str
    registration_number: str
    state: str
    district: str
    is_approved: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TrainingPartnerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    registration_number: Optional[str] = Field(None, min_length=3, max_length=50)
    pan_number: Optional[str] = Field(None, max_length=10)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    district: Optional[str] = Field(None, min_length=2, max_length=100)
    address: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


# ─── Employer ───

class EmployerCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    industry: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    website: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class EmployerResponse(BaseModel):
    id: UUID
    name: str
    industry: Optional[str]
    state: Optional[str]
    district: Optional[str]
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class EmployerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    industry: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    website: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


# ─── Course ───

class CourseCreate(BaseModel):
    training_partner_id: UUID
    name: str = Field(..., min_length=2, max_length=255)
    sector: str = Field(..., min_length=2, max_length=100)
    duration_weeks: int = Field(..., ge=1, le=200)
    ncvt_code: Optional[str] = None
    skills_taught: list[str] = []
    scheme_id: Optional[str] = None
    cost_per_candidate: Optional[float] = None


class CourseResponse(BaseModel):
    id: UUID
    training_partner_id: UUID
    name: str
    sector: str
    duration_weeks: int
    total_seats: Optional[int] = None
    skills_taught: list
    scheme_id: Optional[str]
    cost_per_candidate: Optional[float]
    created_at: datetime

    model_config = {"from_attributes": True}


class CourseUpdate(BaseModel):
    training_partner_id: Optional[UUID] = None
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    sector: Optional[str] = Field(None, min_length=2, max_length=100)
    duration_weeks: Optional[int] = Field(None, ge=1, le=200)
    ncvt_code: Optional[str] = None
    skills_taught: Optional[list[str]] = None
    scheme_id: Optional[str] = None
    cost_per_candidate: Optional[float] = None


# ─── Job Posting ───

class JobPostingCreate(BaseModel):
    employer_id: Optional[UUID] = None
    title: str = Field(..., min_length=5, max_length=500)
    description_raw: Optional[str] = None
    required_skills: list[str] = []
    preferred_skills: list[str] = []
    location: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    experience_min_months: Optional[int] = None


class JobPostingResponse(BaseModel):
    id: UUID
    title: str
    required_skills: list
    preferred_skills: list
    state: Optional[str]
    district: Optional[str]
    salary_min: Optional[float]
    salary_max: Optional[float]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Skill Gap ───

class SkillGapResponse(BaseModel):
    state: str
    district: Optional[str]
    sector: str
    skill_name: str
    demand_score: float
    supply_score: float
    gap_score: float
    gap_direction: str
    computed_at: datetime

    model_config = {"from_attributes": True}


# ─── Analytics ───

class SchemeAnalyticsResponse(BaseModel):
    scheme_id: str
    period: str
    state: Optional[str] = None
    district: Optional[str] = None
    total_enrolled: int
    total_completed: int
    completion_rate: Optional[float]
    total_placed_3m: int
    total_placed_6m: int
    total_placed_12m: int
    cost_per_placement: Optional[float]
    roi_score: Optional[float]
    alert_status: str

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_candidates: int
    total_training_partners: int
    total_employers: int
    total_enrollments: int
    total_courses: int
    active_schemes: int
    overall_placement_rate: Optional[float]
