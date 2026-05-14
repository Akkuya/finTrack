import sqlite3
import logging
import models

logger = logging.getLogger(__name__)


def get_transactions(db: sqlite3.Connection) -> list:
    logger.debug("Fetching all transactions")
    return db.execute("SELECT * FROM TRANSACTIONS").fetchall()


def get_categories(db: sqlite3.Connection) -> list:
    logger.debug("Fetching all categories")
    return db.execute("SELECT * FROM CATEGORIES").fetchall()


def get_goals(db: sqlite3.Connection) -> list:
    logger.debug("Fetching all goals")
    return db.execute("SELECT * FROM GOALS").fetchall()


def get_goal(db: sqlite3.Connection, id: int) -> models.Goal | None:
    logger.debug("Fetching goal id=%s", id)
    row = db.execute("SELECT * FROM GOALS WHERE ID = ?", (id,)).fetchone()
    if row is None:
        logger.warning("Goal id=%s not found", id)
        return None
    goal = models.Goal(**dict(row))
    logger.info("Found goal: %s", goal.item_name)
    return goal
