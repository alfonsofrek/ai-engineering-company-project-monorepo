"""POST /telemetry/events — Phase 2 stub: validates the envelope, logs, persists nothing."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone


def event(**overrides):
    base = {
        "eventId": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sessionId": str(uuid.uuid4()),
        "userId": "7",
        "event_type": "incident_created",
        "schemaVersion": "1.0.0",
        "requestId": str(uuid.uuid4()),
        "source": {"app": "backoffice", "release": "dev", "environment": "development"},
        "properties": {"incident_id": 1, "category": "damage", "origin": "branch", "branch": "zaragoza",
                       "initial_status": "open", "description_length": 42},
    }
    base.update(overrides)
    return base


def test_valid_batch_returns_received_count(api_database):
    client, *_ = api_database
    batch = {"events": [event(), event(event_type="page_viewed", userId=None, properties={"app": "backoffice", "route": "/incidents"})]}
    response = client.post("/telemetry/events", json=batch)
    assert response.status_code == 200
    assert response.json() == {"received": 2}


def test_beacon_body_without_json_content_type_is_accepted(api_database):
    client, *_ = api_database
    response = client.post("/telemetry/events", content=json.dumps({"events": [event()]}),
                           headers={"Content-Type": "text/plain;charset=UTF-8"})
    assert response.status_code == 200 and response.json() == {"received": 1}


def test_envelope_is_enforced(api_database):
    client, *_ = api_database
    assert client.post("/telemetry/events", json={"events": []}).status_code == 422
    assert client.post("/telemetry/events", json={"events": [event(event_type="made_up_event")]}).status_code == 422
    assert client.post("/telemetry/events", json={"events": [event(eventId="not-a-uuid")]}).status_code == 422
    missing = event()
    del missing["requestId"]
    assert client.post("/telemetry/events", json={"events": [missing]}).status_code == 422
    assert client.post("/telemetry/events", json={"events": [event(email="a@b.com")]}).status_code == 422
    assert client.post("/telemetry/events", content="not json").status_code == 400


def test_event_types_come_from_the_approved_catalogue():
    from services.api.telemetry_models import EventType

    names = {member.value for member in EventType}
    assert {"lead_form_submitted", "incident_created", "incident_status_changed",
            "incident_status_change_rejected", "lead_status_changed"} <= names
    assert len(names) == 25
