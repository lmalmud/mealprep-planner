from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import settings


@dataclass(frozen=True)
class FoodDataIngredientCandidate:
    name: str
    calories_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    serving_unit: str


class FoodDataCentralUnavailableError(RuntimeError):
    pass


class FoodDataCentralClient:
    def search(self, query: str) -> FoodDataIngredientCandidate | None:
        if not settings.food_data_central_api_key:
            raise FoodDataCentralUnavailableError(
                "FDC API key is not configured. Set FOOD_DATA_CENTRAL_API_KEY to enable external lookup."
            )

        url = f"{settings.food_data_central_base_url.rstrip('/')}/foods/search"
        params = {
            "api_key": settings.food_data_central_api_key,
            "query": query,
            "pageSize": 1,
        }

        with httpx.Client(timeout=15.0) as client:
            response = client.get(url, params=params)
            response.raise_for_status()

        payload: dict[str, Any] = response.json()
        foods = payload.get("foods") or []
        if not foods:
            return None

        food = foods[0]
        nutrients = {
            str(item.get("nutrientNumber")): float(item.get("value") or 0.0)
            for item in food.get("foodNutrients") or []
            if item.get("nutrientNumber") is not None
        }

        serving_size = food.get("servingSize")
        serving_unit = str(food.get("servingSizeUnit") or "serving")
        if serving_size:
            serving_unit = f"{serving_size}{serving_unit}".replace(" ", "")

        return FoodDataIngredientCandidate(
            name=str(food.get("description") or query).strip(),
            calories_kcal=nutrients.get("1008", 0.0),
            protein_g=nutrients.get("1003", 0.0),
            carbs_g=nutrients.get("1005", 0.0),
            fat_g=nutrients.get("1004", 0.0),
            serving_unit=serving_unit,
        )
