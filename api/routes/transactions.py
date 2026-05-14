import logging
import os

from fastapi import APIRouter, Depends, UploadFile

from api.dependencies import get_db
from db import read, write
from ingestion import input, parser

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/transactions")
def get_transactions(db=Depends(get_db)):
    logger.info("GET /transactions")
    return read.get_transactions(db)


@router.post("/transactions/import")
async def create_upload_file(file: UploadFile, db=Depends(get_db)):
    logger.info("Importing transactions from: %s", file.filename)
    contents = await file.read()
    temp_path = "data/temp.csv"
    with open(temp_path, "wb") as f:
        f.write(contents)

    try:
        rows = input.read(temp_path)
        count = 0
        for row in rows:
            transaction = parser.parse(row)
            write.db_write_transaction(transaction, db)
            count += 1
        logger.info("Imported %d transactions", count)
        return {"imported": count}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            logger.debug("Cleaned up temp file")
