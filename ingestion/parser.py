from dataclasses import dataclass
from typing import Optional

@dataclass
class Transaction:
    date: str
    name: str
    amount: float
    direction: int
    account: Optional[str]
    currency: Optional[str]
    category_id: Optional[int]

def parse(row: dict) -> Transaction:
    funds_in = 0 if row["Funds In"] == "" else float(row["Funds In"])
    funds_out = 0 if row["Funds Out"] == "" else float(row["Funds Out"])
    amount = funds_in - funds_out
    direction = 1
    if amount < 0:
        direction = -1
    amount = abs(amount)
    transaction = Transaction(row["Date"], row["Transaction Details"], amount, direction, None, None, None)

    return transaction