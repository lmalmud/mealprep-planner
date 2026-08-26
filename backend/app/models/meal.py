from __future__ import annotations

from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.ingredient import Ingredient
from app.schemas.meal import MealIngredientRead, MealPlanAssignmentRead, MealPlanRead, MealRead


class Meal(Base):
    __tablename__ = "meals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=True)
    total_servings: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    ingredients: Mapped[list["MealIngredient"]] = relationship(
        back_populates="meal",
        cascade="all, delete-orphan",
    )

    def to_read(self) -> MealRead:
        return MealRead(
            id=self.id,
            name=self.name,
            description=self.description or "",
            total_servings=self.total_servings,
            ingredients=[
                MealIngredientRead(
                    ingredient_id=item.ingredient_id,
                    ingredient_name=item.ingredient.name,
                    quantity_amount=item.quantity_amount,
                    quantity_unit=item.quantity_unit,
                )
                for item in self.ingredients
            ],
        )


class MealIngredient(Base):
    __tablename__ = "meal_ingredients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    meal_id: Mapped[int] = mapped_column(ForeignKey("meals.id", ondelete="CASCADE"), nullable=False)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.id"), nullable=False)
    quantity_amount: Mapped[float] = mapped_column(Float, nullable=False)
    quantity_unit: Mapped[str] = mapped_column(String(50), nullable=False)

    meal: Mapped[Meal] = relationship(back_populates="ingredients")
    ingredient: Mapped["Ingredient"] = relationship()


class MealPlan(Base):
    __tablename__ = "meal_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)

    assignments: Mapped[list["MealPlanAssignment"]] = relationship(
        back_populates="meal_plan",
        cascade="all, delete-orphan",
    )

    def to_read(self) -> MealPlanRead:
        return MealPlanRead(
            id=self.id,
            name=self.name,
            start_date=self.start_date.isoformat(),
            duration_days=self.duration_days,
            assignments=[assignment.to_read() for assignment in self.assignments],
        )


class MealPlanAssignment(Base):
    __tablename__ = "meal_plan_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    meal_plan_id: Mapped[int] = mapped_column(ForeignKey("meal_plans.id", ondelete="CASCADE"), nullable=False)
    day_index: Mapped[int] = mapped_column(Integer, nullable=False)
    slot: Mapped[str] = mapped_column(String(50), nullable=False)
    meal_id: Mapped[int] = mapped_column(ForeignKey("meals.id"), nullable=False)
    servings: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    meal_plan: Mapped[MealPlan] = relationship(back_populates="assignments")
    meal: Mapped[Meal] = relationship()

    def to_read(self) -> MealPlanAssignmentRead:
        return MealPlanAssignmentRead(
            id=self.id,
            day_index=self.day_index,
            slot=self.slot,
            meal_id=self.meal_id,
            meal_name=self.meal.name,
            servings=self.servings,
        )
