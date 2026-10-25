"""Centralized Incident Manager API (see company-BRIEFING.md)."""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from services.api.database import incidents_table
from services.api.incident_models import (
    STATUS_LABELS,
    IncidentBranch,
    IncidentCategory,
    IncidentCreate,
    IncidentOrigin,
    IncidentResponse,
    IncidentStatus,
    IncidentStatusUpdate,
    IncidentSummary,
    can_transition,
)
from services.api.security import get_current_user

router = APIRouter(prefix="/api/incidents", tags=["incidents"], dependencies=[Depends(get_current_user)])

FIELD_LABELS = {
    "title": "título",
    "description": "descripción",
    "category": "categoría",
    "status": "estado",
    "origin": "origen",
    "branch": "sucursal",
}


def _field_message(field: str, error_type: str) -> str:
    label = FIELD_LABELS.get(field, field)
    if error_type == "missing":
        return f"El campo {label} es obligatorio."
    if error_type in {"string_too_short", "string_too_long"}:
        limits = {"title": "entre 3 y 120", "description": "entre 5 y 2000"}
        return f"El campo {label} debe tener {limits.get(field, 'una longitud válida de')} caracteres."
    if error_type == "enum":
        return f"El valor de {label} no es válido."
    if error_type == "extra_forbidden":
        return f"El campo {label} no forma parte de una incidencia."
    return f"El campo {label} no es válido."


def validation_error_response(error: ValidationError) -> JSONResponse:
    """400 with the first problematic field and a plain-language message per field."""
    errors: list[dict[str, str]] = []
    for issue in error.errors():
        field = str(issue["loc"][-1]) if issue.get("loc") else "body"
        errors.append({"field": field, "message": _field_message(field, issue.get("type", ""))})
    first = errors[0] if errors else {"field": "body", "message": "La incidencia no es válida."}
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": first["message"], "message": first["message"], "field": first["field"], "errors": errors},
    )


def to_response(document: dict[str, Any], document_id: int) -> IncidentResponse:
    return IncidentResponse(id=document_id, **document)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("", status_code=status.HTTP_201_CREATED, response_model=IncidentResponse)
def create_incident(payload: Any = Body(default=None)) -> IncidentResponse | JSONResponse:
    if not isinstance(payload, dict):
        message = "El cuerpo de la petición debe ser un objeto JSON con los datos de la incidencia."
        return JSONResponse(status_code=400, content={"detail": message, "message": message})
    try:
        incident = IncidentCreate.model_validate(payload)
    except ValidationError as error:
        return validation_error_response(error)

    timestamp = _now()
    document = {**incident.model_dump(mode="json"), "source_ref": None, "created_at": timestamp, "updated_at": timestamp}
    document_id = incidents_table.insert(document)
    return to_response(document, document_id)


@router.get("", response_model=list[IncidentResponse])
def list_incidents(
    status: IncidentStatus | None = None,  # noqa: A002 - public query parameter name
    origin: IncidentOrigin | None = None,
    branch: IncidentBranch | None = None,
    category: IncidentCategory | None = None,
) -> list[IncidentResponse]:
    wanted_status = status
    incidents = incidents_table.all()
    filters = {
        "status": wanted_status.value if wanted_status else None,
        "origin": origin.value if origin else None,
        "branch": branch.value if branch else None,
        "category": category.value if category else None,
    }
    for key, value in filters.items():
        if value is not None:
            incidents = [incident for incident in incidents if incident.get(key) == value]
    incidents.sort(key=lambda incident: incident.get("created_at", ""), reverse=True)
    return [to_response(incident, incident.doc_id) for incident in incidents]


@router.get("/summary", response_model=IncidentSummary)
def incidents_summary() -> IncidentSummary:
    incidents = incidents_table.all()

    def count(field: str, values: type) -> dict[str, int]:
        counter = Counter(incident.get(field) for incident in incidents)
        # Every allowed value is present (with 0) so the dashboard never has gaps.
        return {member.value: counter.get(member.value, 0) for member in values}

    return IncidentSummary(
        total=len(incidents),
        by_status=count("status", IncidentStatus),
        by_category=count("category", IncidentCategory),
        by_origin=count("origin", IncidentOrigin),
        by_branch=count("branch", IncidentBranch),
    )


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: int) -> IncidentResponse:
    incident = incidents_table.get(doc_id=incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="No existe ninguna incidencia con ese identificador.")
    return to_response(incident, incident.doc_id)


@router.patch("/{incident_id}/status", response_model=IncidentResponse)
def update_incident_status(incident_id: int, payload: Any = Body(default=None)) -> IncidentResponse | JSONResponse:
    try:
        update = IncidentStatusUpdate.model_validate(payload if isinstance(payload, dict) else {})
    except ValidationError as error:
        return validation_error_response(error)

    incident = incidents_table.get(doc_id=incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="No existe ninguna incidencia con ese identificador.")

    current = IncidentStatus(incident["status"])
    if current == update.status:
        return to_response(incident, incident_id)
    if not can_transition(current, update.status):
        message = (
            f"No se puede pasar una incidencia {STATUS_LABELS[current]} a {STATUS_LABELS[update.status]}."
            if current not in {IncidentStatus.RESOLVED, IncidentStatus.DISCARDED}
            else f"La incidencia ya está {STATUS_LABELS[current]} y no admite más cambios de estado."
        )
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": message, "message": message, "field": "status"},
        )

    changes = {"status": update.status.value, "updated_at": _now()}
    incidents_table.update(changes, doc_ids=[incident_id])
    return to_response({**incident, **changes}, incident_id)
