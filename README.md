# Macro & Market

Macro & Market is a full-stack meal planning application focused on ingredients, nutrition, pricing, and future recipe/meal-plan workflows. The repository currently contains a working frontend/backend slice for ingredient management and lookup rather than a fully polished end-to-end planner.

## Current implementation status

The project is now beyond a simple scaffold. The current implementation includes:

- A Next.js App Router frontend with TypeScript, React, and Tailwind CSS
- A FastAPI backend with typed settings, CORS, and a structured API router
- SQLAlchemy models and a SQLite-backed persistence layer using the local file `mealprep.db`
- A seeded ingredient data model with starter rows created on startup and via Alembic
- Full ingredient CRUD: list, search/resolve, create, edit, and delete — deleting an ingredient that's used in one or more meals also deletes those meals (and their calendar assignments); the confirm dialog checks and names the affected meals first
- A confirm-before-save flow: searching for an ingredient not already in the database returns a non-persisted preview so you can review and edit the values — especially price, which external lookups don't provide — before it's saved
- A Cronometer-style multi-serving unit system: each ingredient carries a list of named servings (e.g. `"154g"`, `"1 medium apple"`, `"6 pack"`), each with its own gram equivalent. One serving is marked as the macro basis (what the calorie/protein/carb/fat numbers are "per"), and one is marked as the price basis (what the price refers to) — they don't have to be the same serving. A serving can also be defined as a multiple of another one already in the list (e.g. "5 x 1 banana"), so buying a pack priced together doesn't require doing the gram math by hand. Mass-unit labels (g/kg/mg/oz/lb, in either short or spelled-out form) have their gram equivalent filled in automatically; other units (a count like "1 apple", a volume like "1 cup") need a gram value entered by hand, since there's no density table to derive one — until it's supplied, that serving simply can't be converted to/from the others, which is shown honestly rather than guessed at. All gram values are rounded to the nearest tenth, since unit-conversion math otherwise produces long floating-point tails.
- Fiber and sugar are tracked alongside calories/protein/carbs/fat on every ingredient; both default to 0 and are safe to leave blank when you don't have the numbers.
- An optional source link per ingredient, for your own reference (e.g. the product page or nutrition source it came from) — auto-filled when an ingredient is added via "paste a product link", editable any time.
- Optional external ingredient lookup via the USDA FoodData Central API when an API key is configured, with automatic retries for the transient errors that gateway is known to return. FDC's nutrient values are always reported per 100g regardless of a product's package size, so a looked-up ingredient's macro-basis serving is always "100g" — a real package/household serving FDC provides (e.g. "1 large egg"), when it converts to a known gram value, is added as a second, non-default serving alongside it rather than (incorrectly) used as the macro basis.
- A typed frontend service layer that calls the backend and renders ingredient data on the home page
- A custom design system (CSS variables for color/type/radius/shadow tokens, `Fraunces` + `Plus Jakarta Sans` via `next/font`, fluid `clamp()` type scale) applied across the home and planner pages
- A one-command dev script (`./scripts/dev.sh`) that starts and stops both the backend and frontend together
- A drag-and-drop weekly meal-plan calendar (`@dnd-kit`) — drag a saved meal onto a day/slot cell, or use the dropdown as a keyboard/accessible alternative
- A "paste a product link" option alongside name search, for branded items: it extracts whatever name/price/image a site's structured product data provides (best-effort, most reliable on sites that publish schema.org/Open Graph product data), and also checks for an embedded nutrition-facts panel (e.g. Target's product pages) before falling back to a FoodData Central name search for macros — all funneled through the same confirm-before-save review step
- A searchable, typeable ingredient picker in the meal builder ("Foods in this meal") — type to filter existing ingredients, or add a not-yet-saved one inline via the same confirm-before-save flow used elsewhere, without leaving the page
- Quantity autofill: picking an ingredient defaults its quantity to one of its serving, and the unit field is a dropdown of that ingredient's own servings plus the common mass units (g/kg/oz/lb), rather than free text
- Per-day calorie/macro totals shown live while building the weekly plan, and again in the saved-plan review — computed via gram-based conversion between whatever unit a meal quantity uses and the ingredient's macro-basis serving
- Meal management (view, edit, delete foods/quantities) on the home page, alongside ingredients — deleting a meal that's used in a saved plan is warned about first, by plan name, then removes it from those plans; the planner page keeps a compact, grid-style saved-meals view as the drag source for the calendar
- Meal plans are fully persisted and editable: a "Your saved plans" list on the planner page lets you load any saved plan back into the builder, keep changing it, and save (update) rather than always creating a new one; plans can also be deleted
- Grocery list generation for a saved plan: converts every meal quantity for an ingredient into grams (via the recognized-mass-unit table or a match against one of the ingredient's own serving labels) and sums them, then — where the price-basis serving has a known gram value — estimates how many containers to buy (`ceil(total grams / price serving grams)`) and the total cost. A quantity that can't be converted (an unrecognized unit with no matching serving) is called out with a note instead of silently dropped or guessed at

## Known limitations

- **Product-link extraction** (`resolve-url`) is intentionally general-purpose and best-effort — it relies on a site publishing schema.org/Open Graph structured data, or embedding a real nutrition-facts panel in its page data (as some retailers, e.g. Target, do), which Amazon does not reliably expose to non-browser requests (their Terms of Service also prohibit automated scraping, so this project doesn't target them specifically). When a site doesn't expose either, macros fall back to a FoodData Central name search and price stays at $0 — expect the confirm dialog to sometimes need manual correction, and note that a price found on the page may refer to a different quantity than the macros (e.g. a whole package vs. a single serving) — the confirm dialog lets you mark a different serving as the price basis when that's the case.
- **Conversion is gram-based, not a full unit-conversion table.** Every serving that can be used across units needs a gram equivalent — automatic for mass units (g/kg/oz/lb/...), manual for anything else (counts, volumes). A serving with no gram value (e.g. an old "0.66cup" carried over from before a unit's gram weight was known) can still be displayed, but can't be converted to/from other units until a gram value is added — the app says so explicitly rather than fabricating a number. Macros themselves are stored "per" whichever serving is marked as the macro basis, not normalized to per-100g.

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
- `GET /api/ingredients/resolve-url?url=<product-url>` - extract a product's name/price/macros from a URL where available, falling back to a FoodData Central name search for any macros the page doesn't provide (same preview/confirm flow as name resolve)
- `POST /api/ingredients` - create a new ingredient
- `PATCH /api/ingredients/{id}` - update an existing ingredient
- `GET /api/ingredients/{id}/usage` - list the names of meals that use this ingredient (used to warn before a cascading delete)
- `DELETE /api/ingredients/{id}` - delete an ingredient, along with any meals (and their calendar assignments) that use it
- `GET /api/meals` - list saved meals
- `POST /api/meals` - create a new meal with specific foods and quantities
- `PATCH /api/meals/{id}` - update a meal's name/description, or replace its entire ingredient list
- `GET /api/meals/{id}/usage` - list the names of saved plans that use this meal (used to warn before a cascading delete)
- `DELETE /api/meals/{id}` - delete a meal, along with any calendar assignments (in saved plans) that reference it
- `GET /api/meal-plans` - list saved meal plans
- `GET /api/meal-plans/{id}` - fetch a single saved plan (used to load it back into the planner for editing)
- `POST /api/meal-plans` - create a new meal plan with day/slot assignments
- `PATCH /api/meal-plans/{id}` - update a plan's name/dates, or replace its entire assignment list
- `DELETE /api/meal-plans/{id}` - delete a saved plan
- `GET /api/meal-plans/{id}/grocery-list` - sum each ingredient's total quantity needed across the plan's assigned meals (converted to grams), with an estimated purchase-container count and cost where the ingredient's price-basis serving has a known gram value

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
3. Consider moving from SQLite to PostgreSQL as the domain grows
4. Volume-to-mass conversion (ml/l/cup/tbsp) via a per-ingredient density value — mass units (g/kg/oz/lb) already convert automatically, but a volume serving still needs its gram value entered by hand since converting it otherwise would require guessing a density
5. Let a meal plan be duplicated as a starting point for a new one ("repeat last week"), now that plans are fully editable and persisted — a common real workflow once you have a plan you're happy with
6. A lightweight automated test suite, especially for the cascade-delete paths (ingredient → meals → plan assignments) and the grocery-list/cost math — these are the highest-consequence code paths (destructive, multi-table, real currency numbers) and are currently verified only by hand
7. A "source" indicator per ingredient (manual entry / FDC name search / URL extraction) — as more branded and URL-sourced ingredients accumulate alongside generic FDC matches, it'd help explain why a given ingredient's numbers look the way they do, and make it easy to flag ones worth double-checking

## Verification notes

The current implementation has been sanity-checked with:

- `cd frontend && npm run typecheck`
- `cd backend && python -m compileall app`
- `cd backend && alembic upgrade head`
- The multi-serving system was verified end-to-end against the running API: creating an ingredient with several named servings (auto-filling gram values for recognized mass-unit labels), updating its servings, building a meal that mixes a named-serving quantity with a bare-gram quantity and one genuinely unconvertible unit, and generating a grocery list from a saved plan — confirming totals, purchase-count/cost estimates, and the "couldn't convert" note all matched hand-calculated expectations before the disposable test data was deleted
- Fiber/sugar and the source-link field were verified via disposable test ingredients (create with values, create with both omitted to confirm the 0 default, update, and explicitly clear the link) before being deleted; a real ingredient (`EGG`) that had been added before a since-fixed FDC-parsing bug — its default serving stored the branded product's raw package-size string, including floating-point noise and an un-normalized unit code, as though it were the macro basis for numbers that were actually per 100g — was corrected in place once the fix landed, and a fresh FDC lookup was re-run live to confirm new lookups now default to a "100g" macro basis with any real package/household serving added as a separate, clearly gram-converted unit alongside it
