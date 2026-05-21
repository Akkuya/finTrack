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
        "name TEXT, budget_limit REAL, colour STRING)"
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
            ("Food", None, "#ef4444"),
            ("Clothing", None, "#ec4899"),
            ("Investments", None, "#8b5cf6"),
            ("Transfers", None, "#3b82f6"),
            ("Shopping", None, "#eab308"),
            ("Entertainment", None, "#22c55e"),
            ("Transport", None, "#f97316"),
            ("Subscriptions", None, "#14b8a6"),
            ("Other", None, "#6b7280"),
        ]
        cursor.executemany(
            "INSERT INTO categories(name, budget_limit, colour) VALUES(?, ?, ?)", defaults
        )
        logger.info("Seeded %d default categories", len(defaults))

    try:
        cursor.execute("ALTER TABLE transactions ADD COLUMN updated_at TEXT")
        logger.info("Added updated_at column to transactions")
    except sqlite3.OperationalError:
        pass
    connection.commit()
    connection.close()

    logger.info("Database initialized successfully")
