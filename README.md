# MealPrep Planner

MealPrep Planner is a full-stack meal planning application focused on ingredients, nutrition, pricing, and future recipe/meal-plan workflows. The repository currently contains a working frontend/backend slice for ingredient management and lookup rather than a fully polished end-to-end planner.

## Current implementation status

The project is now beyond a simple scaffold. The current implementation includes:

- A Next.js App Router frontend with TypeScript, React, and Tailwind CSS
- A FastAPI backend with typed settings, CORS, and a structured API router
- SQLAlchemy models and a SQLite-backed persistence layer using the local file `mealprep.db`
- A seeded ingredient data model with starter rows created on startup and via Alembic
- A working ingredient listing endpoint: `GET /api/ingredients`
- A resolve endpoint: `GET /api/ingredients/resolve?query=...`
- Optional external ingredient lookup via the USDA FoodData Central API when an API key is configured
- A typed frontend service layer that calls the backend and renders ingredient data on the home page

## Architecture at a glance

- `frontend/` - Next.js app for the user interface
  - `app/` hosts the app router pages
  - `services/` contains API clients
  - `types/` defines shared frontend types
- `backend/` - FastAPI application
  - `app/api/routes/` defines HTTP endpoints
  - `app/services/` contains business logic
  - `app/models/` and `app/schemas/` define persistence and response schemas
  - `app/database/` handles session creation and database setup
- `docs/` - architecture notes and decision records
- `.github/` - repository workflows and templates

## Current API surface

The backend currently exposes:

- `GET /api/health` - simple health check
- `GET /api/ingredients` - list persisted ingredients
- `GET /api/ingredients/resolve?query=<name>` - look up a food by name

The resolve flow checks the local database first and then uses the external FoodData Central lookup if needed. Newly resolved ingredients are persisted so future lookups are faster.

## Local development

### Prerequisites

- Node.js 20+
- Python 3.11+

### 1. Create environment files

From the repository root:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

### 2. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### 3. Run the backend

```bash
python3 -m venv .venv
source .venv/bin/activate
cd backend
python -m pip install -e '.[dev]'
```

Then start the API:

```bash
python -m uvicorn app.main:app --reload --app-dir backend
```

The backend will be available at `http://127.0.0.1:8000`.

### 4. Apply database migrations

The project includes Alembic scaffolding for schema changes. To apply the current migration:

```bash
cd backend
alembic upgrade head
```

## Quick checks

### Health

```bash
curl http://127.0.0.1:8000/api/health
```

### Ingredients

```bash
curl http://127.0.0.1:8000/api/ingredients
```

### Resolve an ingredient

```bash
curl "http://127.0.0.1:8000/api/ingredients/resolve?query=chicken%20breast"
```

## Project roadmap

The next milestones should focus on turning this into a fuller meal-planning product:

1. Add CRUD endpoints and UI for managing ingredients
2. Introduce authentication and user-scoped data
3. Add recipe and meal-plan entities
4. Build grocery-list and weekly-planning flows
5. Expand pricing and nutrition workflows
6. Consider moving from SQLite to PostgreSQL as the domain grows

## Verification notes

The current implementation has been sanity-checked with:

- `cd frontend && npm run typecheck`
- `cd backend && python -m compileall app`
- `cd backend && alembic upgrade head`
