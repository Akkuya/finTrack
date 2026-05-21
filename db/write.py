import logging
import sqlite3
from datetime import datetime

import models
from db import read

logger = logging.getLogger(__name__)


def db_write_transaction(transaction: models.Transaction, db: sqlite3.Connection):
    logger.info(
        "Writing transaction: %s - %.2f, Category %s",
        transaction.name,
        transaction.amount,
        transaction.category_id,
    )
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


def db_update_transaction(
    id: int,
    date: str | None,
    name: str | None,
    amount: float | None,
    direction: int | None,
    account: str | None,
    currency: str | None,
    category_id: int | None,
    db: sqlite3.Connection,
):
    logger.info("Updating transaction id=%s", id)
    existing = db.execute("SELECT * FROM TRANSACTIONS WHERE ID = ?", (id,)).fetchone()
    if existing is None:
        raise ValueError("Transaction not found")

    new_name = name if name is not None else existing["name"]
    new_date = date if date is not None else existing["date"]
    new_amount = amount if amount is not None else existing["amount"]
    new_direction = direction if direction is not None else existing["direction"]
    new_account = account if account is not None else existing["account"]
    new_currency = currency if currency is not None else existing["currency"]
    new_category_id = category_id if category_id is not None else existing["category_id"]

    if read.get_category_by_id(db, new_category_id) is None:
        raise ValueError("Category not found")

    try:
        db.execute(
            "UPDATE TRANSACTIONS SET date = ?, name = ?, amount = ?, direction = ?, account = ?, currency = ?, category_id = ?, updated_at = ? WHERE ID = ?",
            (
                new_date,
                new_name,
                new_amount,
                new_direction,
                new_account,
                new_currency,
                new_category_id,
                datetime.now().isoformat(),
                id,
            ),
        )
    except sqlite3.IntegrityError:
        raise ValueError(f"Transaction '{new_name}' already exists")
    db.commit()
    logger.debug("Transaction id=%s updated", id)
