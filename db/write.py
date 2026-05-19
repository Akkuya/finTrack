import logging
import sqlite3

import models
from db import read

logger = logging.getLogger(__name__)


def db_write_transaction(transaction: models.Transaction, db: sqlite3.Connection):
    logger.info("Writing transaction: %s - %.2f", transaction.name, transaction.amount)
    db.execute(
        "INSERT INTO TRANSACTIONS(date, name, amount, direction, account, currency, category_id) "
        "VALUES(?, ?, ?, ?, ?, ?, ?)",
        (
            transaction.date,
            transaction.name,
            transaction.amount,
            transaction.direction,
            transaction.account,
            transaction.currency,
            transaction.category_id,
        ),
    )
    db.commit()
    logger.debug("Transaction written")


def db_write_goal(goal: models.Goal, db: sqlite3.Connection):
    logger.info("Writing goal: %s - %.2f", goal.item_name, goal.target_price)
    db.execute(
        "INSERT INTO GOALS(item_name, target_price, description, "
        "necessity, necessity_source, status, target_date) "
        "VALUES(?, ?, ?, ?, ?, ?, ?)",
        (
            goal.item_name,
            goal.target_price,
            goal.description,
            goal.necessity,
            goal.necessity_source,
            goal.status,
            goal.target_date,
        ),
    )
    db.commit()
    logger.debug("Goal written")


def db_write_category(category: models.Category, db: sqlite3.Connection):
    logger.info("Writing category: %s - %.2f", category.name, category.budget_limit)
    try:
        db.execute(
            "INSERT INTO CATEGORIES(name, budget_limit, colour) VALUES(?, ?, ?)",
            (category.name, category.budget_limit, category.colour),
        )
    except sqlite3.IntegrityError:
        raise ValueError(f"Category '{category.name}' already exists")
    db.commit()
    logger.debug("Category written")


def db_update_category(
    id: int,
    name: str | None,
    budget_limit: float | None,
    colour: str | None,
    db: sqlite3.Connection,
):
    logger.info("Updating category id=%s", id)
    existing = db.execute("SELECT * FROM CATEGORIES WHERE ID = ?", (id,)).fetchone()
    if existing is None:
        raise ValueError("Category not found")

    new_name = name if name is not None else existing["name"]
    new_budget = budget_limit if budget_limit is not None else existing["budget_limit"]
    new_colour = colour if colour is not None else existing["colour"]

    try:
        db.execute(
            "UPDATE CATEGORIES SET name = ?, budget_limit = ?, colour = ? WHERE ID = ?",
            (new_name, new_budget, new_colour, id),
        )
    except sqlite3.IntegrityError:
        raise ValueError(f"Category '{new_name}' already exists")
    db.commit()
    logger.debug("Category id=%s updated", id)


def db_delete_category(id: int, db: sqlite3.Connection):
    logger.info("Deleting category id=%s", id)
    existing = db.execute("SELECT * FROM CATEGORIES WHERE ID = ?", (id,)).fetchone()
    if existing is None:
        raise ValueError("Category not found")

    non_empty = read.get_transactions_by_category(db, id)
    if non_empty:
        raise ValueError("Category has transactions")

    db.execute("DELETE FROM CATEGORIES WHERE id = ?", (id,))
    db.commit()
    logger.debug("Category id=%s deleted", id)
