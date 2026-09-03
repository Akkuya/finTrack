import pytest

from ingestion import rules


@pytest.fixture(autouse=True)
def reset_user_rules():
    """Reset the cached merged rules before/after each test and isolate user config."""
    rules._USER_RULES = None
    yield
    rules._USER_RULES = None


def set_user_rules(monkeypatch, config: dict):
    """Point the rules engine at an arbitrary in-memory user config."""
    monkeypatch.setattr(rules, "_load_user_rules", lambda: config)
    rules._USER_RULES = None


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("Internet Withdrawal to Tangerine SAV", "Transfers"),
        ("Internet Withdrawal from Tangerine SAV", "Transfers"),
        ("Internet Deposit to Tangerine SAV", "Transfers"),
        ("Internet Deposit from Tangerine SAV", "Transfers"),
        ("Wealthsimple Deposit", "Investments"),
        ("TRANSFER IN", "Investments"),
        ("TRANSFER CREDIT", "Investments"),
    ],
)
def test_generic_rules(name, expected):
    assert rules.detect_category(name) == expected


@pytest.mark.parametrize(
    "name",
    [
        "POS MERCHANDISE MCDONALD S 166",
        "Spotify Premium",
        "GROCERY STORE PURCHASE",
        "",
    ],
)
def test_no_match_returns_none(name):
    assert rules.detect_category(name) is None


def test_matching_is_case_insensitive(monkeypatch):
    set_user_rules(monkeypatch, {})
    assert rules.detect_category("INTERNET WITHDRAWAL TO TANGERINE") == "Transfers"


def test_user_config_adds_categories(monkeypatch):
    set_user_rules(monkeypatch, {"Salary": ["kvmp realty"]})
    assert rules.detect_category("EFT Deposit from KVMP Realty Ltd") == "Salary"
    # generic rules still active alongside
    assert rules.detect_category("TRANSFER IN") == "Investments"


def test_user_config_can_extend_existing_category(monkeypatch):
    set_user_rules(monkeypatch, {"Transfers": ["ramisa"]})
    assert rules.detect_category("INTERAC e-Transfer To: ramisa") == "Transfers"
    assert rules.detect_category("INTERAC e-Transfer From: ramisa") == "Transfers"


def test_generic_rule_takes_precedence_over_user_pattern(monkeypatch):
    # User patterns are appended after generic ones; here a user "Salary" pattern
    # also contains "wealthsimple" but the generic Investments match fires first.
    set_user_rules(monkeypatch, {"Salary": ["wealthsimple client"]})
    assert rules.detect_category("Wealthsimple Client Deposit") == "Investments"


def test_missing_config_file_returns_none(monkeypatch, tmp_path):
    monkeypatch.setattr(rules, "RULES_CONFIG_PATH", tmp_path / "nope.json")
    rules._USER_RULES = None
    assert rules._load_user_rules() == {}


def test_invalid_config_json_returns_empty(monkeypatch, tmp_path):
    bad = tmp_path / "rules_config.json"
    bad.write_text("{ not valid json", encoding="utf-8")
    monkeypatch.setattr(rules, "RULES_CONFIG_PATH", bad)
    rules._USER_RULES = None
    assert rules._load_user_rules() == {}


def test_config_that_is_not_object_is_ignored(monkeypatch, tmp_path):
    arr = tmp_path / "rules_config.json"
    arr.write_text('["a", "b"]', encoding="utf-8")
    monkeypatch.setattr(rules, "RULES_CONFIG_PATH", arr)
    rules._USER_RULES = None
    assert rules._load_user_rules() == {}
