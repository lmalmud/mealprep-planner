from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.ingredients import router as ingredients_router
from app.api.routes.meals import router as meals_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(ingredients_router, tags=["ingredients"])
api_router.include_router(meals_router, tags=["meals"])
