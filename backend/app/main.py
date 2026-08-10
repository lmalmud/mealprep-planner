from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.router import api_router
from app.core.config import settings
from app.database.base import Base
from app.database.session import SessionLocal, engine
from app.models.ingredient import Ingredient
from app.models.meal import Meal, MealPlan, MealPlanAssignment, MealIngredient


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api")

    @app.on_event("startup")
    def on_startup() -> None:
        Base.metadata.create_all(bind=engine)

        db = SessionLocal()
        try:
            if db.scalar(select(Ingredient.id).limit(1)) is None:
                db.add_all(
                    [
                        Ingredient(
                            name="Chicken Breast",
                            calories_kcal=165,
                            protein_g=31,
                            carbs_g=0,
                            fat_g=3.6,
                            price_amount=1.99,
                            price_currency="USD",
                            price_unit="100g",
                        ),
                        Ingredient(
                            name="Brown Rice",
                            calories_kcal=111,
                            protein_g=2.6,
                            carbs_g=23,
                            fat_g=0.9,
                            price_amount=0.35,
                            price_currency="USD",
                            price_unit="100g",
                        ),
                        Ingredient(
                            name="Broccoli",
                            calories_kcal=35,
                            protein_g=2.4,
                            carbs_g=7.2,
                            fat_g=0.4,
                            price_amount=0.79,
                            price_currency="USD",
                            price_unit="100g",
                        ),
                    ]
                )
                db.commit()
        finally:
            db.close()

    return app


app = create_app()
