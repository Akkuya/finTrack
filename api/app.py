import logging

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import advice, goals, transactions, categories
from core.log import setup_logging

from db.schema import init_db

setup_logging()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db("db/data.db")
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transactions.router)
app.include_router(goals.router)
app.include_router(advice.router)
app.include_router(categories.router)


@app.get("/")
def health():
    logger.debug("Health check")
    return {"status": "ok"}


logger.info("FinTrack API starting")
