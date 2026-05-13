import sqlite3

connection = sqlite3.connect("data.db")
cursor = connection.cursor()

cursor.execute("CREATE TABLE IF NOT EXISTS transactions(id INT PRIMARY KEY AUTOINCREMENT, date TEXT, name TEXT, amount FLOAT, direction INT, account TEXT, currency TEXT, category_id INT)")
cursor.execute("CREATE TABLE IF NOT EXISTS categories(id INT, name TEXT, budget_limit FLOAT)")
cursor.execute("CREATE TABLE IF NOT EXISTS goals(id INT, item_name TEXT, target_price FLOAT, description TEXT, necessity FLOAT, necessity_source INT, status INT, target_date TEXT)")

connection.commit()
connection.close()