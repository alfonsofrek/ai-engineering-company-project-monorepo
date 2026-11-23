"""Incident domain model. Field names and allowed values follow docs/briefings/centralized-incident-manager.es.md."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class IncidentCategory(StrEnum):
    """The 9 categories of the official TrackFlow briefing, in its order."""

    LOST_PARCEL = "lost_parcel"
    DELIVERY_FAILURE = "delivery_failure"
    INVENTORY_DISCREPANCY = "inventory_discrepancy"
    CARRIER_ISSUE = "carrier_issue"
    RETURNS_ISSUE = "returns_issue"
    WAREHOUSE_INCIDENT = "warehouse_incident"
    SYSTEM_FAILURE = "system_failure"
    CLIENT_COMPLAINT = "client_complaint"
    OTHER = "other"


# Categories with direct impact on the client SLA (Thomas and Carlos filter by them).
SLA_CATEGORIES = frozenset({IncidentCategory.LOST_PARCEL, IncidentCategory.CARRIER_ISSUE})


class IncidentStatus(StrEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    DISCARDED = "discarded"


class IncidentOrigin(StrEnum):
    CUSTOMER = "customer"
    BRANCH = "branch"
    INTERNAL = "internal"


class IncidentBranch(StrEnum):
    """The 5 TrackFlow sites of the official briefing. ``central`` = no specific site."""

    CENTRAL = "central"
    LA_WAREHOUSE = "la_warehouse"
    LA_OFFICE = "la_office"
    ZARAGOZA_WAREHOUSE = "zaragoza_warehouse"
    ZARAGOZA_OFFICE = "zaragoza_office"


# Lifecycle from the BRIEFING: resolved and discarded are final states.
ALLOWED_TRANSITIONS: dict[IncidentStatus, frozenset[IncidentStatus]] = {
    IncidentStatus.OPEN: frozenset({IncidentStatus.IN_PROGRESS, IncidentStatus.DISCARDED}),
    IncidentStatus.IN_PROGRESS: frozenset({IncidentStatus.RESOLVED, IncidentStatus.DISCARDED}),
    IncidentStatus.RESOLVED: frozenset(),
    IncidentStatus.DISCARDED: frozenset(),
}

STATUS_LABELS = {
    IncidentStatus.OPEN: "abierta",
    IncidentStatus.IN_PROGRESS: "en curso",
    IncidentStatus.RESOLVED: "resuelta",
    IncidentStatus.DISCARDED: "descartada",
}


def can_transition(current: IncidentStatus, target: IncidentStatus) -> bool:
    return target in ALLOWED_TRANSITIONS[current]


class IncidentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=5, max_length=2000)
    category: IncidentCategory
    status: IncidentStatus = IncidentStatus.OPEN
    origin: IncidentOrigin
    branch: IncidentBranch


class IncidentRecord(IncidentCreate):
    """What is stored: the public fields plus traceability and timestamps."""

    source_ref: str | None = Field(default=None, max_length=40)
    created_at: datetime
    updated_at: datetime


class IncidentResponse(BaseModel):
    """Output contract for one incident (detail, create, status change).

    Declared field by field instead of inheriting ``IncidentCreate``, so the write
    schema and the read schema can evolve independently. ``source_ref`` is kept:
    the backoffice shows it as the reference of incidents imported from the CSV.
    """

    id: int
    title: str
    description: str
    category: IncidentCategory
    status: IncidentStatus
    origin: IncidentOrigin
    branch: IncidentBranch
    source_ref: str | None
    created_at: datetime
    updated_at: datetime


class IncidentListItem(BaseModel):
    """Row of the incident table: the detail minus ``updated_at``, which the list never shows."""

    id: int
    title: str
    description: str
    category: IncidentCategory
    status: IncidentStatus
    origin: IncidentOrigin
    branch: IncidentBranch
    source_ref: str | None
    created_at: datetime


class IncidentStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: IncidentStatus


class IncidentSummary(BaseModel):
    total: int
    by_status: dict[str, int]
    by_category: dict[str, int]
    by_origin: dict[str, int]
    by_branch: dict[str, int]
