"""Rich seed script — realistic demo volumes for the SkillTrace AI dashboard.

Usage: python -m app.seeds_rich

Creates ~20 candidates, 8 TPs, 8 employers, 12 courses, 25 enrolments,
15 job postings, 10 skill-gap scores, 6 scheme-analytics rows,
5 employment outcomes, and matching users.  Idempotent — skips rows that
already exist (duplicate unique constraints).
"""

import asyncio
from datetime import date, datetime, timedelta

from sqlalchemy import select

from app.database import async_session_factory
from app.models.candidate import Candidate
from app.models.training_partner import TrainingPartner
from app.models.employer import Employer
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.user import User
from app.models.job_posting import JobPosting
from app.models.skill_gap import SkillGapScore
from app.models.scheme_analytics import SchemeAnalytics
from app.models.employment_outcome import EmploymentOutcome
from app.core.security import hash_aadhaar, pwd_context

# ---------------------------------------------------------------------------
# Static data
# ---------------------------------------------------------------------------
TRAINING_PARTNERS = [
    {"name": "Vocational Skills Academy", "reg": "TP2026R01", "pan": "ABCVT1234F", "state": "Karnataka", "district": "Bengaluru Urban", "contact": "Suresh Nair", "phone": "9810000001", "email": "admin@vocationalskills.in"},
    {"name": "National Skill Development Center", "reg": "TP2026R02", "pan": "BCDMN5678G", "state": "Maharashtra", "district": "Mumbai", "contact": "Anjali Deshmukh", "phone": "9810000002", "email": "contact@nsdc.in"},
    {"name": "Pratham Institute for Skilling", "reg": "TP2026R03", "pan": "CDPEP9012H", "state": "Delhi", "district": "New Delhi", "contact": "Vikram Mehta", "phone": "9810000003", "email": "info@prathamskill.in"},
    {"name": "Tamil Nadu Skill Development Corp", "reg": "TP2026R04", "pan": "DEFTN3456I", "state": "Tamil Nadu", "district": "Chennai", "contact": "Kavitha Raman", "phone": "9810000004", "email": "courses@tnskill.gov.in"},
    {"name": "Telangana Academy for Skill & Knowledge", "reg": "TP2026R05", "pan": "EFGTS7890J", "state": "Telangana", "district": "Hyderabad", "contact": "Rajesh Kumar", "phone": "9810000005", "email": "learn@taskacademy.in"},
    {"name": "Gujarat Skill Mission Trust", "reg": "TP2026R06", "pan": "FGHGS1234K", "state": "Gujarat", "district": "Ahmedabad", "contact": "Meena Patel", "phone": "9810000006", "email": "missionskill@gsmt.in"},
    {"name": "UP Skill Development Institute", "reg": "TP2026R07", "pan": "GHIUS5678L", "state": "Uttar Pradesh", "district": "Lucknow", "contact": "Alok Tripathi", "phone": "9810000007", "email": "enrol@upsdi.in"},
    {"name": "Rajasthan Skill & Livelihood Corp", "reg": "TP2026R08", "pan": "HIJRS9012M", "state": "Rajasthan", "district": "Jaipur", "contact": "Pooja Joshi", "phone": "9810000008", "email": "connect@rajskill.in"},
]

EMPLOYERS = [
    {"name": "Wipro Ltd", "industry": "IT Services", "state": "Karnataka", "district": "Bengaluru Urban", "website": "https://wipro.com", "contact": "HR Team", "phone": "9910000001", "email": "careers@wipro.com"},
    {"name": "Tata Motors", "industry": "Manufacturing", "state": "Maharashtra", "district": "Pune", "website": "https://tatamotors.com", "contact": "HR Team", "phone": "9910000002", "email": "hiring@tatamotors.com"},
    {"name": "Apollo Hospitals", "industry": "Healthcare", "state": "Tamil Nadu", "district": "Chennai", "website": "https://apollohospitals.com", "contact": "HR Team", "phone": "9910000003", "email": "jobs@apollohospitals.com"},
    {"name": "State Bank of India", "industry": "Banking", "state": "Delhi", "district": "New Delhi", "website": "https://sbi.co.in", "contact": "HR Team", "phone": "9910000004", "email": "recruitment@sbi.co.in"},
    {"name": "Reliance Retail", "industry": "Retail", "state": "Gujarat", "district": "Ahmedabad", "website": "https://relianceindustries.com", "contact": "HR Team", "phone": "9910000005", "email": "talent@relianceretail.com"},
    {"name": "Bharti Airtel", "industry": "Telecom", "state": "Delhi", "district": "New Delhi", "website": "https://airtel.in", "contact": "HR Team", "phone": "9910000006", "email": "hiring@airtel.in"},
    {"name": "Larsen & Toubro", "industry": "Construction", "state": "Tamil Nadu", "district": "Chennai", "website": "https://larsentoubro.com", "contact": "HR Team", "phone": "9910000007", "email": "careers@larsentoubro.com"},
    {"name": "ITC Ltd — Agri Business", "industry": "Agriculture", "state": "West Bengal", "district": "Kolkata", "website": "https://itcportal.com", "contact": "HR Team", "phone": "9910000008", "email": "agriskills@itc.in"},
]

COURSES = [
    {"tp_idx": 0, "name": "Advanced Python & Cloud Deployment", "sector": "IT", "weeks": 24, "ncvt": "IT-2026-ADV-PY", "skills": ["Python", "Django", "AWS", "Docker", "PostgreSQL"], "scheme": "PMKVY-4.0", "cost": 15000},
    {"tp_idx": 0, "name": "Full-Stack Web Development", "sector": "IT", "weeks": 20, "ncvt": "IT-2026-FSWD", "skills": ["HTML", "CSS", "JavaScript", "React", "Node.js"], "scheme": "NSDC", "cost": 12000},
    {"tp_idx": 1, "name": "Data Science & Analytics", "sector": "IT", "weeks": 16, "ncvt": "IT-2026-DSA", "skills": ["Python", "Pandas", "NumPy", "SQL", "Tableau"], "scheme": "PMKVY-4.0", "cost": 13000},
    {"tp_idx": 1, "name": "Healthcare Assistant Program", "sector": "Healthcare", "weeks": 12, "ncvt": "HC-2026-HAP", "skills": ["First Aid", "Patient Care", "Medical Terminology", "Health Records"], "scheme": "DDU-GKY", "cost": 10000},
    {"tp_idx": 2, "name": "Banking & Financial Services", "sector": "Banking", "weeks": 10, "ncvt": "BK-2026-BFS", "skills": ["Financial Accounting", "Tally", "Banking Operations", "KYC Compliance"], "scheme": "PMKVY-4.0", "cost": 9000},
    {"tp_idx": 2, "name": "Digital Marketing Mastery", "sector": "Retail", "weeks": 8, "ncvt": "RT-2026-DMM", "skills": ["SEO", "Google Ads", "Social Media Marketing", "Content Writing"], "scheme": "NSDC", "cost": 8000},
    {"tp_idx": 3, "name": "Manufacturing & CNC Programming", "sector": "Manufacturing", "weeks": 16, "ncvt": "MF-2026-CNC", "skills": ["CNC Operation", "CAD", "CNC Programming", "Quality Control"], "scheme": "DDU-GKY", "cost": 14000},
    {"tp_idx": 3, "name": "Agricultural Technology & Supply Chain", "sector": "Agriculture", "weeks": 12, "ncvt": "AG-2026-ATS", "skills": ["Agricultural Science", "Supply Chain", "Cold Chain Management", "Agri-Tech"], "scheme": "NRLM", "cost": 7000},
    {"tp_idx": 4, "name": "Cloud Computing & DevOps", "sector": "IT", "weeks": 20, "ncvt": "IT-2026-CCD", "skills": ["AWS", "Kubernetes", "Terraform", "CI/CD", "Linux"], "scheme": "PMKVY-4.0", "cost": 16000},
    {"tp_idx": 5, "name": "Telecom Network Technician", "sector": "Telecom", "weeks": 14, "ncvt": "TL-2026-TNT", "skills": ["Fiber Optics", "5G Technology", "Network Troubleshooting", "RF Planning"], "scheme": "PM-KVK", "cost": 11000},
    {"tp_idx": 6, "name": "Construction Site Supervision", "sector": "Construction", "weeks": 12, "ncvt": "CN-2026-CSS", "skills": ["AutoCAD", "Civil Engineering", "Safety Management", "Project Planning"], "scheme": "DDU-GKY", "cost": 9500},
    {"tp_idx": 7, "name": "Retail Management & E-Commerce", "sector": "Retail", "weeks": 10, "ncvt": "RT-2026-RME", "skills": ["Inventory Management", "POS Systems", "E-Commerce", "Customer Service"], "scheme": "NSDC-IT", "cost": 8500},
]

CANDIDATES = [
    {"aadhaar": "400000000001", "phone": "9800000001", "email": "arjun.menon@example.com", "name": "Arjun Menon", "state": "Karnataka", "district": "Bengaluru Urban", "gender": "M", "skills": ["Python", "SQL", "Git", "Django"]},
    {"aadhaar": "400000000002", "phone": "9800000002", "email": "deepika.sharma@example.com", "name": "Deepika Sharma", "state": "Maharashtra", "district": "Pune", "gender": "F", "skills": ["Python", "Data Analysis", "Pandas", "Tableau"]},
    {"aadhaar": "400000000003", "phone": "9800000003", "email": "karthik.iyer@example.com", "name": "Karthik Iyer", "state": "Tamil Nadu", "district": "Chennai", "gender": "M", "skills": ["Java", "Spring Boot", "SQL", "AWS"]},
    {"aadhaar": "400000000004", "phone": "9800000004", "email": "nisha.gupta@example.com", "name": "Nisha Gupta", "state": "Delhi", "district": "New Delhi", "gender": "F", "skills": ["JavaScript", "React", "HTML", "CSS"]},
    {"aadhaar": "400000000005", "phone": "9800000005", "email": "rajan.patel@example.com", "name": "Rajan Patel", "state": "Gujarat", "district": "Ahmedabad", "gender": "M", "skills": ["Accounting", "Tally", "Excel"]},
    {"aadhaar": "400000000006", "phone": "9800000006", "email": "ananya.reddy@example.com", "name": "Ananya Reddy", "state": "Telangana", "district": "Hyderabad", "gender": "F", "skills": ["Python", "Machine Learning", "TensorFlow"]},
    {"aadhaar": "400000000007", "phone": "9800000007", "email": "vikram.singh@example.com", "name": "Vikram Singh", "state": "Uttar Pradesh", "district": "Lucknow", "gender": "M", "skills": ["AutoCAD", "Civil Engineering", "Construction"]},
    {"aadhaar": "400000000008", "phone": "9800000008", "email": "pooja.joshi@example.com", "name": "Pooja Joshi", "state": "Rajasthan", "district": "Jaipur", "gender": "F", "skills": ["Digital Marketing", "SEO", "Social Media"]},
    {"aadhaar": "400000000009", "phone": "9800000009", "email": "mohan.singh@example.com", "name": "Mohan Singh", "state": "Uttar Pradesh", "district": "Kanpur", "gender": "M", "skills": ["CNC Operation", "CAD", "Manufacturing"]},
    {"aadhaar": "400000000010", "phone": "9800000010", "email": "kavitha.nair@example.com", "name": "Kavitha Nair", "state": "Karnataka", "district": "Mysuru", "gender": "F", "skills": ["React", "Node.js", "MongoDB"]},
    {"aadhaar": "400000000011", "phone": "9800000011", "email": "arun.kumar@example.com", "name": "Arun Kumar", "state": "Tamil Nadu", "district": "Coimbatore", "gender": "M", "skills": ["Patient Care", "First Aid", "Healthcare"]},
    {"aadhaar": "400000000012", "phone": "9800000012", "email": "meera.yadav@example.com", "name": "Meera Yadav", "state": "Maharashtra", "district": "Nagpur", "gender": "F", "skills": ["Banking", "Financial Services", "KYC"]},
    {"aadhaar": "400000000013", "phone": "9800000013", "email": "suresh.raj@example.com", "name": "Suresh Raj", "state": "Telangana", "district": "Warangal", "gender": "M", "skills": ["AWS", "Docker", "Kubernetes", "Linux"]},
    {"aadhaar": "400000000014", "phone": "9800000014", "email": "priyanka.das@example.com", "name": "Priyanka Das", "state": "Delhi", "district": "New Delhi", "gender": "F", "skills": ["Telecom", "5G", "Networking"]},
    {"aadhaar": "400000000015", "phone": "9800000015", "email": "ramesh.babu@example.com", "name": "Ramesh Babu", "state": "Karnataka", "district": "Hubli", "gender": "M", "skills": ["Python", "FastAPI", "PostgreSQL"]},
    {"aadhaar": "400000000016", "phone": "9800000016", "email": "swati.verma@example.com", "name": "Swati Verma", "state": "Rajasthan", "district": "Jodhpur", "gender": "F", "skills": ["E-Commerce", "Retail", "Inventory"]},
    {"aadhaar": "400000000017", "phone": "9800000017", "email": "amit.yadav@example.com", "name": "Amit Yadav", "state": "Uttar Pradesh", "district": "Agra", "gender": "M", "skills": ["Supply Chain", "Agriculture", "Logistics"]},
    {"aadhaar": "400000000018", "phone": "9800000018", "email": "sonal.mehta@example.com", "name": "Sonal Mehta", "state": "Gujarat", "district": "Surat", "gender": "F", "skills": ["Data Analysis", "SQL", "Power BI"]},
    {"aadhaar": "400000000019", "phone": "9800000019", "email": "vinod.kumar@example.com", "name": "Vinod Kumar", "state": "Maharashtra", "district": "Mumbai", "gender": "M", "skills": ["Java", "Angular", "Microservices"]},
    {"aadhaar": "400000000020", "phone": "9800000020", "email": "lakshmi.r@example.com", "name": "Lakshmi R", "state": "Tamil Nadu", "district": "Madurai", "gender": "F", "skills": ["Customer Service", "Retail", "POS"]},
]

JOB_POSTINGS = [
    {"emp_idx": 0, "title": "Python Developer", "desc": "Full-time Python developer role with experience in Django/FastAPI.", "req": ["Python", "Django", "SQL"], "pref": ["Docker", "AWS"], "min": 25000, "max": 45000, "loc": "Bengaluru", "state": "Karnataka", "exp": 6},
    {"emp_idx": 0, "title": "Cloud Operations Engineer", "desc": "Manage AWS infrastructure and CI/CD pipelines.", "req": ["AWS", "Linux", "Docker"], "pref": ["Kubernetes", "Terraform"], "min": 30000, "max": 55000, "loc": "Bengaluru", "state": "Karnataka", "exp": 12},
    {"emp_idx": 1, "title": "Manufacturing Technician", "desc": "Operate and maintain CNC machines on the production floor.", "req": ["CNC Operation", "Quality Control"], "pref": ["CNC Programming", "CAD"], "min": 20000, "max": 35000, "loc": "Pune", "state": "Maharashtra", "exp": 0},
    {"emp_idx": 1, "title": "Quality Assurance Inspector", "desc": "Inspect manufactured parts to ensure compliance.", "req": ["Quality Control", "Measurement Tools"], "pref": ["AutoCAD", "SPC"], "min": 22000, "max": 38000, "loc": "Pune", "state": "Maharashtra", "exp": 3},
    {"emp_idx": 2, "title": "Healthcare Assistant", "desc": "Support nursing staff with patient care activities.", "req": ["Patient Care", "First Aid"], "pref": ["Medical Terminology", "EHR"], "min": 18000, "max": 28000, "loc": "Chennai", "state": "Tamil Nadu", "exp": 0},
    {"emp_idx": 2, "title": "Medical Data Entry Operator", "desc": "Enter and maintain patient health records.", "req": ["Typing", "Health Records"], "pref": ["EHR Software", "Data Entry"], "min": 18000, "max": 25000, "loc": "Chennai", "state": "Tamil Nadu", "exp": 0},
    {"emp_idx": 3, "title": "Bank Clerk", "desc": "Handle customer transactions and account management.", "req": ["Banking Operations", "Computer Skills"], "pref": ["Tally", "KYC"], "min": 25000, "max": 40000, "loc": "New Delhi", "state": "Delhi", "exp": 0},
    {"emp_idx": 4, "title": "Retail Store Supervisor", "desc": "Manage daily store operations and team.", "req": ["Retail Management", "Inventory"], "pref": ["E-Commerce", "POS"], "min": 22000, "max": 35000, "loc": "Ahmedabad", "state": "Gujarat", "exp": 12},
    {"emp_idx": 5, "title": "Network Technician", "desc": "Install and maintain telecom network infrastructure.", "req": ["Fiber Optics", "Network Troubleshooting"], "pref": ["5G", "RF Planning"], "min": 22000, "max": 40000, "loc": "New Delhi", "state": "Delhi", "exp": 6},
    {"emp_idx": 5, "title": "Field Sales Executive — Telecom", "desc": "Acquire new broadband subscribers in assigned territory.", "req": ["Sales", "Communication"], "pref": ["Telecom Knowledge", "CRM"], "min": 20000, "max": 35000, "loc": "New Delhi", "state": "Delhi", "exp": 0},
    {"emp_idx": 6, "title": "Site Supervisor", "desc": "Supervise construction projects and ensure safety compliance.", "req": ["Construction", "Safety Management"], "pref": ["AutoCAD", "Project Planning"], "min": 28000, "max": 50000, "loc": "Chennai", "state": "Tamil Nadu", "exp": 12},
    {"emp_idx": 6, "title": "Junior Civil Engineer", "desc": "Assist in project planning and site execution.", "req": ["AutoCAD", "Civil Engineering"], "pref": ["Construction Management", "Estimation"], "min": 22000, "max": 40000, "loc": "Chennai", "state": "Tamil Nadu", "exp": 0},
    {"emp_idx": 7, "title": "Agri-Operations Coordinator", "desc": "Coordinate agricultural procurement and logistics.", "req": ["Supply Chain", "Agriculture"], "pref": ["Agri-Tech", "Cold Chain"], "min": 20000, "max": 32000, "loc": "Kolkata", "state": "West Bengal", "exp": 6},
    {"emp_idx": 7, "title": "Rural Sales Executive", "desc": "Promote agri-products in rural markets.", "req": ["Sales", "Communication"], "pref": ["Agriculture", "Field Sales"], "min": 18000, "max": 28000, "loc": "Kolkata", "state": "West Bengal", "exp": 0},
    {"emp_idx": 0, "title": "Data Analyst", "desc": "Analyse datasets and build dashboards for business teams.", "req": ["Python", "SQL", "Data Analysis"], "pref": ["Tableau", "Pandas"], "min": 28000, "max": 50000, "loc": "Bengaluru", "state": "Karnataka", "exp": 6},
]

SKILL_GAP_ENTRIES = [
    {"state": "Karnataka", "district": "Bengaluru Urban", "sector": "IT", "skill": "Python", "demand": 92, "supply": 45},
    {"state": "Karnataka", "district": "Bengaluru Urban", "sector": "IT", "skill": "React.js", "demand": 88, "supply": 38},
    {"state": "Maharashtra", "district": "Pune", "sector": "Manufacturing", "skill": "CNC Programming", "demand": 75, "supply": 35},
    {"state": "Tamil Nadu", "district": "Chennai", "sector": "Healthcare", "skill": "Patient Care", "demand": 80, "supply": 42},
    {"state": "Delhi", "district": "New Delhi", "sector": "IT", "skill": "Cloud Computing", "demand": 85, "supply": 30},
    {"state": "Telangana", "district": "Hyderabad", "sector": "IT", "skill": "Data Analysis", "demand": 90, "supply": 40},
    {"state": "Gujarat", "district": "Ahmedabad", "sector": "Retail", "skill": "Digital Marketing", "demand": 70, "supply": 28},
    {"state": "Karnataka", "district": "Bengaluru Urban", "sector": "IT", "skill": "SQL", "demand": 86, "supply": 52},
    {"state": "Maharashtra", "district": "Mumbai", "sector": "Banking", "skill": "Financial Accounting", "demand": 72, "supply": 48},
    {"state": "Delhi", "district": "New Delhi", "sector": "Telecom", "skill": "5G Technology", "demand": 78, "supply": 22},
]

SCHEME_ANALYTICS_ENTRIES = [
    {"scheme": "PMKVY-4.0", "tp_idx": 0, "state": "Karnataka", "enrolled": 12400, "completed": 10540, "placed3": 4210, "placed6": 5580, "placed12": 6850, "cost": 18600000, "cpp": 1765, "avg_sal": 26500, "roi": 3.2, "fit": 78, "alert": "active", "reason": None},
    {"scheme": "DDU-GKY", "tp_idx": 1, "state": "Maharashtra", "enrolled": 8700, "completed": 6960, "placed3": 2780, "placed6": 3828, "placed12": 4524, "cost": 14916000, "cpp": 2142, "avg_sal": 22000, "roi": 2.4, "fit": 65, "alert": "underperforming", "reason": "Completion rate below 80% target; placement rate 65% vs 75% goal"},
    {"scheme": "NRLM", "tp_idx": 3, "state": "Tamil Nadu", "enrolled": 3200, "completed": 2880, "placed3": 1152, "placed6": 1728, "placed12": 2016, "cost": 7488000, "cpp": 2600, "avg_sal": 19500, "roi": 1.8, "fit": 58, "alert": "alert", "reason": "ROI below 2.0 threshold; skill-market misalignment in agriculture sector"},
    {"scheme": "NSDC", "tp_idx": 2, "state": "Delhi", "enrolled": 14800, "completed": 13024, "placed3": 6512, "placed6": 8466, "placed12": 10419, "cost": 31257600, "cpp": 2400, "avg_sal": 30000, "roi": 4.1, "fit": 85, "alert": "active", "reason": None},
    {"scheme": "PM-KVK", "tp_idx": 5, "state": "Gujarat", "enrolled": 4500, "completed": 3825, "placed3": 1530, "placed6": 2107, "placed12": 2484, "cost": 7845000, "cpp": 2050, "avg_sal": 21000, "roi": 2.8, "fit": 70, "alert": "active", "reason": None},
    {"scheme": "NSDC-IT", "tp_idx": 4, "state": "Telangana", "enrolled": 6800, "completed": 5780, "placed3": 2312, "placed6": 3179, "placed12": 3757, "cost": 15950000, "cpp": 2760, "avg_sal": 28000, "roi": 3.6, "fit": 74, "alert": "active", "reason": None},
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _exists(db, model, **kwargs):
    """Return True if a row with the given column values already exists."""
    q = select(model.id)
    for col_name, val in kwargs.items():
        q = q.where(getattr(model, col_name) == val)
    result = await db.execute(q)
    return result.scalar() is not None


# ---------------------------------------------------------------------------
# Main seed coroutine
# ---------------------------------------------------------------------------

async def seed() -> None:
    async with async_session_factory() as db:
        counts = {
            "training_partners": 0,
            "employers": 0,
            "courses": 0,
            "candidates": 0,
            "users": 0,
            "enrollments": 0,
            "job_postings": 0,
            "skill_gap_scores": 0,
            "scheme_analytics": 0,
            "employment_outcomes": 0,
        }

        # ── 1. Training Partners ──────────────────────────────────────────
        tp_ids = []
        for tp in TRAINING_PARTNERS:
            if await _exists(db, TrainingPartner, registration_number=tp["reg"]):
                existing = await db.execute(
                    select(TrainingPartner.id).where(TrainingPartner.registration_number == tp["reg"])
                )
                tp_ids.append(existing.scalar())
                continue
            row = TrainingPartner(
                name=tp["name"],
                registration_number=tp["reg"],
                pan_number=tp["pan"],
                state=tp["state"],
                district=tp["district"],
                contact_person=tp["contact"],
                phone=tp["phone"],
                email=tp["email"],
                is_approved=True,
                approved_at=datetime.utcnow() - timedelta(days=60),
            )
            db.add(row)
            await db.flush()
            tp_ids.append(row.id)
            counts["training_partners"] += 1

        # ── 2. Employers ──────────────────────────────────────────────────
        emp_ids = []
        for emp in EMPLOYERS:
            if await _exists(db, Employer, phone=emp["phone"]):
                existing = await db.execute(
                    select(Employer.id).where(Employer.phone == emp["phone"])
                )
                emp_ids.append(existing.scalar())
                continue
            row = Employer(
                name=emp["name"],
                industry=emp["industry"],
                state=emp["state"],
                district=emp["district"],
                website=emp["website"],
                contact_person=emp["contact"],
                phone=emp["phone"],
                email=emp["email"],
                is_verified=True,
            )
            db.add(row)
            await db.flush()
            emp_ids.append(row.id)
            counts["employers"] += 1

        # ── 3. Courses ────────────────────────────────────────────────────
        course_ids = []
        for crs in COURSES:
            if await _exists(db, Course, ncvt_code=crs["ncvt"]):
                existing = await db.execute(
                    select(Course.id).where(Course.ncvt_code == crs["ncvt"])
                )
                course_ids.append(existing.scalar())
                continue
            row = Course(
                training_partner_id=tp_ids[crs["tp_idx"]],
                name=crs["name"],
                sector=crs["sector"],
                duration_weeks=crs["weeks"],
                ncvt_code=crs["ncvt"],
                skills_taught=crs["skills"],
                scheme_id=crs["scheme"],
                cost_per_candidate=crs["cost"],
            )
            db.add(row)
            await db.flush()
            course_ids.append(row.id)
            counts["courses"] += 1

        # ── 4. Candidates ─────────────────────────────────────────────────
        cand_ids = []
        for cand in CANDIDATES:
            aadhaar_h = hash_aadhaar(cand["aadhaar"])
            if await _exists(db, Candidate, aadhaar_hash=aadhaar_h):
                existing = await db.execute(
                    select(Candidate.id).where(Candidate.aadhaar_hash == aadhaar_h)
                )
                cand_ids.append(existing.scalar())
                continue
            dob_year = 1995 + (int(cand["aadhaar"][-2:]) % 10)
            row = Candidate(
                aadhaar_hash=aadhaar_h,
                phone=cand["phone"],
                email=cand["email"],
                full_name=cand["name"],
                date_of_birth=f"{dob_year}-05-15",
                gender=cand["gender"],
                state=cand["state"],
                district=cand["district"],
                digilocker_status="verified",
                skill_tags=cand["skills"],
            )
            db.add(row)
            await db.flush()
            cand_ids.append(row.id)
            counts["candidates"] += 1

        # ── 5. Users ──────────────────────────────────────────────────────
        default_pw = pwd_context.hash("password123")
        admin_pw = pwd_context.hash("admin123")

        # Candidate users (one per candidate)
        for i, cand in enumerate(CANDIDATES):
            if await _exists(db, User, phone=cand["phone"]):
                continue
            db.add(User(
                phone=cand["phone"],
                email=cand["email"],
                full_name=cand["name"],
                role="candidate",
                aadhaar_hash=hash_aadhaar(cand["aadhaar"]),
                password_hash=default_pw,
                candidate_id=cand_ids[i],
                is_verified=True,
            ))
            counts["users"] += 1

        # TP users (one per TP)
        for i, tp in enumerate(TRAINING_PARTNERS):
            if await _exists(db, User, phone=tp["phone"]):
                continue
            db.add(User(
                phone=tp["phone"],
                email=tp["email"],
                full_name=tp["contact"],
                role="training_partner",
                password_hash=default_pw,
                training_partner_id=tp_ids[i],
            ))
            counts["users"] += 1

        # Employer users (for first 3 employers)
        for i in range(3):
            emp = EMPLOYERS[i]
            if await _exists(db, User, phone=emp["phone"]):
                continue
            db.add(User(
                phone=emp["phone"],
                email=emp["email"],
                full_name=f"{emp['name']} HR",
                role="employer",
                password_hash=default_pw,
                employer_id=emp_ids[i],
            ))
            counts["users"] += 1

        # Admin user
        if not await _exists(db, User, phone="9000000000"):
            db.add(User(
                phone="9000000000",
                email="admin@gov.in",
                full_name="Government Admin",
                role="gov_admin",
                password_hash=admin_pw,
            ))
            counts["users"] += 1

        await db.flush()

        # ── 6. Enrollments ────────────────────────────────────────────────
        today = date.today()
        enrollment_data = [
            # (cand_idx, course_idx, tp_idx, days_ago_enroll, completed_days_ago_or_None, cert_or_None)
            (0, 0, 0, 180, 15, "PMKVY-2026-RC001"),
            (0, 1, 0, 120, None, None),
            (1, 2, 1, 170, 20, "PMKVY-2026-RC002"),
            (1, 3, 1, 90, None, None),
            (2, 0, 0, 150, 10, "PMKVY-2026-RC003"),
            (3, 1, 0, 130, None, None),
            (3, 5, 2, 80, None, None),
            (4, 4, 2, 160, 25, "DDU-GKY-2026-RC004"),
            (5, 8, 4, 140, 5, "PMKVY-2026-RC005"),
            (6, 10, 6, 110, None, None),
            (7, 5, 2, 100, None, None),
            (8, 6, 3, 175, 30, "DDU-GKY-2026-RC006"),
            (9, 1, 0, 145, None, None),
            (10, 3, 1, 125, 8, "DDU-GKY-2026-RC007"),
            (11, 4, 2, 155, 18, "PMKVY-2026-RC008"),
            (12, 8, 4, 105, None, None),
            (13, 9, 5, 95, None, None),
            (14, 0, 0, 185, 35, "PMKVY-2026-RC009"),
            (15, 11, 7, 85, None, None),
            (16, 7, 3, 115, 12, "NRLM-2026-RC010"),
            (17, 2, 1, 165, 22, "PMKVY-2026-RC011"),
            (18, 2, 1, 140, None, None),
            (19, 11, 7, 90, None, None),
            (5, 2, 1, 50, None, None),
            (7, 4, 2, 40, None, None),
        ]
        enrolled_ids = []
        for ci, cri, tpi, days_enroll, completed_days, cert in enrollment_data:
            if await _exists(db, Enrollment, candidate_id=cand_ids[ci], course_id=course_ids[cri]):
                existing = await db.execute(
                    select(Enrollment.id).where(
                        Enrollment.candidate_id == cand_ids[ci],
                        Enrollment.course_id == course_ids[cri],
                    )
                )
                enrolled_ids.append(existing.scalar())
                continue
            enroll_date = today - timedelta(days=days_enroll)
            comp_date = (today - timedelta(days=completed_days)) if completed_days else None
            row = Enrollment(
                candidate_id=cand_ids[ci],
                course_id=course_ids[cri],
                training_partner_id=tp_ids[tpi],
                enrollment_date=enroll_date,
                completion_date=comp_date,
                is_completed=(comp_date is not None),
                certificate_id=cert,
            )
            db.add(row)
            await db.flush()
            enrolled_ids.append(row.id)
            counts["enrollments"] += 1

        # ── 7. Job Postings ───────────────────────────────────────────────
        for jp in JOB_POSTINGS:
            title = jp["title"]
            if await _exists(db, JobPosting, title=title, employer_id=emp_ids[jp["emp_idx"]]):
                continue
            db.add(JobPosting(
                employer_id=emp_ids[jp["emp_idx"]],
                title=title,
                description_raw=jp["desc"],
                description_cleaned=jp["desc"],
                required_skills=jp["req"],
                preferred_skills=jp["pref"],
                location=jp["loc"],
                state=jp["state"],
                salary_min=jp["min"],
                salary_max=jp["max"],
                experience_min_months=jp["exp"],
                is_active=True,
            ))
            counts["job_postings"] += 1
        await db.flush()

        # ── 8. Skill Gap Scores ───────────────────────────────────────────
        for sg in SKILL_GAP_ENTRIES:
            if await _exists(db, SkillGapScore, state=sg["state"], skill_name=sg["skill"]):
                continue
            gap = sg["demand"] - sg["supply"]
            direction = "deficit" if gap > 10 else ("surplus" if gap < -5 else "balanced")
            db.add(SkillGapScore(
                state=sg["state"],
                district=sg["district"],
                sector=sg["sector"],
                skill_name=sg["skill"],
                demand_score=sg["demand"],
                supply_score=sg["supply"],
                gap_score=gap,
                gap_direction=direction,
                computed_at=datetime.utcnow(),
                model_version="v1.0",
            ))
            counts["skill_gap_scores"] += 1
        await db.flush()

        # ── 9. Scheme Analytics ───────────────────────────────────────────
        period = date(2026, 3, 1)
        for sa in SCHEME_ANALYTICS_ENTRIES:
            if await _exists(db, SchemeAnalytics, scheme_id=sa["scheme"], training_partner_id=tp_ids[sa["tp_idx"]], period=period):
                continue
            comp_rate = round(sa["completed"] / sa["enrolled"] * 100, 2) if sa["enrolled"] else 0
            ret3 = round(sa["placed3"] / sa["completed"] * 100, 2) if sa["completed"] else 0
            ret6 = round(sa["placed6"] / sa["completed"] * 100, 2) if sa["completed"] else 0
            ret12 = round(sa["placed12"] / sa["completed"] * 100, 2) if sa["completed"] else 0
            db.add(SchemeAnalytics(
                scheme_id=sa["scheme"],
                training_partner_id=tp_ids[sa["tp_idx"]],
                period=period,
                state=sa["state"],
                total_enrolled=sa["enrolled"],
                total_completed=sa["completed"],
                completion_rate=comp_rate,
                total_placed_3m=sa["placed3"],
                total_placed_6m=sa["placed6"],
                total_placed_12m=sa["placed12"],
                retention_3m=ret3,
                retention_6m=ret6,
                retention_12m=ret12,
                total_cost=sa["cost"],
                cost_per_placement=sa["cpp"],
                avg_salary_at_placement=sa["avg_sal"],
                roi_score=sa["roi"],
                curriculum_market_fit_score=sa["fit"],
                alert_status=sa["alert"],
                alert_reason=sa["reason"],
            ))
            counts["scheme_analytics"] += 1
        await db.flush()

        # ── 10. Employment Outcomes ───────────────────────────────────────
        # (cand_idx, enrolled_idx, emp_idx, interval, salary, title)
        outcome_data = [
            (0, 0, 0, "6_month", 32000, "Junior Python Developer"),
            (1, 2, 0, "3_month", 28000, "Data Analyst"),
            (4, 3, 3, "6_month", 26000, "Bank Clerk"),
            (8, 11, 1, "3_month", 22000, "CNC Operator"),
            (10, 13, 2, "6_month", 20000, "Healthcare Assistant"),
        ]
        for ci, ei, empi, interval, sal, title in outcome_data:
            cand_id = cand_ids[ci]
            enroll_id = enrolled_ids[ei]
            # Unique constraint: candidate_id + enrollment_id + survey_interval
            existing_out = await db.execute(
                select(EmploymentOutcome.id).where(
                    EmploymentOutcome.candidate_id == cand_id,
                    EmploymentOutcome.enrollment_id == enroll_id,
                    EmploymentOutcome.survey_interval == interval,
                )
            )
            if existing_out.scalar() is not None:
                continue
            survey_date = today - timedelta(days=90 if interval == "3_month" else 180)
            db.add(EmploymentOutcome(
                candidate_id=cand_id,
                enrollment_id=enroll_id,
                employer_id=emp_ids[empi],
                survey_interval=interval,
                survey_date=survey_date,
                is_employed=True,
                current_job_title=title,
                monthly_salary=sal,
                job_location=EMPLOYERS[empi]["district"],
                is_job_relevant_to_training=True,
                skills_used=["Python", "SQL"] if ci in (0, 1) else ["CNC"] if ci == 8 else [],
                months_at_employer=3.0 if interval == "3_month" else 6.0,
                response_channel="web_portal",
                self_reported=True,
            ))
            counts["employment_outcomes"] += 1
        await db.flush()

        # ── Commit everything ─────────────────────────────────────────────
        await db.commit()

        # ── Summary ───────────────────────────────────────────────────────
        print("\n=== Rich Seed Summary ===")
        print(f"  Training Partners : {counts['training_partners']}")
        print(f"  Employers         : {counts['employers']}")
        print(f"  Courses           : {counts['courses']}")
        print(f"  Candidates        : {counts['candidates']}")
        print(f"  Users             : {counts['users']}")
        print(f"  Enrollments       : {counts['enrollments']}")
        print(f"  Job Postings      : {counts['job_postings']}")
        print(f"  Skill Gap Scores  : {counts['skill_gap_scores']}")
        print(f"  Scheme Analytics  : {counts['scheme_analytics']}")
        print(f"  Emp. Outcomes     : {counts['employment_outcomes']}")
        print("==========================\n")
        print("Candidate password: password123")
        print("TP user passwords: password123")
        print("Admin: 9000000000 / admin123")


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    asyncio.run(seed())
