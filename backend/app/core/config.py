from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    app_name: str = "MealPrep Planner API"
    app_env: str = "development"
    database_url: str = "sqlite:///./mealprep.db"
    frontend_origin: str = "http://localhost:3000"
    food_data_central_api_key: str = ""
    food_data_central_base_url: str = "https://api.nal.usda.gov/fdc/v1"

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
