import logging

from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import get_db
from db import read
from llm.advise import general_advice, goal_advice

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Advice"])


@router.get("/advice/general")
def get_general_advice(db=Depends(get_db)):
    logger.info("GET /advice/general")
    transactions = read.get_transactions(db)
    response = general_advice(transactions)
    return {"advice": response}


@router.get("/advice/goal/{goal_id}")
def get_goal_advice(goal_id: int, db=Depends(get_db)):
    logger.info("GET /advice/goal/%s", goal_id)
    goal = read.get_goal(db, goal_id)
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    transactions = read.get_transactions(db)
    response = goal_advice(goal, transactions)
    return {"advice": response}
