import logging
import sqlite3

import models

logger = logging.getLogger(__name__)


def get_transactions(db: sqlite3.Connection) -> list:
    logger.debug("Fetching all transactions")
    return db.execute("SELECT * FROM TRANSACTIONS ORDER BY date DESC").fetchall()


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


def get_category_by_id(db: sqlite3.Connection, id: int) -> models.Category | None:
    logger.debug("Fetching category id=%s", id)
    row = db.execute("SELECT * FROM CATEGORIES WHERE ID = ?", (id,)).fetchone()
    if row is None:
        logger.warning("CATEGORY ID=%s not found", id)
        return None
    category = models.Category(**dict(row))
    logger.info("Found goal: %s", category.name)
    return category


def get_transactions_by_category(db: sqlite3.Connection, category_id: int):
    logger.debug(f"Fetching transactions with category {id}")
    return db.execute("SELECT * FROM TRANSACTIONS WHERE category_id = ?", (category_id,)).fetchall()


def get_summary(db: sqlite3.Connection, date_from: int, date_to: int, direction: int) -> dict:
    results = {"categories": [], "total_spent": 0, "transaction_count": 0}

    return results
