"""Telemetry event envelope, as defined in docs/telemetry/telemetry-plan.md §5.

This is the contract for POST /telemetry/events. The Phase 2 stub only validates it; the
Phase 3 endpoint will reuse it unchanged and add per-event property allowlists from
docs/telemetry/event-schemas.json before persisting to Supabase.
"""

from __future__ import annotations

import json
from datetime import datetime
from enum import StrEnum
from pathlib import Path
from typing import Annotated, Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

SCHEMA_VERSION = "1.0.0"
_SCHEMAS_FILE = Path(__file__).resolve().parents[2] / "docs" / "telemetry" / "event-schemas.json"


def _catalogue() -> list[str]:
    """event_type values come from the approved plan, not from a copy in code."""
    with _SCHEMAS_FILE.open(encoding="utf-8") as handle:
        return list(json.load(handle)["x-trackflow-events"].keys())


try:
    EventType = StrEnum("EventType", {name: name for name in _catalogue()})
except FileNotFoundError:  # e.g. a container that only mounts services/: fall back to the naming rule
    import logging

    logging.getLogger("api.telemetry").warning("%s not found; event_type checked by pattern only", _SCHEMAS_FILE)
    EventType = None  # type: ignore[assignment]

EventTypeField: Any = EventType if EventType is not None else Annotated[str, Field(pattern=r"^[a-z]+(_[a-z]+)+$")]


class TelemetryApp(StrEnum):
    WEBSITE = "website"
    BACKOFFICE = "backoffice"
    TALENT_TRACKER = "talent_tracker"
    API = "api"


class TelemetryEnvironment(StrEnum):
    DEVELOPMENT = "development"
    PRODUCTION = "production"


class TelemetrySource(BaseModel):
    model_config = ConfigDict(extra="forbid")

    app: TelemetryApp
    release: str = Field(max_length=40)
    environment: TelemetryEnvironment


class TelemetryEvent(BaseModel):
    """Standard envelope of every TrackFlow telemetry event."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    eventId: UUID
    timestamp: datetime  # moment of capture, ISO 8601 UTC
    sessionId: str = Field(min_length=1, max_length=64)
    userId: str | None = Field(max_length=64)
    event_type: EventTypeField
    schemaVersion: str = Field(pattern=r"^\d+\.\d+\.\d+$")
    requestId: str = Field(min_length=1, max_length=64)
    source: TelemetrySource
    properties: dict[str, Any]


class TelemetryBatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    events: list[TelemetryEvent] = Field(min_length=1, max_length=100)


class TelemetryReceipt(BaseModel):
    received: int
