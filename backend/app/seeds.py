"""Seed script — populate initial demo data for SkillTrace AI.

Usage: python -m app.seeds
"""
import asyncio
from datetime import date, timedelta

from app.database import async_session_factory
from app.models.candidate import Candidate
from app.models.training_partner import TrainingPartner
from app.models.employer import Employer
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.skill_taxonomy import SkillTaxonomy
from app.models.survey_template import SurveyTemplate
from app.models.user import User
from app.core.security import hash_aadhaar, pwd_context


async def seed() -> None:
    async with async_session_factory() as db:
        # ─── Training Partners ───
        tp1 = TrainingPartner(
            name="SkillEd Solutions",
            registration_number="TP2026001",
            pan_number="ABCDE1234F",
            state="Karnataka",
            district="Bengaluru Urban",
            contact_person="Manish Verma",
            phone="9800000001",
            email="info@skilled.in",
            is_approved=True,
        )
        tp2 = TrainingPartner(
            name="NexGen Training Academy",
            registration_number="TP2026002",
            pan_number="XYZAB5678G",
            state="Maharashtra",
            district="Pune",
            contact_person="Rohit Joshi",
            phone="9800000002",
            email="admin@nexgen.in",
            is_approved=True,
        )
        db.add_all([tp1, tp2])
        await db.flush()

        # ─── Employers ───
        emp1 = Employer(
            name="Infosys Ltd",
            industry="IT Services",
            state="Karnataka",
            district="Bengaluru Urban",
            website="https://infosys.com",
            contact_person="HR Team",
            phone="9900000001",
            email="hiring@infosys.com",
            is_verified=True,
        )
        emp2 = Employer(
            name="TCS",
            industry="IT Services",
            state="Maharashtra",
            district="Pune",
            website="https://tcs.com",
            contact_person="HR Team",
            phone="9900000002",
            email="careers@tcs.com",
            is_verified=True,
        )
        db.add_all([emp1, emp2])
        await db.flush()

        # ─── Courses ───
        course1 = Course(
            training_partner_id=tp1.id,
            name="Python Programming (Full-Stack)",
            sector="IT",
            duration_weeks=24,
            ncvt_code="IT-2026-PY-01",
            skills_taught=["Python", "Django", "SQL", "Git", "FastAPI"],
            scheme_id="PMKVY-4.0",
            cost_per_candidate=15000.00,
        )
        course2 = Course(
            training_partner_id=tp1.id,
            name="Data Analysis with Python",
            sector="IT",
            duration_weeks=16,
            ncvt_code="IT-2026-DA-01",
            skills_taught=["Python", "Pandas", "Numpy", "SQL", "Tableau"],
            scheme_id="PMKVY-4.0",
            cost_per_candidate=12000.00,
        )
        course3 = Course(
            training_partner_id=tp2.id,
            name="Frontend Web Development",
            sector="IT",
            duration_weeks=20,
            ncvt_code="IT-2026-FE-01",
            skills_taught=["HTML", "CSS", "JavaScript", "React", "Node.js"],
            scheme_id="NSDC",
            cost_per_candidate=11000.00,
        )
        db.add_all([course1, course2, course3])
        await db.flush()

        # ─── Candidates ───
        c1 = Candidate(
            aadhaar_hash=hash_aadhaar("123456789012"),
            phone="9876543210",
            email="rahul.sharma@example.com",
            full_name="Rahul Sharma",
            state="Karnataka",
            district="Bengaluru Urban",
            digilocker_status="verified",
            skill_tags=["Python", "SQL", "Django", "Git"],
        )
        c2 = Candidate(
            aadhaar_hash=hash_aadhaar("234567890123"),
            phone="9876543211",
            email="priya.patel@example.com",
            full_name="Priya Patel",
            state="Maharashtra",
            district="Pune",
            digilocker_status="verified",
            skill_tags=["Python", "Data Analysis", "Pandas", "SQL"],
        )
        c3 = Candidate(
            aadhaar_hash=hash_aadhaar("345678901234"),
            phone="9876543212",
            email="amit.kumar@example.com",
            full_name="Amit Kumar",
            state="Delhi",
            district="New Delhi",
            digilocker_status="pending",
            skill_tags=["HTML", "CSS", "JavaScript"],
        )
        db.add_all([c1, c2, c3])
        await db.flush()

        # ─── Users ───
        u1 = User(
            phone=c1.phone,
            email=c1.email,
            full_name=c1.full_name,
            role="candidate",
            aadhaar_hash=c1.aadhaar_hash,
            password_hash=pwd_context.hash("password123"),
            candidate_id=c1.id,
            is_verified=True,
        )
        u2 = User(
            phone=tp1.phone,
            email=tp1.email,
            full_name="SkillEd Admin",
            role="training_partner",
            password_hash=pwd_context.hash("password123"),
            training_partner_id=tp1.id,
        )
        u3 = User(
            phone=emp1.phone,
            email=emp1.email,
            full_name="Infosys HR",
            role="employer",
            password_hash=pwd_context.hash("password123"),
            employer_id=emp1.id,
        )
        u4 = User(
            phone="9000000000",
            email="admin@gov.in",
            full_name="Government Admin",
            role="gov_admin",
            password_hash=pwd_context.hash("admin123"),
        )
        db.add_all([u1, u2, u3, u4])
        await db.flush()

        # ─── Enrollments ───
        today = date.today()
        e1 = Enrollment(
            candidate_id=c1.id,
            course_id=course1.id,
            training_partner_id=tp1.id,
            enrollment_date=today - timedelta(days=180),
            completion_date=today - timedelta(days=10),
            is_completed=True,
            certificate_id="PMKVY-2026-8842",
        )
        e2 = Enrollment(
            candidate_id=c2.id,
            course_id=course2.id,
            training_partner_id=tp1.id,
            enrollment_date=today - timedelta(days=175),
            completion_date=today - timedelta(days=5),
            is_completed=True,
            certificate_id="PMKVY-2026-8843",
        )
        e3 = Enrollment(
            candidate_id=c3.id,
            course_id=course3.id,
            training_partner_id=tp2.id,
            enrollment_date=today - timedelta(days=90),
            completion_date=None,
            is_completed=False,
        )
        db.add_all([e1, e2, e3])
        await db.flush()

        # ─── Skill Taxonomy ───
        skills = [
            ("Python", "technical", "IT"),
            ("SQL", "technical", "IT"),
            ("Data Analysis", "technical", "IT"),
            ("React.js", "technical", "IT"),
            ("Cloud Computing", "technical", "IT"),
            ("Digital Marketing", "domain", "Marketing"),
            ("Communication", "soft", "general"),
            ("Teamwork", "soft", "general"),
            ("Problem Solving", "soft", "general"),
        ]
        for name, category, sector in skills:
            db.add(SkillTaxonomy(
                name=name,
                category=category,
                sector=sector,
                normalized_name=name.lower().replace(".", "").replace(" ", "-"),
                is_trending=name in ["Python", "Data Analysis", "Cloud Computing"],
                trend_score=80.0 if name in ["Python", "Data Analysis"] else 60.0,
            ))

        # ─── Survey Templates ───
        survey_templates = [
            SurveyTemplate(
                name="whatsapp_3month",
                channel="whatsapp",
                template_sid="HX_template_3month",
                body=(
                    "Hi {{firstName}}, hope your training worked out well! "
                    "Are you currently employed? Reply YES or NO, and include "
                    "your role & salary if employed.\n\n"
                    "Or update via the portal: {{surveyLink}}"
                ),
                variables=[
                    {"key": "firstName", "label": "First Name"},
                    {"key": "surveyLink", "label": "Survey Link"},
                ],
                allowed_replies=["YES", "NO"],
                interval="3_month",
                version=1,
                is_active=True,
            ),
            SurveyTemplate(
                name="whatsapp_6month",
                channel="whatsapp",
                template_sid="HX_template_6month",
                body=(
                    "Hi {{firstName}}, six months on from your course — are you "
                    "currently employed? Reply YES/NO and mention your role and "
                    "monthly salary if working.\n\nPortal: {{surveyLink}}"
                ),
                variables=[
                    {"key": "firstName", "label": "First Name"},
                    {"key": "surveyLink", "label": "Survey Link"},
                ],
                allowed_replies=["YES", "NO"],
                interval="6_month",
                version=1,
                is_active=True,
            ),
            SurveyTemplate(
                name="whatsapp_12month",
                channel="whatsapp",
                template_sid="HX_template_12month",
                body=(
                    "Hi {{firstName}}, one year since your program! Are you "
                    "currently employed? Reply YES/NO and your role + salary.\n\n"
                    "Portal: {{surveyLink}}"
                ),
                variables=[
                    {"key": "firstName", "label": "First Name"},
                    {"key": "surveyLink", "label": "Survey Link"},
                ],
                allowed_replies=["YES", "NO"],
                interval="12_month",
                version=1,
                is_active=True,
            ),
            SurveyTemplate(
                name="sms_3month",
                channel="sms",
                template_sid=None,
                body=(
                    "SkillTrace: Are you employed now? Reply YES/NO + role & "
                    "salary. Or use portal {{surveyLink}}"
                ),
                variables=[
                    {"key": "firstName", "label": "First Name"},
                    {"key": "surveyLink", "label": "Survey Link"},
                ],
                allowed_replies=["YES", "NO"],
                interval="3_month",
                version=1,
                is_active=True,
            ),
        ]
        db.add_all(survey_templates)
        await db.flush()

        await db.commit()

        print("✅ Seed data created successfully")
        print(f"  - Candidates: {3}")
        print(f"  - Training Partners: {2}")
        print(f"  - Employers: {2}")
        print(f"  - Courses: {3}")
        print(f"  - Enrollments: {3}")
        print(f"  - Users: {4} (password123 / admin123 for gov)")
        print(f"  - Survey Templates: {len(survey_templates)}")


if __name__ == "__main__":
    asyncio.run(seed())
