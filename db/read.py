import logging
import sqlite3

import models

logger = logging.getLogger(__name__)


def get_transactions(db: sqlite3.Connection) -> list[models.Transaction]:
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


def get_transactions_by_category(
    db: sqlite3.Connection, category_id: int
) -> list[models.Transaction]:
    logger.debug(f"Fetching transactions with category {category_id}")
    return db.execute("SELECT * FROM TRANSACTIONS WHERE category_id = ?", (category_id,)).fetchall()


def get_summary(
    db: sqlite3.Connection,
    direction: int = -1,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict:
    filters = ["direction = ?"]
    params: list = [direction]

    if date_from:
        filters.append("date >= ?")
        params.append(date_from)
    if date_to:
        filters.append("date <= ?")
        params.append(date_to)

    # Exclude rows whose category is flagged as non-cashflow (e.g. Transfers,
    # Investments — pure money relocation that isn't spending/income). Salary and
    # genuine income categories remain included. Uncategorized rows
    # (category_id NULL) still count.
    where = " AND ".join(filters)

    rows = db.execute(
        f"SELECT t.category_id, COALESCE(c.name, 'Uncategorized') AS name, "
        f"SUM(t.amount) AS total, COUNT(*) AS count "
        f"FROM TRANSACTIONS t LEFT JOIN CATEGORIES c ON t.category_id = c.id "
        f"WHERE {where} AND (c.counts_as_cashflow IS NULL OR c.counts_as_cashflow = 1) "
        f"GROUP BY t.category_id ORDER BY total DESC",
        params,
    ).fetchall()

    totals = db.execute(
        f"SELECT COALESCE(SUM(t.amount), 0), COUNT(*) "
        f"FROM TRANSACTIONS t LEFT JOIN CATEGORIES c ON t.category_id = c.id "
        f"WHERE {where} AND (c.counts_as_cashflow IS NULL OR c.counts_as_cashflow = 1)",
        params,
    ).fetchone()
    total = totals[0] or 0
    tx_count = totals[1]

    categories = []
    for row in rows:
        categories.append(
            {
                "category_id": row["category_id"],
                "category_name": row["name"],
                "total": row["total"],
                "count": row["count"],
                "percentage": round(row["total"] / total * 100, 1) if total else 0,
            }
        )

    return {"categories": categories, "total": total, "transaction_count": tx_count}
