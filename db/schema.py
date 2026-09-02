import logging
import sqlite3

logger = logging.getLogger(__name__)


def init_db(db_path: str = "data.db") -> None:
    logger.info("Initializing database at %s", db_path)
    connection = sqlite3.connect(db_path)
    cursor = connection.cursor()

    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.execute(
        "CREATE TABLE IF NOT EXISTS transactions("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "date TEXT, name TEXT, amount REAL, direction INTEGER, "
        "account TEXT, currency TEXT, "
        "category_id INTEGER REFERENCES categories(id))"
    )
    cursor.execute(
        "CREATE TABLE IF NOT EXISTS categories("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "name TEXT, budget_limit REAL, colour STRING, "
        "counts_as_cashflow INTEGER DEFAULT 1)"
    )
    cursor.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_uniq "
        "ON categories(name COLLATE NOCASE)"
    )
    cursor.execute(
        "CREATE TABLE IF NOT EXISTS goals("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "item_name TEXT, target_price REAL, description TEXT, "
        "necessity REAL, necessity_source INTEGER, status INTEGER, target_date TEXT)"
    )

    existing = cursor.execute("SELECT COUNT(*) FROM categories").fetchone()[0]
    if existing == 0:
        defaults = [
            ("Food", None, "#ef4444", 1),
            ("Clothing", None, "#ec4899", 1),
            ("Investments", None, "#8b5cf6", 0),
            ("Transfers", None, "#3b82f6", 0),
            ("Salary", None, "#22c55e", 1),
            ("Shopping", None, "#eab308", 1),
            ("Entertainment", None, "#a855f7", 1),
            ("Transport", None, "#f97316", 1),
            ("Subscriptions", None, "#14b8a6", 1),
            ("Other", None, "#6b7280", 1),
        ]
        cursor.executemany(
            "INSERT INTO categories(name, budget_limit, colour, counts_as_cashflow) "
            "VALUES(?, ?, ?, ?)",
            defaults,
        )
        logger.info("Seeded %d default categories", len(defaults))

    try:
        cursor.execute("ALTER TABLE categories ADD COLUMN counts_as_cashflow INTEGER DEFAULT 1")
        logger.info("Added counts_as_cashflow column to categories")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE transactions ADD COLUMN updated_at TEXT")
        logger.info("Added updated_at column to transactions")
    except sqlite3.OperationalError:
        pass
    connection.commit()
    connection.close()

    logger.info("Database initialized successfully")
