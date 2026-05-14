import logging
from db import read, write
from api.dependencies import get_db
from models import Goal
from fastapi import Depends, APIRouter, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/goals")
def list_goals(db=Depends(get_db)):
    logger.info("GET /goals")
    return read.get_goals(db)


@router.get("/goals/{goal_id}")
def get_goal(goal_id: int, db=Depends(get_db)):
    logger.info("GET /goals/%s", goal_id)
    goal = read.get_goal(db, goal_id)
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.post("/goals")
def create_goal(goal: Goal, db=Depends(get_db)):
    logger.info("POST /goals: %s", goal.item_name)
    write.db_write_goal(goal, db)
    return {"status": "created", "item": goal.item_name}