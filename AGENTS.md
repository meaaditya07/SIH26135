# SkillTrace AI — Development Guide

Vocational education outcome tracking & labor analytics platform.

## Repo layout
- `backend/` — Python 3.12+ · FastAPI · SQLAlchemy 2.0 (async) · Alembic
- `frontend/` — Next.js 14 · TypeScript · Tailwind
- `workers/` — Celery + Redis · NLP extraction · job scrapers
- `ml/` — ML models
- `infra/` · `docs/` · `.github/`

## Commands
- Backend import / app check:
  `$env:PYTHONPATH="C:\aaditya\Opencode-project\SIH26135\backend"; python -c "import app.main"`
- Backend lint (F-class only; full `ruff check` is noisy by design):
  `python -m ruff check app/ --select F401,F811,F821`  (run from `backend/`, use `python -m ruff`, not the `ruff` cmdlet)
- Tests (run from repo root):
  `python -m pytest backend/tests workers/tests -q -p no:cacheprovider`
- Frontend type check (canonical gate):
  `npx tsc --noEmit`  (run from `frontend/`)

## Environment notes (do not "fix")
- **Frontend `npm run build` fails by design** due to a corrupt 0-byte SWC binary
  (`@next/swc-win32-x64-msvc`) served by the npm mirror. This is an environment issue,
  NOT code. Use `npx tsc --noEmit` as the frontend gate instead.
- `eslint` is pinned to `^8.57.0` (eslint-config-next@14.2.x requires eslint ^8).
- `optionalDependencies` includes `"@next/swc-win32-x64-msvc": "npm:null@*"` as a
  deliberate workaround — leave it.
- Test runner config in `backend/pyproject.toml` pulls `--cov`, so tests require
  `pytest-cov`.
- E712 SQLAlchemy styles (`== True`) and T201 `print` statements are intentionally kept.

## ML (Sprint 6)
- `ml/placement_model.py` — sklearn pipeline (StandardScaler + GradientBoosting)
  predicting P(employed). Trains on synthetic-but-realistic seed data
  (`train()`), persists via joblib to `ml/models/placement_model.joblib`.
- Train (from repo root): `python -m ml.scripts.train`
- Model deps: `scikit-learn`, `joblib`, `pandas`, `numpy` (all installed).
- Backend bridge: `backend/app/services/ml_service.py` (`model_ready`,
  `score_features`, `features_for_candidate`). Router in
  `backend/app/api/v1/ml.py`: `GET /ml/health`, `GET /ml/placement/{id}`,
  `POST /ml/placement/score`. Service imports the `ml` package by inserting the
  repo root (NOT `ml/`) on `sys.path` — `ml` package must be importable.
- Version the model: retrain and re-save after schema/feature changes.

## Conventions
- Backend: SQLAlchemy async, `require_role(...)` dependency guards, routers registered
  in `backend/app/main.py` under `/api/v1/...`.
- **Route ordering**: define static paths (`/stats/summary`) BEFORE parameterized
  catchall paths (`/{candidate_id}`); FastAPI matches in definition order and this
  prevents UUID-parse shadowing.
- Frontend: `"use client"` pages compose `Sidebar` + `TopBar`; data hooks live in
  `frontend/src/lib/hooks/useDashboard.ts`; types in `frontend/src/lib/types/index.ts`;
  `frontend/src/lib/api.ts` attaches the JWT and redirects on 401.
- Keep the project's intentional ruff style (E712/T201) — do not "clean up" it.

## Hiring Pipeline (Sprint 7)
- `JobApplication` model (`backend/app/models/job_application.py`) + enum
  `application_status`: `applied → shortlisted → interview → offered → hired`,
  with `rejected` allowed from any non-terminal stage; `hired`/`rejected` are
  terminal. Enforce via `backend/app/services/application_service.py`
  (`can_transition`, `funnel_counts`) — do NOT transition inline in the router
  or DB without the guard.
- Router `backend/app/api/v1/applications.py` under `/api/v1/applications`:
  `POST /` (candidate applies, snapshots match score), `GET /mine`,
  `GET /job/{id}`, `GET /pipeline/{id}`, `PATCH /{id}/status`. The status PATCH
  returns 400 on an invalid transition.
- JWT `sub` is the **User.id** (not candidate/employer id). Resolve the current
  candidate via `User.candidate_id` and employer via `User.employer_id`; the
  existing `/candidates/me` treating `sub` as candidate id is a known inconsistency.
- Migration `backend/alembic/versions/0003_job_applications.py` (chains 0003→0002).

