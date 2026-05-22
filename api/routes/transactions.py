import logging
import os
import re

from fastapi import APIRouter, Depends, HTTPException, UploadFile

from api.dependencies import get_db
from db import read, write
from ingestion import input, parser
from llm.categorize import categorize_batch
from models import TransactionUpdate

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Transactions"])

_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _validate_date(date: str | None) -> None:
    if date is not None and not _DATE_PATTERN.match(date):
        raise HTTPException(status_code=400, detail="Date must be YYYY-MM-DD")


def _category_name_to_id(name: str, db) -> int | None:
    """Match a category name (case-insensitive) and return its ID."""
    if not name:
        return None
    rows = db.execute(
        "SELECT id, name FROM CATEGORIES WHERE LOWER(name) = ?", (name.lower(),)
    ).fetchone()
    if rows:
        return rows["id"]
    db.execute(
        "INSERT INTO CATEGORIES(name, budget_limit, colour) VALUES(?, NULL, '#6b7280')",
        (name,),
    )
    db.commit()
    logger.info("Auto-created missing category: %s", name)
    return db.execute(
        "SELECT id FROM CATEGORIES WHERE LOWER(name) = ?", (name.lower(),)
    ).fetchone()["id"]


@router.get("/transactions")
def get_transactions(db=Depends(get_db)):
    logger.info("GET /transactions")
    return read.get_transactions(db)


@router.get("/transactions/by-category")
def get_by_category(category_id: int, db=Depends(get_db)):
    logger.info("GET /transactions/by-category?category_id=%s", category_id)
    return read.get_transactions_by_category(db, category_id)


@router.get("/transactions/summary")
def get_summary(
    direction: int = -1,
    date_from: str | None = None,
    date_to: str | None = None,
    db=Depends(get_db),
):
    _validate_date(date_from)
    _validate_date(date_to)
    logger.info("GET /transactions/summary")
    return read.get_summary(db, direction, date_from, date_to)


@router.post("/transactions/import")
async def create_upload_file(file: UploadFile, db=Depends(get_db)):
    logger.info("Importing transactions from: %s", file.filename)
    contents = await file.read()
    temp_path = "data/temp.csv"
    with open(temp_path, "wb") as f:
        f.write(contents)

    try:
        rows = input.read(temp_path)
        transactions = [parser.parse(row) for row in rows]

        predicted = categorize_batch(transactions)
        for txn, cat_name in zip(transactions, predicted):
            if cat_name:
                txn.category_id = _category_name_to_id(cat_name, db)

        for txn in transactions:
            write.db_write_transaction(txn, db)

        categorized = sum(1 for t in transactions if t.category_id is not None)
        logger.info("Imported %d transactions (%d categorized)", len(transactions), categorized)
        return {"imported": len(transactions), "categorized": categorized}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            logger.debug("Cleaned up temp file")


@router.put("/transactions/{id}")
def update_transaction(id: int, body: TransactionUpdate, db=Depends(get_db)):
    logger.info("PUT /transactions/%s", id)
    _validate_date(body.date)
    if body.name is not None and body.name.strip() == "":
        raise HTTPException(status_code=400, detail="Name is empty")
    if body.amount is not None and body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount is non positive.")
    try:
        write.db_update_transaction(
            id,
            body.date,
            body.name,
            body.amount,
            body.direction,
            body.account,
            body.currency,
            body.category_id,
            db,
        )
    except ValueError as e:
        msg = str(e)
        if "not found" in msg:
            raise HTTPException(status_code=404, detail=msg)
        raise HTTPException(status_code=409, detail=msg)
    updated = db.execute("SELECT * FROM TRANSACTIONS WHERE ID = ?", (id,)).fetchone()
    return dict(updated)
