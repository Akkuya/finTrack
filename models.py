from pydantic import BaseModel


class Transaction(BaseModel):
    date: str
    name: str
    amount: float
    direction: int
    account: str | None
    currency: str | None
    category_id: int | None


class Goal(BaseModel):
    item_name: str
    target_price: float
    description: str
    necessity: float
    necessity_source: int
    status: int
    target_date: str


class Category(BaseModel):
    id: int
    name: str
    budget_limit: float | None
    colour: str | None


class CategoryUpdate(BaseModel):
    name: str | None = None
    budget_limit: float | None = None
    colour: str | None = None


class Advice(BaseModel):
    generated_at: str
    context_snapshot: str
    advice_text: str


class Account(BaseModel):
    institution: str
    type: str
    balance: float
