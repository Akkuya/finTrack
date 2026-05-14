import models
from llm import interface

categories = [
    "Food",
    "Clothing",
    "Investments",
    "Transfers",
    "Shopping",
    "Entertainment",
    "Transport",
    "Subscriptions",
    "Other",
]


def categorize(transaction: models.Transaction) -> str:
    return interface.prompt(
        f"Return one word from the list of transactions that you think this one falls under. No punctuation, no explanation. Just the word. Transcation Name: {transaction.name}, Amount: {transaction.amount}. Categories: {str(categories)}"
    )
