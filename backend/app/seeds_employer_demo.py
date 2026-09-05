"""Demo hiring data for the demo employer (Infosys, phone 9900000001).

Usage: python -m app.seeds_employer_demo

Gives the employer dashboard realistic volume: 5 owned job postings, ~21
applications spread across every pipeline stage (applied → shortlisted →
interview → offered → hired / rejected), scheduled interviews (upcoming +
one past), offer details, shortlisted-talent notes, and new-application
notifications so the New Activity panel is alive.

Idempotent / non-destructive: every artifact is created only if the employer
does not already have one of that type (re-running after a partial run finishes
the job without duplicating rows).
"""

import asyncio
from datetime import date, datetime, time, timedelta

from sqlalchemy import select

from app.database import async_session_factory
from app.models.user import User
from app.models.employer import Employer
from app.models.candidate import Candidate
from app.models.job_posting import JobPosting
from app.models.job_application import JobApplication
from app.models.employer_shortlist import EmployerShortlist
from app.models.notification import Notification
from app.services.skill_gap_engine import compute_match_score

DEMO_EMPLOYER_PHONE = "9900000001"

JOBS = [
    {
        "title": "Python Developer",
        "location": "Hyderabad",
        "state": "Telangana",
        "district": "Hyderabad",
        "required_skills": ["Python", "SQL", "Django", "FastAPI", "Git"],
        "preferred_skills": ["Docker", "PostgreSQL", "Redis"],
        "salary_min": 450000,
        "salary_max": 720000,
        "experience_min_months": 12,
        "description_raw": "Build and maintain backend services, REST APIs and data pipelines for our healthcare client delivery pods.",
    },
    {
        "title": "Data Analyst",
        "location": "Bengaluru",
        "state": "Karnataka",
        "district": "Bengaluru Urban",
        "required_skills": ["Data Analysis", "SQL", "Power BI", "Pandas"],
        "preferred_skills": ["Tableau", "Python", "Excel"],
        "salary_min": 380000,
        "salary_max": 620000,
        "experience_min_months": 6,
        "description_raw": "Turn messy field-collection data into clean dashboards for our skilling-to-employment program analytics.",
    },
    {
        "title": "React Frontend Engineer",
        "location": "Pune",
        "state": "Maharashtra",
        "district": "Pune",
        "required_skills": ["JavaScript", "React", "HTML", "CSS"],
        "preferred_skills": ["TypeScript", "Node.js", "MongoDB"],
        "salary_min": 400000,
        "salary_max": 680000,
        "experience_min_months": 6,
        "description_raw": "Ship responsive recruiter-facing web experiences on our React 18 design system.",
    },
    {
        "title": "AWS DevOps Engineer",
        "location": "Bengaluru",
        "state": "Karnataka",
        "district": "Bengaluru Urban",
        "required_skills": ["AWS", "Docker", "Kubernetes", "Linux"],
        "preferred_skills": ["Terraform", "CI/CD", "Networking"],
        "salary_min": 600000,
        "salary_max": 950000,
        "experience_min_months": 18,
        "description_raw": "Own CI/CD, containerised deployments and cloud cost for our client platform migration wave.",
    },
    {
        "title": "Java Full-Stack Developer",
        "location": "Noida",
        "state": "Delhi",
        "district": "Gautam Buddha Nagar",
        "required_skills": ["Java", "Spring Boot", "Angular", "SQL"],
        "preferred_skills": ["Microservices", "Kafka", "AWS"],
        "salary_min": 480000,
        "salary_max": 780000,
        "experience_min_months": 12,
        "description_raw": "Full-stack delivery for our banking client's digital onboarding product.",
    },
]

# phone -> (job index, status, opts)
APPLICATIONS = [
    # Python Developer (0)
    ("9876543210", 0, "hired", {"offer_start": 14, "salary": 480000}),
    ("9800000001", 0, "interview", {"interview_at": -2, "interview_note": "Virtual panel - technical + DSA round, MS Teams link shared"}),
    ("9800000006", 0, "applied", {}),
    ("9800000015", 0, "interview", {"interview_at": 10, "interview_note": "Hiring manager round - architecture & system design"}),
    ("9800000005", 0, "rejected", {"feedback": "Skill gap in core Python - retry after a Python mastery cohort"}),
    ("9800000008", 0, "applied", {}),
    # Data Analyst (1)
    ("9876543211", 1, "offered", {"offer_start": 24, "salary": 420000}),
    ("9800000002", 1, "interview", {"interview_at": 3, "interview_note": "Onsite - Bengaluru office, 2nd floor guest lounge"}),
    ("9800000018", 1, "interview", {"interview_at": 8, "interview_note": "Panel - SQL + Power BI case study, bring portfolio"}),
    ("9800000007", 1, "rejected", {"feedback": "Profile better suited to civil construction roles"}),
    ("9800000020", 1, "applied", {}),
    # React Frontend (2)
    ("9876543212", 2, "applied", {}),
    ("9800000004", 2, "interview", {"interview_at": 5, "interview_note": "Live coding session - React test suite (60 min)"}),
    ("9800000010", 2, "hired", {"offer_start": 21, "salary": 420000}),
    ("9800000016", 2, "applied", {}),
    ("9800000012", 2, "applied", {}),
    # AWS DevOps (3)
    ("9800000013", 3, "hired", {"offer_start": 24, "salary": 650000}),
    ("9800000014", 3, "applied", {}),
    ("9800000009", 3, "rejected", {"feedback": "Required AWS/coding experience missing"}),
    # Java Full-Stack (4)
    ("9800000003", 4, "offered", {"offer_start": 26, "salary": 500000}),
    ("9800000019", 4, "applied", {}),
]

COVER_NOTES = {
    "9876543210": "Built two Django delivery apps end-to-end; keen to own the healthcare backend pod.",
    "9800000001": "Currently at TASK academy; strong CS fundamentals and two DSA prep sprints.",
    "9800000006": "Love applying ML to real pipelines; looking for a team that ships fast.",
    "9800000015": "FastAPI + PostgreSQL experience from a logistics startup; dockerising since 2021.",
    "9800000005": "Retrained in accounting tools; hungering for a software role to grow into.",
    "9800000008": "Marketing background; learning Python to pivot to product analytics.",
    "9876543211": "Built KPI dashboards at a microfinance firm; strong SQL window functions.",
    "9800000002": "Tableau storytelling advocate; 3y in data ops with a monitoring platform vendor.",
    "9800000018": "Power BI certified; automated 4 weekly reports to self-serve dashboards.",
    "9800000007": "Civil engineer exploring data roles; comfortable with Excel modelling.",
    "9800000020": "Retail supervisor isolating churn drivers; ready for structured analytics work.",
    "9876543212": "Portfolio of 12 responsive landing pages; grinding through JS correctness.",
    "9800000004": "Shipped a component library used across 6 projects; accessibility-first.",
    "9800000010": "MERN stack developer; design-system maintainer with 2 completed client builds.",
    "9800000016": "Owned e-commerce catalogue tooling; comfortable with state management.",
    "9800000012": "Banking ops analyst learning React evenings; strong eye for workflows.",
    "9800000013": "Led k8s migration of 12 services at a health-tech startup; CKA-adjacent.",
    "9800000014": "Telecom network engineer on 5G rollouts; moving into cloud ops.",
    "9800000009": "Manufacturing engineer with CNC/CAD background; exploring DevOps fundamentals.",
    "9800000003": "Spring Boot + AWS developer on a fintech payments switch; ready for scale.",
    "9800000019": "Microservices veteran on Angular; keen on the banking onboarding build.",
}

SHORTLIST = [
    ("9800000004", "Top pick for React - strong CSS systems, call for portfolio walkthrough"),
    ("9800000002", "Great Tableau storytelling - consider for the Analytics pod"),
    ("9800000001", "Ref candidate from TASK academy - DSA strong, follow up after panel"),
    ("9800000018", "Power BI dashboards impressed the panel - keep warm"),
]

# A few rows on a peer employer (Wipro, IT Services) so the demo employer's
# "vs sector" benchmark has a real comparison bucket.
WIPRO_EMPLOYER_PHONE = "9910000001"
WIPRO_APPLICATIONS = [
    ("9800000013", "Cloud Operations Engineer", "hired",
     {"offer_start": 20, "salary": 620000, "applied": 16,
      "cover": "Led k8s migration of 12 services at a health-tech startup; strong on cost guardrails."}),
    ("9800000001", "Python Developer", "interview",
     {"interview_at": 4, "applied": 3,
      "interview_note": "Virtual - DSA plus Django ORM deep-dive via Teams",
      "cover": "Strong CS fundamentals and two DSA prep sprints; building a Django side project."}),
    ("9800000002", "Data Analyst", "offered",
     {"offer_start": 22, "salary": 400000, "applied": 10,
      "cover": "Tableau storytelling advocate; 3y in data ops with a monitoring vendor."}),
    ("9800000014", "Cloud Operations Engineer", "applied",
     {"applied": 1, "cover": "Telecom network engineer on 5G rollouts; moving into cloud ops."}),
    ("9800000007", "Data Analyst", "rejected",
     {"applied": 2, "feedback": "Requisition closed - circle back in Q4",
      "cover": "Civil engineer exploring data roles; comfortable with Excel modelling."}),
]

EMPLOYER_NOTIFS = [
    ("New shortlist suggestion", "We found 6 more candidates matching 'AWS DevOps Engineer' - review shortlist"),
    ("Interview reminders", "3 interviews scheduled this week across your open roles"),
]


async def main() -> None:
    async with async_session_factory() as db:
        user = (
            await db.execute(select(User).where(User.phone == DEMO_EMPLOYER_PHONE))
        ).scalar_one_or_none()
        if not user or not user.employer_id:
            print(f"  X  Demo employer '{DEMO_EMPLOYER_PHONE}' not found — aborting.")
            return
        employer = (
            await db.execute(select(Employer).where(Employer.id == user.employer_id))
        ).scalar_one()
        eid = user.employer_id

        jobs = (
            (await db.execute(select(JobPosting).where(JobPosting.employer_id == eid)))
            .scalars()
            .all()
        )
        job_ids = {}
        if not jobs:
            print(f"  +  Creating {len(JOBS)} job postings for {employer.name}")
            for spec in JOBS:
                jp = JobPosting(
                    employer_id=eid,
                    title=spec["title"],
                    location=spec["location"],
                    state=spec["state"],
                    district=spec["district"],
                    required_skills=spec["required_skills"],
                    preferred_skills=spec["preferred_skills"],
                    salary_min=spec["salary_min"],
                    salary_max=spec["salary_max"],
                    experience_min_months=spec["experience_min_months"],
                    description_raw=spec["description_raw"],
                    is_active=True,
                )
                db.add(jp)
                await db.flush()
                job_ids[jp.title] = jp
                print(f"     -> {jp.title} ({jp.location})")
        else:
            print("  =  Job postings exist — reusing")
            job_ids = {j.title: j for j in jobs}

        existing_apps = 0
        if job_ids:
            existing_apps = len(
                (
                    await db.execute(
                        select(JobApplication).where(
                            JobApplication.job_posting_id.in_([j.id for j in job_ids.values()])
                        )
                    )
                ).scalars().all()
            )

        if existing_apps:
            print(f"  =  {existing_apps} applications already exist for this employer — skipping")
        else:
            cand_phone = {
                c.phone: c for c in (await db.execute(select(Candidate))).scalars().all()
            }
            today = date.today()
            created_apps = []

            for phone, job_index, status, opts in APPLICATIONS:
                cand = cand_phone.get(phone)
                if not cand:
                    print(f"  -  candidate {phone} missing, skipped")
                    continue
                job = job_ids.get(JOBS[job_index]["title"])
                if not job:
                    continue

                match = compute_match_score(
                    candidate_skills=cand.skill_tags or [],
                    job_required=job.required_skills or [],
                    job_preferred=job.preferred_skills or [],
                )
                applied_days = {
                    "applied": 1,
                    "shortlisted": 2,
                    "interview": 4,
                    "offered": 9,
                    "hired": 14,
                    "rejected": 2,
                }.get(status, 1)
                applied_at = today - timedelta(days=applied_days)
                app = JobApplication(
                    candidate_id=cand.id,
                    job_posting_id=job.id,
                    cover_note=COVER_NOTES.get(phone, ""),
                    status=status,
                    match_score=match["match_score"],
                    skill_overlap=match["skill_overlap"],
                    skill_gaps=match["skill_gaps"],
                    applied_at=datetime.combine(applied_at, time(9, 30)),
                )
                if opts.get("feedback"):
                    app.feedback = opts["feedback"]
                if status in ("offered", "hired") and opts.get("salary"):
                    app.offer_salary = opts["salary"]
                    app.offer_start_date = today + timedelta(days=opts.get("offer_start", 20))
                if status == "interview":
                    app.interview_at = datetime.now() + timedelta(days=opts["interview_at"])
                    app.interview_note = opts.get("interview_note", "")
                db.add(app)
                await db.flush()
                created_apps.append(app)
                print(f"  +  {cand.full_name:16s} -> {job.title:26s} [{status}]")

            # Employer-side "new activity" notifications (most recent apply events).
            cand_by_id = {c.id: c for c in cand_phone.values()}
            newest_apps = sorted(created_apps, key=lambda a: a.applied_at, reverse=True)[:8]
            for a in newest_apps:
                cand = cand_by_id.get(a.candidate_id)
                job_row = next((j for j in job_ids.values() if j.id == a.job_posting_id), None)
                if not cand or not job_row:
                    continue
                body = (
                    f"New application received for '{job_row.title}': {cand.full_name} "
                    f"applied with a match score of {a.match_score}%."
                )
                db.add(
                    Notification(
                        recipient_id=None,
                        recipient_type="employer",
                        phone=employer.phone,
                        channel="whatsapp",
                        kind="new_application",
                        title="New Job Application",
                        body=body,
                        status="sent",
                        sent_at=datetime.now(),
                    )
                )
            for title, body in EMPLOYER_NOTIFS:
                db.add(
                    Notification(
                        recipient_id=None,
                        recipient_type="employer",
                        phone=employer.phone,
                        channel="whatsapp",
                        kind="employer_update",
                        title=title,
                        body=body,
                        status="sent",
                        sent_at=datetime.now(),
                    )
                )
            print("  +  10 employer notifications")

        existing_shortlists = len(
            (
                await db.execute(
                    select(EmployerShortlist).where(EmployerShortlist.employer_id == eid)
                )
            ).scalars().all()
        )
        if not existing_shortlists:
            cand_phone = {
                c.phone: c for c in (await db.execute(select(Candidate))).scalars().all()
            }
            for phone, note in SHORTLIST:
                cand = cand_phone.get(phone)
                if not cand:
                    continue
                db.add(EmployerShortlist(employer_id=eid, candidate_id=cand.id, note=note))
            print("  +  4 shortlisted candidates w/ notes")

        # ── Peer employer (Wipro) applications, so sector comparison differs ──
        wu = (
            await db.execute(select(User).where(User.phone == WIPRO_EMPLOYER_PHONE))
        ).scalar_one_or_none()
        if not wu or not wu.employer_id:
            print("  -  Peer employer (Wipro) not found - skipping sector rows")
        else:
            wpro_jobs = {
                j.title: j
                for j in (
                    await db.execute(
                        select(JobPosting).where(JobPosting.employer_id == wu.employer_id)
                    )
                ).scalars().all()
            }
            wpro_ids = [j.id for j in wpro_jobs.values()]
            wpro_existing = 0
            if wpro_ids:
                wpro_existing = len(
                    (
                        await db.execute(
                            select(JobApplication).where(JobApplication.job_posting_id.in_(wpro_ids))
                        )
                    ).scalars().all()
                )
            if wpro_existing:
                print(f"  =  Wipro already has {wpro_existing} applications - skipping sector rows")
            elif wpro_jobs:
                cand_phone = {
                    c.phone: c for c in (await db.execute(select(Candidate))).scalars().all()
                }
                today = date.today()
                for phone, title, status, opts in WIPRO_APPLICATIONS:
                    cand = cand_phone.get(phone)
                    job = wpro_jobs.get(title)
                    if not cand or not job:
                        continue
                    match = compute_match_score(
                        candidate_skills=cand.skill_tags or [],
                        job_required=job.required_skills or [],
                        job_preferred=job.preferred_skills or [],
                    )
                    app = JobApplication(
                        candidate_id=cand.id,
                        job_posting_id=job.id,
                        cover_note=opts.get("cover", ""),
                        status=status,
                        match_score=match["match_score"],
                        skill_overlap=match["skill_overlap"],
                        skill_gaps=match["skill_gaps"],
                        applied_at=datetime.combine(
                            today - timedelta(days=opts.get("applied", 1)), time(9, 30)
                        ),
                    )
                    if opts.get("feedback"):
                        app.feedback = opts["feedback"]
                    if status in ("offered", "hired") and opts.get("salary"):
                        app.offer_salary = opts["salary"]
                        app.offer_start_date = today + timedelta(days=opts.get("offer_start", 20))
                    if status == "interview":
                        app.interview_at = datetime.now() + timedelta(days=opts["interview_at"])
                        app.interview_note = opts.get("interview_note", "")
                    db.add(app)
                print(f"  +  {len(WIPRO_APPLICATIONS)} peer applications for Wipro (sector rows)")

        await db.commit()
        print("Done.")


if __name__ == "__main__":
    asyncio.run(main())