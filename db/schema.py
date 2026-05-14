import logging
import sqlite3

logger = logging.getLogger(__name__)


def init_db(db_path: str = "data.db") -> None:
    logger.info("Initializing database at %s", db_path)
    connection = sqlite3.connect(db_path)
    cursor = connection.cursor()

    cursor.execute(
        "CREATE TABLE IF NOT EXISTS transactions("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "date TEXT, name TEXT, amount REAL, direction INTEGER, "
        "account TEXT, currency TEXT, category_id INTEGER)"
    )
    cursor.execute(
        "CREATE TABLE IF NOT EXISTS categories("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "name TEXT, budget_limit REAL)"
    )
    cursor.execute(
        "CREATE TABLE IF NOT EXISTS goals("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "item_name TEXT, target_price REAL, description TEXT, "
        "necessity REAL, necessity_source INTEGER, status INTEGER, target_date TEXT)"
    )

    connection.commit()
    connection.close()
    logger.info("Database initialized successfully")
