import sqlite3

import models
from db import read, write


def make_db() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(
        """
        CREATE TABLE transactions(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT, name TEXT, amount REAL, direction INTEGER,
            account TEXT, currency TEXT,
            category_id INTEGER REFERENCES categories(id),
            updated_at TEXT
        );
        CREATE TABLE categories(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT, budget_limit REAL, colour STRING,
            counts_as_cashflow INTEGER DEFAULT 1
        );
        CREATE TABLE goals(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name TEXT, target_price REAL, description TEXT,
            necessity REAL, necessity_source INTEGER, status INTEGER, target_date TEXT
        );
        """
    )
    conn.execute(
        "INSERT INTO categories(name, budget_limit, colour, counts_as_cashflow) "
        "VALUES(?, ?, ?, ?)",
        ("Food", None, "#ef4444", 1),
    )
    conn.execute(
        "INSERT INTO categories(name, budget_limit, colour, counts_as_cashflow) "
        "VALUES(?, ?, ?, ?)",
        ("Transfers", None, "#3b82f6", 0),
    )
    return conn


def add_txn(conn: sqlite3.Connection, category_id: int | None) -> int:
    t = models.Transaction(
        date="2024-01-05",
        name="MCDONALDS",
        amount=9.99,
        direction=-1,
        account="Tangerine",
        currency="CAD",
        category_id=category_id,
    )
    write.db_write_transaction(t, conn)
    row = conn.execute("SELECT id FROM TRANSACTIONS WHERE name = 'MCDONALDS'").fetchone()
    return row["id"]


def fetch_category(conn, txn_id: int):
    return conn.execute(
        "SELECT category_id FROM TRANSACTIONS WHERE id = ?", (txn_id,)
    ).fetchone()


class TestUpdateTransaction:
    def test_category_change(self):
        conn = make_db()
        txn_id = add_txn(conn, 1)
        write.db_update_transaction(
            txn_id, "2024-01-05", "MCDONALDS", 9.99, -1, "Tangerine", "CAD", 2, conn
        )
        row = fetch_category(conn, txn_id)
        assert row["category_id"] == 2

    def test_category_set_to_none_uncategorizes(self):
        conn = make_db()
        txn_id = add_txn(conn, 1)
        # the fix: None explicitly clears the category
        write.db_update_transaction(
            txn_id, "2024-01-05", "MCDONALDS", 9.99, -1, "Tangerine", "CAD", None, conn
        )
        row = fetch_category(conn, txn_id)
        assert row["category_id"] is None

    def test_unchanged_sentinel_keeps_category(self):
        conn = make_db()
        txn_id = add_txn(conn, 1)
        # omit category_id entirely -> keep existing (default sentinel)
        write.db_update_transaction(
            txn_id, "2024-01-05", "MCDONALDS", 9.99, -1, "Tangerine", "CAD", db=conn
        )
        row = fetch_category(conn, txn_id)
        assert row["category_id"] == 1

    def test_invalid_category_raises(self):
        conn = make_db()
        txn_id = add_txn(conn, None)
        import pytest

        with pytest.raises(ValueError):
            write.db_update_transaction(
                txn_id, "2024-01-05", "MCDONALDS", 9.99, -1, "Tangerine", "CAD", 999, conn
            )


class TestDeleteCategory:
    def test_cannot_delete_category_with_transactions(self):
        conn = make_db()
        add_txn(conn, 1)
        import pytest

        with pytest.raises(ValueError):
            write.db_delete_category(1, conn)
        # category still present
        assert read.get_category_by_id(conn, 1) is not None

    def test_can_delete_empty_category(self):
        conn = make_db()
        write.db_delete_category(2, conn)  # Transfers has no transactions
        assert read.get_category_by_id(conn, 2) is None

    def test_delete_missing_category_raises(self):
        conn = make_db()
        import pytest

        with pytest.raises(ValueError):
            write.db_delete_category(999, conn)
