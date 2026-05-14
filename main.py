from db import schema


def main():
    print("Hello from fintrack!")
    schema.init_db("db/data.db")


if __name__ == "__main__":
    main()
