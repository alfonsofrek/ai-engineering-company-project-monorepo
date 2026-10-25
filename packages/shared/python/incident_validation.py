"""Incident CSV validation rules shared by the analyzer script and the incident seed.

Single source of truth for the TrackFlow incident CSV schema: any change to an
allowed value or validation rule applies to both `scripts/analyze.py` and
`scripts/seed_incidents.py`.
"""

from __future__ import annotations

import re
from datetime import date

FIELDS = (
    "incident_id",
    "date",
    "country",
    "customer_type",
    "tracking_number",
    "carrier",
    "category",
    "description",
    "status",
    "customer_email",
    "satisfaction_score",
)
COUNTRIES = ("US", "ES")
CUSTOMER_TYPES = ("B2B", "B2C")
STATUSES = ("OPEN", "CLOSED", "DISCARDED")
CATEGORIES = (
    "LOST_PARCEL",
    "DELAYED_DELIVERY",
    "WRONG_ADDRESS",
    "RETURN_REQUEST",
    "DAMAGE",
)
CARRIERS = {
    "US": {"UPS", "FEDEX", "DHL_US"},
    "ES": {"MRW", "SEUR", "DHL_ES", "LOCAL_ES"},
}
INVALID_REASONS = {
    "invalid_incident_id": "Invalid incident ID",
    "invalid_date": "Invalid or missing date",
    "invalid_country": "Invalid or missing country",
    "invalid_customer_type": "Invalid or missing customer type",
    "invalid_tracking_number": "Invalid tracking number",
    "invalid_carrier": "Carrier/country mismatch",
    "invalid_category": "Invalid or missing category",
    "invalid_description": "Invalid or missing description",
    "invalid_status": "Invalid or missing status",
    "invalid_email": "Invalid or missing email",
    "closed_without_score": "Closed incident, no score",
    "invalid_satisfaction_score": "Invalid satisfaction score",
}
INCIDENT_ID_PATTERN = re.compile(r"^TRF-\d{6}$")
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def record_errors(row: dict[str, str | None]) -> tuple[list[str], int | None]:
    errors: list[str] = []
    incident_id = (row.get("incident_id") or "").strip()
    incident_date = (row.get("date") or "").strip()
    country = (row.get("country") or "").strip()
    customer_type = (row.get("customer_type") or "").strip()
    tracking_number = (row.get("tracking_number") or "").strip()
    carrier = (row.get("carrier") or "").strip()
    category = (row.get("category") or "").strip()
    description = (row.get("description") or "").strip()
    status = (row.get("status") or "").strip()
    email = (row.get("customer_email") or "").strip()
    score_text = (row.get("satisfaction_score") or "").strip()

    if not INCIDENT_ID_PATTERN.fullmatch(incident_id):
        errors.append("invalid_incident_id")
    if not DATE_PATTERN.fullmatch(incident_date):
        errors.append("invalid_date")
    else:
        try:
            date.fromisoformat(incident_date)
        except ValueError:
            errors.append("invalid_date")
    if country not in COUNTRIES:
        errors.append("invalid_country")
    if customer_type not in CUSTOMER_TYPES:
        errors.append("invalid_customer_type")
    if len(tracking_number) < 8:
        errors.append("invalid_tracking_number")
    if country not in CARRIERS or carrier not in CARRIERS[country]:
        errors.append("invalid_carrier")
    if category not in CATEGORIES:
        errors.append("invalid_category")
    if len(description) < 5:
        errors.append("invalid_description")
    if status not in STATUSES:
        errors.append("invalid_status")
    if not EMAIL_PATTERN.fullmatch(email):
        errors.append("invalid_email")

    score: int | None = None
    if status == "CLOSED" and not score_text:
        errors.append("closed_without_score")
    elif score_text:
        try:
            parsed_score = int(score_text)
        except ValueError:
            errors.append("invalid_satisfaction_score")
        else:
            if parsed_score < 1 or parsed_score > 5:
                errors.append("invalid_satisfaction_score")
            else:
                score = parsed_score

    return errors, score
