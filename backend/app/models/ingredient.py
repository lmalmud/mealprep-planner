from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.schemas.ingredient import IngredientMacros, IngredientPrice, IngredientRead


class Ingredient(Base):
    __tablename__ = "ingredients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    calories_kcal: Mapped[float] = mapped_column(Float, nullable=False)
    protein_g: Mapped[float] = mapped_column(Float, nullable=False)
    carbs_g: Mapped[float] = mapped_column(Float, nullable=False)
    fat_g: Mapped[float] = mapped_column(Float, nullable=False)
    price_amount: Mapped[float] = mapped_column(Float, nullable=False)
    price_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    price_unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    price_servings_per_container: Mapped[float | None] = mapped_column(Float, nullable=True)
    serving_unit: Mapped[str] = mapped_column(String(50), nullable=False)

    def to_read(self) -> IngredientRead:
        return IngredientRead(
            id=self.id,
            name=self.name,
            serving_unit=self.serving_unit,
            macros=IngredientMacros(
                calories_kcal=self.calories_kcal,
                protein_g=self.protein_g,
                carbs_g=self.carbs_g,
                fat_g=self.fat_g,
            ),
            price=IngredientPrice(
                amount=self.price_amount,
                currency=self.price_currency,
                unit=self.price_unit,
                servings_per_container=self.price_servings_per_container,
            ),
        )