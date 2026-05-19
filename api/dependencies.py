import logging
import sqlite3
from pathlib import Path

logger = logging.getLogger(__name__)

DB_PATH = Path("db/data.db")


def get_db():
    logger.debug("Opening database connection: %s", DB_PATH)
    with sqlite3.connect(str(DB_PATH)) as session:
        session.row_factory = sqlite3.Row
        session.execute("PRAGMA foreign_keys = ON")
        yield session
    logger.debug("Database connection closed")
