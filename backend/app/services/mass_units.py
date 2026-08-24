from app.services.units import parse_amount_unit

# Grams-per-unit for recognized mass units. Anything not in this table (cups,
# tablespoons, "each", "pack", ...) can't be auto-converted without knowing
# the ingredient's density or item weight — those become servings with a
# manually-entered gram value instead.
_GRAMS_PER_UNIT = {
    "g": 1.0,
    "gram": 1.0,
    "grams": 1.0,
    "kg": 1000.0,
    "kilogram": 1000.0,
    "kilograms": 1000.0,
    "mg": 0.001,
    "milligram": 0.001,
    "milligrams": 0.001,
    "oz": 28.3495,
    "ounce": 28.3495,
    "ounces": 28.3495,
    "lb": 453.592,
    "lbs": 453.592,
    "pound": 453.592,
    "pounds": 453.592,
}


def grams_per_mass_unit(unit: str) -> float | None:
    """Look up the grams-per-1 factor for a bare unit word like "g" or "lb".
    Returns None if it isn't a recognized mass unit."""
    return _GRAMS_PER_UNIT.get(unit.strip().lower())


def parse_mass_grams(text: str) -> float | None:
    """Parse free text like "154g", "2lb", "0.5 kg" into a gram value.
    Returns None if the text has no leading number or the unit isn't a
    recognized mass unit (e.g. "0.66cup", "1 package")."""
    parsed = parse_amount_unit(text)
    if parsed is None:
        return None

    amount, unit = parsed
    grams_per_unit = grams_per_mass_unit(unit)
    if grams_per_unit is None:
        return None

    return amount * grams_per_unit
