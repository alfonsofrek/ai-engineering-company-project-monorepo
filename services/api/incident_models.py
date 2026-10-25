"""Incident domain model. Field names and allowed values follow company-BRIEFING.md."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class IncidentCategory(StrEnum):
    LOST_PARCEL = "lost_parcel"
    DELAYED_DELIVERY = "delayed_delivery"
    WRONG_ADDRESS = "wrong_address"
    RETURN_REQUEST = "return_request"
    DAMAGE = "damage"


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
    LOS_ANGELES = "los_angeles"
    ZARAGOZA = "zaragoza"
    CENTRAL = "central"


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


class IncidentResponse(IncidentRecord):
    id: int


class IncidentStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: IncidentStatus


class IncidentSummary(BaseModel):
    total: int
    by_status: dict[str, int]
    by_category: dict[str, int]
    by_origin: dict[str, int]
    by_branch: dict[str, int]
