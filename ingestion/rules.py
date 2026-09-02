"""Rule-based category pre-detection.

Runs before the LLM categorizer. These patterns have clean, deterministic
signal in the source CSVs, so a cheap substring match is more reliable than
asking an LLM to infer them.

The built-in RULES here are intentionally generic/portable — they describe
bank-system behavior that applies to any user (internal account transfers,
brokerage deposits). User-specific patterns (e.g. who your employer is, or a
specific person you exchange money with) must NOT go here; they belong in the
gitignored per-user config file (see RULES_CONFIG_PATH) so personal identifiers
never land in public source/history.
"""

import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Generic, portable patterns: {category -> [substrings matched case-insensitively]}
RULES: dict[str, list[str]] = {
    # Internal transfers between the user's own accounts (noise)
    "Transfers": [
        "internet withdrawal from tangerine",
        "internet withdrawal to tangerine",
        "internet deposit from tangerine",
        "internet deposit to tangerine",
    ],
    # Money moved into investments (brokerage deposits)
    "Investments": [
        "wealthsimple",
        "transfer in",
        "transfer credit",
    ],
}

# Path to the per-user, gitignored rules config. Format (JSON):
#   { "Salary": ["kvmp realty"], "Transfers": ["ramisa", ...] }
RULES_CONFIG_PATH = Path(__file__).resolve().parent.parent / "data" / "rules_config.json"


def _load_user_rules() -> dict[str, list[str]]:
    if not RULES_CONFIG_PATH.exists():
        return {}
    try:
        with open(RULES_CONFIG_PATH, encoding="utf-8") as f:
            raw = json.load(f)
        if not isinstance(raw, dict):
            logger.error("rules_config.json must be a JSON object")
            return {}
        return {
            str(cat): [str(p) for p in (patterns or [])]
            for cat, patterns in raw.items()
            if patterns
        }
    except (json.JSONDecodeError, OSError) as e:
        logger.error("Failed to load rules_config.json: %s", e)
        return {}


_USER_RULES: dict[str, list[str]] | None = None


def _merged_rules() -> dict[str, list[str]]:
    global _USER_RULES
    if _USER_RULES is None:
        user = _load_user_rules()
        merged = {**RULES}
        for cat, patterns in user.items():
            merged.setdefault(cat, []).extend(patterns)
        _USER_RULES = merged
    return _USER_RULES


def detect_category(name: str) -> str | None:
    """Return the category name for a transaction name, or None if no rule matches."""
    if not name:
        return None
    lower = name.lower()
    for category, patterns in _merged_rules().items():
        for pattern in patterns:
            if pattern in lower:
                return category
    return None
