import logging
from models import Transaction

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = {"Date", "Transaction Details", "Funds In", "Funds Out"}


def parse(row: dict) -> Transaction:
    missing = REQUIRED_COLUMNS - set(row.keys())
    if missing:
        logger.error("Missing CSV columns: %s", missing)
        raise ValueError(f"Missing columns: {missing}")

    funds_in = 0.0 if row["Funds In"] == "" else float(row["Funds In"])
    funds_out = 0.0 if row["Funds Out"] == "" else float(row["Funds Out"])
    amount = abs(funds_in - funds_out)
    direction = 1 if funds_in >= funds_out else -1

    transaction = Transaction(
        date=row["Date"],
        name=row["Transaction Details"],
        amount=amount,
        direction=direction,
        account=None,
        currency=None,
        category_id=None,
    )

    logger.debug("Parsed transaction: %s - %.2f", transaction.name, transaction.amount)
    return transaction