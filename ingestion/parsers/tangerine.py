import logging

from ingestion.parsers.common import normalize_mmddyyyy
from models import Transaction

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = {"Date", "Transaction", "Name", "Memo", "Amount"}


def parse(row: dict) -> Transaction:

    missing = REQUIRED_COLUMNS - set(row.keys())
    if missing:
        logger.error("Missing CSV columns: %s", missing)
        raise ValueError(f"Missing columns: {missing}")

    amount = abs(float(row["Amount"]))
    direction = 1 if float(row["Amount"]) >= 0 else -1
    normalized_date = normalize_mmddyyyy(row["Date"])
    name = f"{row['Name']} - {row['Memo']}"

    transaction = Transaction(
        date=normalized_date,
        name=name,
        amount=amount,
        direction=direction,
        account="Tangerine",
        currency="CAD",
        category_id=None,
    )

    logger.debug("Parsed transaction: %s - %.2f", transaction.name, transaction.amount)
    return transaction
