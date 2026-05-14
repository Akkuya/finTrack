from  pydantic import BaseModel
from typing import Optional


class Transaction(BaseModel):
    date: str
    name: str
    amount: float
    direction: int
    account: Optional[str]
    currency: Optional[str]
    category_id: Optional[int]

class Goal(BaseModel):
    item_name : str
    target_price : float 
    description : str
    necessity : float
    necessity_source :  int
    status :  int 
    target_date : str
    
class Category(BaseModel):
    name: str
    budget_limit: Optional[float]
    
class Advice(BaseModel):
    generated_at: str
    context_snapshot: str
    advice_text: str
    
class Account(BaseModel):
    institution: str
    type: str
    balance: float