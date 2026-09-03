from ingestion.parser import parse_all
from ingestion.parsers import simplii, tangerine


class TestDateNormalization:
    def test_mmddyyyy_single_digits(self):
        assert simplii.normalize_mmddyyyy("1/5/2024") == "2024-01-05"

    def test_mmddyyyy_double_digits(self):
        assert simplii.normalize_mmddyyyy("12/31/2026") == "2026-12-31"

    def test_mmddyyyy_leading_zeros(self):
        assert simplii.normalize_mmddyyyy("03/07/2025") == "2025-03-07"


class TestTangerineParser:
    def test_income_direction(self):
        row = {
            "Date": "1/5/2024",
            "Transaction": "DEPOSIT",
            "Name": "PAYROLL",
            "Memo": "Salary Deposit",
            "Amount": "1234.56",
        }
        t = tangerine.parse(row)
        assert t.date == "2024-01-05"
        assert t.name == "PAYROLL - Salary Deposit"
        assert t.amount == 1234.56
        assert t.direction == 1
        assert t.account == "Tangerine"
        assert t.currency == "CAD"
        assert t.category_id is None

    def test_expense_direction(self):
        row = {
            "Date": "2/14/2024",
            "Transaction": "PURCHASE",
            "Name": "MCDONALD S",
            "Memo": "CARD PURCHASE",
            "Amount": "-9.99",
        }
        t = tangerine.parse(row)
        assert t.amount == 9.99
        assert t.direction == -1

    def test_zero_amount_is_positive_direction(self):
        row = {
            "Date": "3/1/2024",
            "Transaction": "FEE",
            "Name": "INTEREST",
            "Memo": "PAID",
            "Amount": "0.00",
        }
        t = tangerine.parse(row)
        assert t.amount == 0.0
        assert t.direction == 1

    def test_missing_columns_raises(self):
        row = {"Date": "1/5/2024", "Name": "X"}  # Missing Transaction/Amount
        try:
            tangerine.parse(row)
        except ValueError as e:
            assert "Missing columns" in str(e)
        else:
            raise AssertionError("Expected ValueError for missing columns")


class TestSimpliiParser:
    def _row(self, **overrides):
        base = {
            "Date": "1/5/2024",
            "Transaction Details": "INTERAC E-TRANSFER",
            "Funds In": "",
            "Funds Out": "50.00",
        }
        base.update(overrides)
        return base

    def test_expense_funds_out(self):
        t = simplii.parse(self._row())
        assert t.date == "2024-01-05"
        assert t.name == "INTERAC E-TRANSFER"
        assert t.amount == 50.0
        assert t.direction == -1
        assert t.account == "Simplii"
        assert t.currency == "CAD"
        assert t.category_id is None

    def test_income_funds_in(self):
        t = simplii.parse(self._row(**{"Funds In": "200.00", "Funds Out": ""}))
        assert t.amount == 200.0
        assert t.direction == 1

    def test_both_blank_is_zero(self):
        t = simplii.parse(self._row(**{"Funds In": "", "Funds Out": ""}))
        assert t.amount == 0.0
        # zero net defaults to income direction in simplii.parse (0 >= 0)
        assert t.direction == 1

    def test_missing_columns_raises(self):
        try:
            simplii.parse({"Date": "1/5/2024"})
        except ValueError as e:
            assert "Missing columns" in str(e)
        else:
            raise AssertionError("Expected ValueError for missing columns")


class TestParseAll:
    def test_unknown_bank_raises(self):
        try:
            parse_all([{"Date": "1/5/2024"}], "chase")
        except ValueError as e:
            assert "Unknown bank format" in str(e)
        else:
            raise AssertionError("Expected ValueError for unknown bank")

    def test_empty_rows_returns_empty(self):
        assert parse_all([], "tangerine") == []

    def test_filters_zero_amount_rows(self):
        zero = {
            "Date": "1/5/2024",
            "Transaction": "FEE",
            "Name": "INTEREST",
            "Memo": "PAID",
            "Amount": "0.00",
        }
        real = {
            "Date": "1/5/2024",
            "Transaction": "PURCHASE",
            "Name": "SHOP",
            "Memo": "PAYMENT",
            "Amount": "-5.00",
        }
        result = parse_all([zero, real], "tangerine")
        assert len(result) == 1
        assert result[0].amount == 5.0
