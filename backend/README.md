# Backend

FastAPI backend for MealPrep Planner.

## Responsibilities

- expose REST APIs for ingredients, recipes, plans, and grocery lists
- enforce business rules in service modules
- persist data via SQLAlchemy models/repositories
- calculate nutrition and costs in domain services

## Folder conventions

- `app/api/` route definitions and API wiring
- `app/models/` ORM entities
- `app/schemas/` request/response DTOs
- `app/services/` business logic and orchestration
- `app/database/` engine, sessions, and base model
- `app/core/` settings and framework-level concerns
- `app/utils/` focused shared utilities
