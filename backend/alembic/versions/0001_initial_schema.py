"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-09-02
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ─── Enums ───
    verification_status = postgresql.ENUM("pending", "verified", "rejected", name="verification_status")
    survey_interval = postgresql.ENUM("3_month", "6_month", "12_month", name="survey_interval")
    survey_interval_type = postgresql.ENUM("3_month", "6_month", "12_month", name="survey_interval_type")
    contact_channel = postgresql.ENUM("whatsapp", "sms", "web_portal", name="contact_channel")
    contact_channel_type = postgresql.ENUM("whatsapp", "sms", "web_portal", name="contact_channel_type")
    scheme_status = postgresql.ENUM("active", "completed", "underperforming", "alert", name="scheme_status")

    verification_status.create(op.get_bind(), checkfirst=True)
    survey_interval.create(op.get_bind(), checkfirst=True)
    survey_interval_type.create(op.get_bind(), checkfirst=True)
    contact_channel.create(op.get_bind(), checkfirst=True)
    contact_channel_type.create(op.get_bind(), checkfirst=True)
    scheme_status.create(op.get_bind(), checkfirst=True)

    # ─── Candidates ───
    op.create_table(
        "candidates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("aadhaar_hash", sa.String(64), nullable=False),
        sa.Column("phone", sa.String(15), nullable=False),
        sa.Column("email", sa.String(255)),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("date_of_birth", sa.Text()),
        sa.Column("gender", sa.String(20)),
        sa.Column("state", sa.String(100)),
        sa.Column("district", sa.String(100)),
        sa.Column("pincode", sa.String(10)),
        sa.Column("digilocker_status", verification_status, server_default="pending"),
        sa.Column("digilocker_token_encrypted", sa.Text()),
        sa.Column("verified_docs", postgresql.JSONB(), server_default="{}"),
        sa.Column("skill_tags", postgresql.JSONB(), server_default="[]"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("ix_candidates_aadhaar_hash", "candidates", ["aadhaar_hash"], unique=True)
    op.create_index("ix_candidates_phone", "candidates", ["phone"])
    op.create_index("ix_candidates_state", "candidates", ["state"])
    op.create_index("ix_candidates_district", "candidates", ["district"])

    # ─── Training Partners ───
    op.create_table(
        "training_partners",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("registration_number", sa.String(50), nullable=False, unique=True),
        sa.Column("pan_number", sa.String(10)),
        sa.Column("state", sa.String(100), nullable=False),
        sa.Column("district", sa.String(100), nullable=False),
        sa.Column("address", sa.Text()),
        sa.Column("contact_person", sa.String(255)),
        sa.Column("phone", sa.String(15)),
        sa.Column("email", sa.String(255)),
        sa.Column("is_approved", sa.Boolean(), server_default="false"),
        sa.Column("approved_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("ix_training_partners_state", "training_partners", ["state"])

    # ─── Employers ───
    op.create_table(
        "employers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("industry", sa.String(100)),
        sa.Column("state", sa.String(100)),
        sa.Column("district", sa.String(100)),
        sa.Column("website", sa.String(500)),
        sa.Column("contact_person", sa.String(255)),
        sa.Column("phone", sa.String(15)),
        sa.Column("email", sa.String(255)),
        sa.Column("is_verified", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("ix_employers_industry", "employers", ["industry"])
    op.create_index("ix_employers_state", "employers", ["state"])

    # ─── Users ───
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("phone", sa.String(15), nullable=False, unique=True),
        sa.Column("email", sa.String(255), unique=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="candidate"),
        sa.Column("password_hash", sa.String(255)),
        sa.Column("aadhaar_hash", sa.String(64), unique=True),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("is_verified", sa.Boolean(), server_default="false"),
        sa.Column("last_login_at", sa.DateTime()),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("candidates.id"), unique=True),
        sa.Column("training_partner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("training_partners.id")),
        sa.Column("employer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employers.id")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("ix_users_role", "users", ["role"])

    # ─── OTP Records ───
    op.create_table(
        "otp_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("phone", sa.String(15), nullable=False),
        sa.Column("otp_hash", sa.String(64), nullable=False),
        sa.Column("purpose", sa.String(20), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used", sa.Boolean(), server_default="false"),
        sa.Column("attempts", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("ix_otp_records_phone", "otp_records", ["phone"])

    # ─── Courses ───
    op.create_table(
        "courses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("training_partner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("training_partners.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("sector", sa.String(100), nullable=False),
        sa.Column("duration_weeks", sa.Integer(), nullable=False),
        sa.Column("ncvt_code", sa.String(50)),
        sa.Column("curriculum_snapshot", postgresql.JSONB(), server_default="{}"),
        sa.Column("skills_taught", postgresql.JSONB(), server_default="[]"),
        sa.Column("scheme_id", sa.String(50)),
        sa.Column("cost_per_candidate", sa.Numeric(10, 2)),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("ix_courses_sector", "courses", ["sector"])
    op.create_index("ix_courses_scheme_id", "courses", ["scheme_id"])

    # ─── Job Postings ───
    op.create_table(
        "job_postings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("employer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employers.id")),
        sa.Column("source_url", sa.String(1000)),
        sa.Column("source_portal", sa.String(100)),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description_raw", sa.Text()),
        sa.Column("description_cleaned", sa.Text()),
        sa.Column("required_skills", postgresql.JSONB(), server_default="[]"),
        sa.Column("preferred_skills", postgresql.JSONB(), server_default="[]"),
        sa.Column("location", sa.String(255)),
        sa.Column("state", sa.String(100)),
        sa.Column("district", sa.String(100)),
        sa.Column("salary_min", sa.Numeric(12, 2)),
        sa.Column("salary_max", sa.Numeric(12, 2)),
        sa.Column("experience_min_months", sa.Integer()),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("scraped_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("ix_job_postings_state", "job_postings", ["state"])
    op.create_index("ix_job_postings_district", "job_postings", ["district"])

    # ─── Enrollments ───
    op.create_table(
        "enrollments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("candidates.id"), nullable=False),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("courses.id"), nullable=False),
        sa.Column("training_partner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("training_partners.id"), nullable=False),
        sa.Column("enrollment_date", sa.Date(), nullable=False),
        sa.Column("completion_date", sa.Date()),
        sa.Column("is_completed", sa.Boolean(), server_default="false"),
        sa.Column("certificate_id", sa.String(100)),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )

    # ─── Employment Outcomes ───
    op.create_table(
        "employment_outcomes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("candidates.id"), nullable=False),
        sa.Column("enrollment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("enrollments.id"), nullable=False),
        sa.Column("employer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employers.id")),
        sa.Column("survey_interval", survey_interval, nullable=False),
        sa.Column("survey_date", sa.Date(), nullable=False),
        sa.Column("is_employed", sa.Boolean(), nullable=False),
        sa.Column("is_self_employed", sa.Boolean(), server_default="false"),
        sa.Column("current_job_title", sa.String(255)),
        sa.Column("monthly_salary", sa.Numeric(12, 2)),
        sa.Column("salary_currency", sa.String(3), server_default="INR"),
        sa.Column("job_location", sa.String(255)),
        sa.Column("is_job_relevant_to_training", sa.Boolean()),
        sa.Column("skills_used", postgresql.JSONB(), server_default="[]"),
        sa.Column("additional_skills_acquired", postgresql.JSONB(), server_default="[]"),
        sa.Column("employer_retention_confirmed", sa.Boolean(), server_default="false"),
        sa.Column("months_at_employer", sa.Numeric(4, 1)),
        sa.Column("response_channel", contact_channel),
        sa.Column("self_reported", sa.Boolean(), server_default="false"),
        sa.Column("verified_by_employer", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.UniqueConstraint("candidate_id", "enrollment_id", "survey_interval", name="uq_outcome_per_interval"),
    )
    op.create_index("ix_employment_outcomes_candidate_id", "employment_outcomes", ["candidate_id"])

    # ─── Survey Schedules ───
    op.create_table(
        "survey_schedules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("candidates.id"), nullable=False),
        sa.Column("enrollment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("enrollments.id"), nullable=False),
        sa.Column("scheduled_interval", survey_interval_type, nullable=False),
        sa.Column("scheduled_date", sa.Date(), nullable=False),
        sa.Column("channel", contact_channel_type, nullable=False),
        sa.Column("status", sa.String(20), server_default="scheduled"),
        sa.Column("message_template_id", sa.String(100)),
        sa.Column("last_attempt_at", sa.DateTime()),
        sa.Column("response_received_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("ix_survey_schedules_candidate_id", "survey_schedules", ["candidate_id"])

    # ─── Skill Taxonomy ───
    op.create_table(
        "skill_taxonomy",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("sector", sa.String(100)),
        sa.Column("normalized_name", sa.String(255), nullable=False),
        sa.Column("embedding_id", sa.String(100)),
        sa.Column("is_trending", sa.Boolean(), server_default="false"),
        sa.Column("trend_score", sa.Numeric(5, 2)),
        sa.Column("last_analyzed_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.UniqueConstraint("name", "category", name="uq_skill_name_category"),
    )
    op.create_index("ix_skill_taxonomy_name", "skill_taxonomy", ["name"])
    op.create_index("ix_skill_taxonomy_normalized_name", "skill_taxonomy", ["normalized_name"])

    # ─── Skill Gap Scores ───
    op.create_table(
        "skill_gap_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("state", sa.String(100), nullable=False),
        sa.Column("district", sa.String(100)),
        sa.Column("sector", sa.String(100), nullable=False),
        sa.Column("skill_name", sa.String(255), nullable=False),
        sa.Column("demand_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("supply_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("gap_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("gap_direction", sa.String(10)),
        sa.Column("computed_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("model_version", sa.String(50)),
    )
    op.create_index("ix_gap_region_date", "skill_gap_scores", ["state", "district", "computed_at"])
    op.create_index("ix_skill_gap_scores_state", "skill_gap_scores", ["state"])

    # ─── Scheme Analytics ───
    op.create_table(
        "scheme_analytics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("scheme_id", sa.String(50), nullable=False),
        sa.Column("training_partner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("training_partners.id")),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("courses.id")),
        sa.Column("period", sa.Date(), nullable=False),
        sa.Column("state", sa.String(100)),
        sa.Column("district", sa.String(100)),
        sa.Column("total_enrolled", sa.Integer(), server_default="0"),
        sa.Column("total_completed", sa.Integer(), server_default="0"),
        sa.Column("completion_rate", sa.Numeric(5, 2)),
        sa.Column("total_placed_3m", sa.Integer(), server_default="0"),
        sa.Column("total_placed_6m", sa.Integer(), server_default="0"),
        sa.Column("total_placed_12m", sa.Integer(), server_default="0"),
        sa.Column("retention_3m", sa.Numeric(5, 2)),
        sa.Column("retention_6m", sa.Numeric(5, 2)),
        sa.Column("retention_12m", sa.Numeric(5, 2)),
        sa.Column("total_cost", sa.Numeric(14, 2)),
        sa.Column("cost_per_placement", sa.Numeric(10, 2)),
        sa.Column("avg_salary_at_placement", sa.Numeric(10, 2)),
        sa.Column("roi_score", sa.Numeric(8, 4)),
        sa.Column("curriculum_market_fit_score", sa.Numeric(5, 2)),
        sa.Column("alert_status", scheme_status, server_default="active"),
        sa.Column("alert_reason", sa.String(500)),
        sa.Column("computed_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("ix_scheme_partner_period", "scheme_analytics", ["scheme_id", "training_partner_id", "period"])
    op.create_index("ix_scheme_analytics_scheme_id", "scheme_analytics", ["scheme_id"])

    # ─── Candidate Job Matches ───
    op.create_table(
        "candidate_job_matches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("candidates.id"), nullable=False),
        sa.Column("job_posting_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("job_postings.id"), nullable=False),
        sa.Column("match_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("skill_overlap", postgresql.JSONB(), server_default="[]"),
        sa.Column("skill_gaps", postgresql.JSONB(), server_default="[]"),
        sa.Column("location_compatible", sa.Boolean(), server_default="true"),
        sa.Column("salary_compatible", sa.Boolean(), server_default="true"),
        sa.Column("recommended_at", sa.DateTime(), server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("candidate_job_matches")
    op.drop_table("scheme_analytics")
    op.drop_table("skill_gap_scores")
    op.drop_table("skill_taxonomy")
    op.drop_table("survey_schedules")
    op.drop_table("employment_outcomes")
    op.drop_table("enrollments")
    op.drop_table("job_postings")
    op.drop_table("courses")
    op.drop_table("otp_records")
    op.drop_table("users")
    op.drop_table("employers")
    op.drop_table("training_partners")
    op.drop_table("candidates")

    op.execute("DROP TYPE IF EXISTS verification_status;")
    op.execute("DROP TYPE IF EXISTS survey_interval;")
    op.execute("DROP TYPE IF EXISTS survey_interval_type;")
    op.execute("DROP TYPE IF EXISTS contact_channel;")
    op.execute("DROP TYPE IF EXISTS contact_channel_type;")
    op.execute("DROP TYPE IF EXISTS scheme_status;")
    op.execute("DROP TYPE IF EXISTS user_role;")
