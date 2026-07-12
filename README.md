# MealPrep Planner

MealPrep Planner is a full-stack web application for meal planning, budgeting, and nutrition tracking.

This repository is intentionally built in milestones to keep architecture clean and scalable.

## Vision

Plan an entire week of meals using reusable recipes and automatically calculate:

- Calories and macros
- Cost per recipe and serving
- Weekly grocery list
- Weekly grocery budget

## What Is Implemented Today

- Monorepo-style project structure with clear frontend/backend boundaries
- Next.js frontend scaffold (TypeScript + App Router + Tailwind CSS)
- FastAPI backend scaffold (typed settings + API router)
- Health endpoint: `GET /api/health`
- Ingredients endpoint: `GET /api/ingredients`
- Ingredient payload includes macro information and pricing information
- Frontend integration that fetches backend health + ingredients and renders them on the home page
- Typed frontend service layer for API calls

Note: ingredient data is currently seed data from a service module (not database-backed yet).

## MVP Targets

- User accounts
- Ingredient database
- Recipe CRUD
- Weekly planner
- Grocery list generation
- USDA FoodData Central integration
- Manual and automatic pricing

## Future Roadmap

- Pantry inventory
- AI meal plan generation
- Multi-store pricing
- Price history
- Recipe sharing

## Tech Stack

- Frontend: Next.js + React + TypeScript + Tailwind CSS
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL (production target), SQLite (local development)

## Repository Layout

- `frontend/` - Next.js App Router frontend (TypeScript + Tailwind CSS)
- `backend/` - FastAPI backend (Python + SQLAlchemy)
- `docs/` - Architecture notes and decision records
- `.github/` - GitHub workflows and templates

## Local Setup

### Prerequisites

- Node.js 20+
- Python 3.11+

### Frontend Run

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Configure environment:

```bash
cp .env.example .env.local
```

3. Start dev server:

```bash
npm run dev
```

Frontend runs at `http://localhost:3000`.

### Backend Run

1. Create/activate a virtual environment (example):

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. Install backend dependencies:

```bash
python -m pip install -e 'backend[dev]'
```

3. Optional env file:

```bash
cp backend/.env.example backend/.env
```

4. Start API server:

```bash
python -m uvicorn app.main:app --reload --app-dir backend
```

Backend runs at `http://127.0.0.1:8000`.

## Debug Instructions

### Quick Endpoint Checks

- Health:

```bash
curl http://127.0.0.1:8000/api/health
```

- Ingredients:

```bash
curl http://127.0.0.1:8000/api/ingredients
```

### Frontend Debug

- Run `npm run dev` in `frontend/`
- Open `http://localhost:3000`
- Use browser DevTools network tab to inspect API requests and payloads

### Backend Debug

- Run uvicorn with reload:

```bash
python -m uvicorn app.main:app --reload --app-dir backend --log-level debug
```

- Set breakpoints in route/service files (for example: `backend/app/api/routes/ingredients.py` and `backend/app/services/ingredient_service.py`) and use VS Code Python debugging to step through requests.

## Troubleshooting

### `npm run dev` fails from the repository root

Run the frontend commands from the `frontend/` directory, or use:

```bash
npm --prefix frontend run dev
```

### Tailwind/PostCSS plugin error

If Next.js reports that `tailwindcss` is being used directly as a PostCSS plugin, install the newer plugin package and use the updated config:

- `@tailwindcss/postcss`
- `frontend/postcss.config.mjs`

### Backend Python version mismatch

If editable install fails because of the Python version, make sure the active environment matches the backend requirement in `backend/pyproject.toml`.
