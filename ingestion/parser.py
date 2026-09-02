import logging

from ingestion.parsers import simplii, tangerine
from models import Transaction

logger = logging.getLogger(__name__)

PARSERS = {"simplii": simplii, "tangerine": tangerine}


def parse_all(rows: list[dict], bank: str) -> list[Transaction]:
    if not rows:
        return []
    if bank not in PARSERS:
        raise ValueError(f"Unknown bank format: {bank!r}. Supported: {list(PARSERS)}")
    format_module = PARSERS[bank]
    parsed = [format_module.parse(row) for row in rows]
    return [t for t in parsed if t.amount != 0.0]
