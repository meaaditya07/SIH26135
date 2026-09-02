# SkillTrace AI — Sprint Roadmap

Living plan for feature delivery. Update this doc as sprints are
completed/planned so future sessions have the single source of truth.

## Stack
- Backend: Python 3.12+ · FastAPI · SQLAlchemy 2.0 (async) · Alembic · PostgreSQL
- Frontend: Next.js 14 · TypeScript · Tailwind · Recharts · react-leaflet
- Workers: Celery + Redis · NLP skill extraction · job scrapers
- ML: scikit-learn placement model (see `AGENTS.md` → ML (Sprint 6))

## Completed Sprints
- **Sprint 2 — Core platform & auth**: FastAPI app, JWT + OTP auth, role-based
  access, candidate/training-partner/employer/course models, skill-gap engine
  + match scoring, Aadhaar masking/hashing.
- **Sprint 3 — Surveys & outcomes**: survey templates/responses dispatch
  (WhatsApp/SMS/web), Twilio webhooks, portal respond flow, scheme analytics.
- **Sprint 4 — Data pipelines**: NLP skill extraction, job scrapers
  (Naukri/Indeed), scrape→dedup→persist→recompute job chain.
- **Sprint 5 — Dashboards & match scoring**: real-time job-candidate match
  scoring API (`/api/v1/matches`), enriched analytics (placement rate, trends,
  top-skills), Recharts gov dashboard, react-leaflet skill-gap heatmap, matches
  pages wired to scoring.
- **Sprint 6 — Placement prediction ML**: sklearn pipeline
  (`ml/placement_model.py`) predicting P(employed); retrain via
  `python -m ml.scripts.train`; `/api/v1/ml/*` endpoints; candidate portal
  placement-likelihood widget.
- **Sprint 7 — Employer hiring pipeline**: `JobApplication` + `application_status`
  lifecycle, `/api/v1/applications/*` endpoints, employer kanban pipeline board,
  candidate apply + my-applications flow.
- **Sprint 8 — Reporting & exports**: `/api/v1/reports/*` endpoints for
  CSV / XLSX / PDF export of scheme-roi, skill-gaps, outcomes, candidates, and
  applications reports; on-demand analytics snapshot;
  `backend/app/services/reporting_service.py` (pure byte-builder helpers);
  frontend gov export center (`/gov/reports`) with per-report CSV/Excel/PDF
  download buttons. (Deps: `reportlab`, `openpyxl`.)

## Metrics (latest verified)
- Backend endpoints: 59 under `/api/v1/...`
- Tests: 42 passing (backend tests + workers + ml)
- Frontend gate: `npx tsc --noEmit` clean (never `npm run build` — broken SWC
  mirror in this environment)

## Proposed Next Sprints (candidates)
- **Sprint 9 — Notifications & SMS engine**: worker tasks for WhatsApp/SMS
  (job alerts, survey reminders), templates, delivery logs/analytics.
- **Sprint 10 — Multi-role auth hardening & RBAC**: refresh tokens, audit
  logging, permission tests; fix known `/candidates/me` sub inconsistency
  (JWT `sub` is User.id, not candidate id).

## Verification
Run from repo root:
- Backend import: `$env:PYTHONPATH="<repo>\backend"; python -c "import app.main"`
- Backend lint (F-class): `python -m ruff check app/ --select F401,F811,F821`
- Tests: `python -m pytest backend/tests workers/tests ml/tests -q -p no:cacheprovider`
- Frontend: `npx tsc --noEmit`
