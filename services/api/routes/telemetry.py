"""POST /telemetry/events — Phase 2 STUB.

Validates the batch against the TelemetryEvent envelope, logs how many events arrived and
their event_type, and answers {"received": N}. It does NOT store anything: Phase 3 replaces
the body of this endpoint with per-event allowlist validation and a bulk insert into
Supabase. The URL stays the same, so the frontends don't change.

The browser flushes pending events with navigator.sendBeacon when the tab is hidden; beacons
cannot always set Content-Type: application/json, so the body is parsed from the raw bytes.
"""

from __future__ import annotations

import json
import logging
import os
from collections import Counter

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import ValidationError

from services.api.telemetry_models import TelemetryBatch, TelemetryReceipt

logger = logging.getLogger("api.telemetry")
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(levelname)s:     [telemetry] %(message)s"))
    logger.addHandler(_handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False

# Where telemetry is ingested. Declared now so every service reads it from the same variable;
# in Phase 3 server-side emitters (API business events) will post here.
TELEMETRY_ENDPOINT = os.getenv("TELEMETRY_ENDPOINT", "http://localhost:8000/telemetry/events")

router = APIRouter(prefix="/telemetry", tags=["telemetry"])


@router.post("/events", response_model=TelemetryReceipt)
async def receive_events(request: Request) -> TelemetryReceipt:
    try:
        payload = json.loads(await request.body() or b"{}")
        batch = TelemetryBatch.model_validate(payload)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Body must be JSON: {\"events\": [...]}.") from None
    except ValidationError as error:
        issues = [{"loc": [str(p) for p in e["loc"]], "msg": e["msg"]} for e in error.errors()[:10]]
        logger.warning("rejected batch: %s", issues)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=issues) from None

    counts = Counter(str(event.event_type) for event in batch.events)
    apps = sorted({event.source.app.value for event in batch.events})
    logger.info("received %d events from %s: %s", len(batch.events), ",".join(apps),
                ", ".join(f"{name}×{n}" for name, n in counts.most_common()))
    if os.getenv("TELEMETRY_LOG_PAYLOAD", "").lower() in {"1", "true", "yes"}:  # development only
        for event in batch.events:
            logger.info("payload %s", event.model_dump_json())
    return TelemetryReceipt(received=len(batch.events))
