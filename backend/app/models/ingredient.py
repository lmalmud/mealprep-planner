from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.schemas.ingredient import (
    IngredientMacros,
    IngredientPrice,
    IngredientRead,
    IngredientServingRead,
)


class Ingredient(Base):
    __tablename__ = "ingredients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    # Macro values are "per default serving" — i.e. per whichever IngredientServing
    # has is_default=True. Converting to any other serving requires both that
    # serving and the default serving to have a known `grams` value.
    calories_kcal: Mapped[float] = mapped_column(Float, nullable=False)
    protein_g: Mapped[float] = mapped_column(Float, nullable=False)
    carbs_g: Mapped[float] = mapped_column(Float, nullable=False)
    fat_g: Mapped[float] = mapped_column(Float, nullable=False)
    fiber_g: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    sugar_g: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    price_amount: Mapped[float] = mapped_column(Float, nullable=False)
    price_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    # A source page for this ingredient's data (e.g. the product URL it was
    # extracted from) — purely informational, kept for the user's own reference.
    source_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)

    servings: Mapped[list["IngredientServing"]] = relationship(
        back_populates="ingredient",
        cascade="all, delete-orphan",
    )

    def default_serving(self) -> "IngredientServing | None":
        return next((serving for serving in self.servings if serving.is_default), None)

    def price_serving(self) -> "IngredientServing | None":
        return next((serving for serving in self.servings if serving.is_price_serving), None) or self.default_serving()

    def to_read(self) -> IngredientRead:
        default = self.default_serving()
        price_serving = self.price_serving()
        return IngredientRead(
            id=self.id,
            name=self.name,
            servings=[
                IngredientServingRead(id=s.id, label=s.label, grams=s.grams, is_default=s.is_default)
                for s in self.servings
            ],
            default_serving_id=default.id if default else None,
            macros=IngredientMacros(
                calories_kcal=self.calories_kcal,
                protein_g=self.protein_g,
                carbs_g=self.carbs_g,
                fat_g=self.fat_g,
                fiber_g=self.fiber_g,
                sugar_g=self.sugar_g,
            ),
            price=IngredientPrice(
                amount=self.price_amount,
                currency=self.price_currency,
                serving_id=price_serving.id if price_serving else None,
            ),
            source_url=self.source_url,
        )


class IngredientServing(Base):
    __tablename__ = "ingredient_servings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ingredient_id: Mapped[int] = mapped_column(
        ForeignKey("ingredients.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    # None means "unknown gram equivalent" (e.g. a plain "1 package" with no
    # known weight) — this serving can't be converted to/from any other unit
    # until a real gram value is supplied.
    grams: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_price_serving: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    ingredient: Mapped[Ingredient] = relationship(back_populates="servings")
