import logging

from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import get_db
from db import read, write
from models import Category, CategoryUpdate

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Categories"])


@router.get("/categories")
def get_categories(db=Depends(get_db)):
    logger.info("GET /categories")
    return read.get_categories(db)


@router.post("/categories")
def post_category(category: Category, db=Depends(get_db)):
    logger.info("POST /categories")
    if category.name.strip() == "":
        raise HTTPException(status_code=400, detail="Name is empty")
    elif category.budget_limit is not None and category.budget_limit <= 0:
        raise HTTPException(status_code=400, detail="Budget is non positive.")

    try:
        write.db_write_category(category, db)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {"status": "created", "item": category.name}


@router.get("/categories/{id}")
def get_single_category(id: int, db=Depends(get_db)):
    logger.info(f"GET /categories/{id}")
    category = read.get_category_by_id(db, id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.put("/categories/{id}")
def update_category(id: int, body: CategoryUpdate, db=Depends(get_db)):
    logger.info("PUT /categories/%s", id)
    if body.name is not None and body.name.strip() == "":
        raise HTTPException(status_code=400, detail="Name is empty")
    if body.budget_limit is not None and body.budget_limit <= 0:
        raise HTTPException(status_code=400, detail="Budget is non positive.")
    try:
        write.db_update_category(id, body.name, body.budget_limit, body.colour, db)
    except ValueError as e:
        msg = str(e)
        if "not found" in msg:
            raise HTTPException(status_code=404, detail=msg)
        raise HTTPException(status_code=409, detail=msg)
    return {"status": "updated", "id": id}


@router.delete("/categories/{id}")
def delete_category(id: int, db=Depends(get_db)):
    logger.info(f"DELETE /categories{id}")
    try:
        write.db_delete_category(id, db)
    except ValueError as e:
        msg = str(e)
        if "not found" in msg:
            raise HTTPException(status_code=404, detail=msg)
        raise HTTPException(status_code=409, detail=msg)
    return {"status": "deleted", "id": id}
