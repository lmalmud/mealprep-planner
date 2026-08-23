# MealPrep Planner

MealPrep Planner is a full-stack meal planning application focused on ingredients, nutrition, pricing, and future recipe/meal-plan workflows. The repository currently contains a working frontend/backend slice for ingredient management and lookup rather than a fully polished end-to-end planner.

## Current implementation status

The project is now beyond a simple scaffold. The current implementation includes:

- A Next.js App Router frontend with TypeScript, React, and Tailwind CSS
- A FastAPI backend with typed settings, CORS, and a structured API router
- SQLAlchemy models and a SQLite-backed persistence layer using the local file `mealprep.db`
- A seeded ingredient data model with starter rows created on startup and via Alembic
- Full ingredient CRUD: list, search/resolve, create, edit, and delete (delete is blocked with a clear error if the ingredient is used in a meal)
- A confirm-before-save flow: searching for an ingredient not already in the database returns a non-persisted preview so you can review and edit the values — especially price, which external lookups don't provide — before it's saved
- A shared `serving_unit` field (e.g. `"100g"`) that describes the basis for both the macro values and the price, shown in the ingredients table so it's clear what quantity the numbers refer to
- Optional external ingredient lookup via the USDA FoodData Central API when an API key is configured, with automatic retries for the transient errors that gateway is known to return
- A typed frontend service layer that calls the backend and renders ingredient data on the home page
- A custom design system (CSS variables for color/type/radius/shadow tokens, `Fraunces` + `Plus Jakarta Sans` via `next/font`, fluid `clamp()` type scale) applied across the home and planner pages
- A one-command dev script (`./scripts/dev.sh`) that starts and stops both the backend and frontend together
- A drag-and-drop weekly meal-plan calendar (`@dnd-kit`) — drag a saved meal onto a day/slot cell, or use the dropdown as a keyboard/accessible alternative
- A "paste a product link" option alongside name search, for branded items: it extracts whatever name/price/image a site's structured product data provides (best-effort, most reliable on sites that publish schema.org/Open Graph product data), then still runs a FoodData Central search for macros — all funneled through the same confirm-before-save review step

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
- `GET /api/ingredients/resolve-url?url=<product-url>` - extract a product's name/price from a URL, then search for macros by that name (same preview/confirm flow as name resolve)
- `POST /api/ingredients` - create a new ingredient
- `PATCH /api/ingredients/{id}` - update an existing ingredient
- `DELETE /api/ingredients/{id}` - delete an ingredient (409 if it's still used in a meal)
- `GET /api/meals` - list saved meals
- `POST /api/meals` - create a new meal with specific foods and quantities
- `GET /api/meal-plans` - list saved meal plans
- `POST /api/meal-plans` - create a new meal plan with day/slot assignments

The resolve endpoint checks the local database first. If the ingredient already exists, it's returned directly (`status: "existing"`). If it doesn't, and an external FoodData Central API key is configured, it returns a non-persisted preview (`status: "preview"`) with a `$0.00` placeholder price — the frontend shows a confirm dialog so you can review and edit the values before calling `POST /api/ingredients` to actually save it.

The planner screen at `http://localhost:3000/planner` provides a UI for creating meals and multi-day plans interactively.

## Quick start

Once environment files exist (see step 1 below), a single script starts and stops the whole stack:

```bash
./scripts/dev.sh start     # backend on :8000, frontend on :3000
./scripts/dev.sh status    # check what's running
./scripts/dev.sh stop      # stop both
./scripts/dev.sh restart   # stop then start
```

It creates the virtualenv and installs dependencies on first run if needed, applies pending Alembic migrations, and waits for both services to respond before returning. Logs are written to `.run/backend.log` and `.run/frontend.log`.

## Local development

The manual steps below are what `./scripts/dev.sh` automates — use them if you want to run either service individually or understand what the script is doing.

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

### Resolve an ingredient (from local database)

```bash
curl "http://127.0.0.1:8000/api/ingredients/resolve?query=chicken%20breast"
```

## Optional: Enable external ingredient lookup

To allow users to search for any ingredient (not just pre-seeded ones) through the USDA FoodData Central API:

1. Get a free API key at [fdc.nal.usda.gov](https://fdc.nal.usda.gov/api-key-signup.html).
2. Set the environment variable in `backend/.env`:
   ```
   FOOD_DATA_CENTRAL_API_KEY=your_key_here
   ```
3. Restart the backend. The planner and home page will now search the USDA database when users search for new ingredients.

When an ingredient is found via external lookup, the API returns a preview (not yet saved) so you can review and confirm the values in the UI; once confirmed, it's saved to the local database so future searches for that name are instant.

## Project roadmap

The next milestones should focus on turning this into a fuller meal-planning product:

1. Introduce authentication and user-scoped data
2. Add recipe entities (meal and meal-plan entities already exist) and a real `/recipes` page
3. Build grocery-list and weekly-planning flows
4. Expand pricing and nutrition workflows, including per-ingredient serving units that differ from the price basis (today macros and price share one `serving_unit`)
5. Consider moving from SQLite to PostgreSQL as the domain grows
6. Rename the project (in progress — the current name is a placeholder pending a final pick)

**Known limitation:** the `resolve-url` product-link extraction is intentionally general-purpose and best-effort — it relies on a site publishing schema.org/Open Graph structured data, which many independent retailers do but Amazon does not reliably expose to non-browser requests (their Terms of Service also prohibit automated scraping, so this project doesn't target them specifically). Nutrition facts are never available from e-commerce structured data on any retailer, so macros always come from a separate FoodData Central name search — expect the confirm dialog to sometimes need manual correction.

## Verification notes

The current implementation has been sanity-checked with:

- `cd frontend && npm run typecheck`
- `cd backend && python -m compileall app`
- `cd backend && alembic upgrade head`
