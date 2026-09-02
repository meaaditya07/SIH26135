.PHONY: dev down migrate seed test lint typecheck format logs db-shell

dev:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

logs-worker:
	docker compose logs -f worker

migrate:
	docker compose exec backend alembic upgrade head

migrate-create:
	docker compose exec backend alembic revision --autogenerate -m "$(msg)"

seed:
	docker compose exec backend python -m app.seeds

test:
	docker compose exec backend pytest -v --tb=short

test-worker:
	docker compose exec worker pytest -v --tb=short

lint:
	docker compose exec backend ruff check .
	docker compose exec worker ruff check .

format:
	docker compose exec backend ruff format .
	docker compose exec worker ruff format .

typecheck:
	docker compose exec backend mypy app/

db-shell:
	docker compose exec postgres psql -U skilltrace -d skilltrace

redis-shell:
	docker compose exec redis redis-cli

flower:
	open http://localhost:5555

api-docs:
	open http://localhost:8000/docs

frontend-dev:
	cd frontend && npm run dev

db-down:
	docker compose down -v

rebuild:
	docker compose up --build --force-recreate
