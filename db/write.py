import logging
import sqlite3

import models

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
