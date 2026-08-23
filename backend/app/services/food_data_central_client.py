import time
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import settings

# api.data.gov's gateway (which fronts FoodData Central) can return a transient,
# opaque 404 or 429 under throttling or while a newly-issued key is still
# propagating — retrying briefly resolves most of these without user-visible errors.
_RETRYABLE_STATUS_CODES = {404, 429}
_MAX_ATTEMPTS = 3
_RETRY_DELAY_SECONDS = 1.0


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
    def _get_with_retries(
        self, client: httpx.Client, url: str, params: dict[str, Any]
    ) -> httpx.Response:
        last_response: httpx.Response | None = None
        last_error: str | None = None

        for attempt in range(1, _MAX_ATTEMPTS + 1):
            try:
                response = client.get(url, params=params)
            except httpx.HTTPError as exc:
                last_error = str(exc)
            else:
                if response.status_code < 400:
                    return response
                if response.status_code not in _RETRYABLE_STATUS_CODES:
                    raise FoodDataCentralUnavailableError(
                        f"FoodData Central lookup failed: "
                        f"HTTP {response.status_code}: {response.text[:500]}"
                    )
                last_response = response

            if attempt < _MAX_ATTEMPTS:
                time.sleep(_RETRY_DELAY_SECONDS)

        detail = (
            f"HTTP {last_response.status_code}: {last_response.text[:500]}"
            if last_response is not None
            else last_error
        )
        raise FoodDataCentralUnavailableError(
            f"FoodData Central lookup failed after {_MAX_ATTEMPTS} attempts: {detail}"
        )

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
            response = self._get_with_retries(client, url, params)

        payload: dict[str, Any] = response.json()
        foods = payload.get("foods") or []
        if not foods:
            return None

        food = foods[0]
        # Parse nutrients robustly: match by nutrient name or known nutrient numbers
        calories = 0.0
        protein = 0.0
        carbs = 0.0
        fat = 0.0

        for item in food.get("foodNutrients") or []:
            value = item.get("value")
            try:
                val = float(value or 0.0)
            except (TypeError, ValueError):
                val = 0.0

            # nutrient metadata may be in different keys depending on API response
            name = (item.get("nutrientName") or item.get("name") or "")
            num = str(item.get("nutrientNumber") or item.get("nutrientId") or "")
            lower = str(name).lower()

            if "energy" in lower or "kcal" in lower or "calorie" in lower or num in ("208", "1008"):
                calories = val
            elif "protein" in lower or num in ("203", "1003"):
                protein = val
            elif "carbohydrate" in lower or "carb" in lower or num in ("205", "1005"):
                carbs = val
            elif "fat" in lower or "lipid" in lower or num in ("204", "1004"):
                fat = val

        serving_size = food.get("servingSize")
        serving_unit = str(food.get("servingSizeUnit") or "serving")
        if serving_size:
            serving_unit = f"{serving_size}{serving_unit}".replace(" ", "")

        return FoodDataIngredientCandidate(
            name=str(food.get("description") or query).strip(),
            calories_kcal=calories,
            protein_g=protein,
            carbs_g=carbs,
            fat_g=fat,
            serving_unit=serving_unit,
        )
