import sqlite3
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

DB_PATH = Path("data.db")


def get_db():
    logger.debug("Opening database connection: %s", DB_PATH)
    with sqlite3.connect(str(DB_PATH)) as session:
        session.row_factory = sqlite3.Row
        yield session
    logger.debug("Database connection closed")