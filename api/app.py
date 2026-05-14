import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import transactions, goals, advice
from core.log import setup_logging

setup_logging()

logger = logging.getLogger(__name__)

app = FastAPI()

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


@app.get("/")
def health():
    logger.debug("Health check")
    return {"status": "ok"}


logger.info("FinTrack API starting")
