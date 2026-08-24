import re

_LEADING_NUMBER = re.compile(r"^([\d.]+)\s*(.*)$")


def parse_amount_unit(text: str) -> tuple[float, str] | None:
    """Split a free-text quantity like "170g" into (170.0, "g"). Returns None
    when there's no leading number to parse (e.g. "1 package")."""
    match = _LEADING_NUMBER.match(text.strip())
    if not match:
        return None

    try:
        amount = float(match.group(1))
    except ValueError:
        return None
    if amount <= 0:
        return None

    unit = match.group(2).strip() or "g"
    return amount, unit
