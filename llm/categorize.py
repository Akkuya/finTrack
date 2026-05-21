import json
import os
from datetime import datetime

import models
from llm import interface

LOG_PATH = "data/categorization_log.json"

categories = [
    "Food",
    "Clothing",
    "Investments",
    "Transfers",
    "Shopping",
    "Entertainment",
    "Transport",
    "Subscriptions",
    "Other",
]

_ALIASES: dict[str, str] = {
    "food": "Food",
    "food & dining": "Food",
    "groceries": "Food",
    "grocery": "Food",
    "dining": "Food",
    "dining out": "Food",
    "restaurant": "Food",
    "clothing": "Clothing",
    "clothes": "Clothing",
    "investments": "Investments",
    "investment": "Investments",
    "transfers": "Transfers",
    "transfer": "Transfers",
    "transfer in": "Transfers",
    "shopping": "Shopping",
    "online shopping": "Shopping",
    "entertainment": "Entertainment",
    "transport": "Transport",
    "transportation": "Transport",
    "travel": "Transport",
    "gas": "Transport",
    "fuel": "Transport",
    "subscriptions": "Subscriptions",
    "subscription": "Subscriptions",
    "bills": "Subscriptions",
    "utilities": "Subscriptions",
    "other": "Other",
}


def _normalize(raw: str) -> str | None:
    key = raw.strip().lower().rstrip(".")
    direct = _ALIASES.get(key)
    if direct:
        return direct
    for alias, canonical in _ALIASES.items():
        if alias in key or key in alias:
            return canonical
    return None


def categorize(transaction: models.Transaction) -> str:
    return interface.prompt(
        "Return one word from the list of transactions that you think this "
        "one falls under. No punctuation, no explanation. Just the word. "
        f"Transaction Name: {transaction.name}, Amount: {transaction.amount}. "
        f"Categories: {str(categories)}"
    )


CHUNK_SIZE = 75


def categorize_batch(transactions: list[models.Transaction]) -> list[str | None]:
    if not transactions:
        return []

    logger = __import__("logging").getLogger(__name__)
    results: list[str | None] = []
    raw_results: list[str | None] = []
    for start in range(0, len(transactions), CHUNK_SIZE):
        chunk = transactions[start : start + CHUNK_SIZE]
        logger.info(
            "Categorizing chunk %d-%d (%d items)",
            start,
            start + len(chunk) - 1,
            len(chunk),
        )
        chunk_results, chunk_raw = _categorize_chunk(chunk)
        results.extend(chunk_results)
        raw_results.extend(chunk_raw)

    matched = sum(1 for r in results if r is not None)
    logger.info(
        "Batch categorization complete: %d/%d matched",
        matched,
        len(transactions),
    )

    _write_log(transactions, results, raw_results)

    return results


def _categorize_chunk(chunk: list[models.Transaction]) -> tuple[list[str | None], list[str | None]]:
    logger = __import__("logging").getLogger(__name__)

    items = [f"ID_{i}: {t.name} | ${t.amount}" for i, t in enumerate(chunk)]
    prompt_text = (
        f"Categories: {', '.join(categories)}\n"
        f"For each transaction below, reply with the matching category.\n"
        f"Rules:\n"
        f"- Use exactly one of the categories above\n"
        f"- Format: ID_N, Category, Confidence\n"
        f"- Confidence is an integer 0-100\n"
        f"- Only output the data lines, no explanations\n"
        f"- Example:\n"
        f"ID_0, Food, 95\n"
        f"ID_1, Shopping, 80\n\n" + "\n".join(items)
    )

    raw = interface.prompt(prompt_text)
    logger.debug("Raw LLM response:\n%s", raw)

    if not raw or "unavailable" in raw.lower():
        logger.warning("LLM unavailable — all uncategorized")
        return [None] * len(chunk), [None] * len(chunk)

    mapping: dict[int, str | None] = {}
    raw_mapping: dict[int, str | None] = {}
    parsed_count = 0
    low_conf_count = 0
    alias_miss_count = 0
    for line in raw.strip().split("\n"):
        line = line.strip()
        if not line or not line.startswith("ID_"):
            continue
        try:
            tag, cat, conf = [x.strip() for x in line.split(",", 2)]
            idx = int(tag[3:])
            raw_mapping[idx] = cat
            parsed_count += 1
            if int(conf) <= 60:
                low_conf_count += 1
                continue
            normalized = _normalize(cat)
            if normalized is None:
                alias_miss_count += 1
                continue
            mapping[idx] = normalized
        except (ValueError, IndexError):
            continue

    logger.info(
        "Chunk parse results: %d parsed, %d low confidence, %d alias miss, %d assigned",
        parsed_count,
        low_conf_count,
        alias_miss_count,
        len(mapping),
    )

    results = [mapping.get(i) for i in range(len(chunk))]
    raw_results = [raw_mapping.get(i) for i in range(len(chunk))]
    for i, r in enumerate(results):
        logger.debug("Item %d '%s' → %s", i, chunk[i].name, r or "uncategorized")

    return results, raw_results


def _write_log(
    transactions: list[models.Transaction],
    predictions: list[str | None],
    raw_predictions: list[str | None] | None = None,
) -> None:
    entries = [
        {
            "name": t.name,
            "amount": t.amount,
            "direction": t.direction,
            "date": t.date,
            "predicted_category": p,
            "raw_category": r if r else None,
        }
        for t, p, r in zip(transactions, predictions, raw_predictions or [None] * len(transactions))
    ]
    log = {
        "timestamp": datetime.now().isoformat(),
        "total": len(entries),
        "categorized": sum(1 for e in entries if e["predicted_category"]),
        "results": entries,
    }
    os.makedirs(os.path.dirname(LOG_PATH) or ".", exist_ok=True)
    with open(LOG_PATH, "w") as f:
        json.dump(log, f, indent=2)
