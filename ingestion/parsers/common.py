def normalize_mmddyyyy(date_str: str) -> str:
    """Convert MM/DD/YYYY -> YYYY-MM-DD. Same logic as the old parser.py had inline."""
    # TODO: this is literally your existing parts[2]-parts[0]-parts[1] logic,
    # just moved here so both bank parsers can call it instead of duplicating it

    parts = date_str.split("/")
    normalized_date = f"{parts[2]}-{parts[0].zfill(2)}-{parts[1].zfill(2)}"

    return normalized_date
