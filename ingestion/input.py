import csv
import logging

logger = logging.getLogger(__name__)


def read(file: str) -> list[dict]:
    try:
        transactions = []
        with open(file) as f:
            reader = csv.DictReader(f)
            if reader.fieldnames is not None:
                reader.fieldnames = [h.strip() for h in reader.fieldnames]
            for row in reader:
                transactions.append(row)
        logger.info("Read %d rows from %s", len(transactions), file)
        return transactions
    except FileNotFoundError:
        logger.error("File not found: %s", file)
        raise
    except Exception as e:
        logger.exception("Error reading CSV: %s", e)
        raise
