"""Centralised error responses for the TrackFlow API.

Every error that leaves the API has the same JSON shape:

    {"detail": <str | list>, "message": <str for humans>, "field": <optional str>}

- Validation errors keep FastAPI's ``detail`` list (the frontends read ``loc``/``msg``)
  but drop the echoed ``input``/``ctx``/``url`` keys: a rejected password or token
  must never be sent back to the client.
- Unhandled exceptions are logged server-side with their traceback and the client
  only receives a generic 500 message — no stack trace, file path or secret.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("trackflow.api")

GENERIC_SERVER_ERROR = "Ha ocurrido un error inesperado. Inténtalo de nuevo en unos minutos."
VALIDATION_SUMMARY = "Hay datos no válidos en la petición. Revisa los campos indicados."


def _clean_validation_issue(issue: dict) -> dict:
    """Keeps only what the client needs to point at the field; never echoes the input."""
    return {
        "loc": [part for part in issue.get("loc", ()) if part != "body"],
        "msg": str(issue.get("msg", "Valor no válido")),
        "type": issue.get("type", "value_error"),
    }


async def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) else "No se pudo completar la petición."
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "message": message},
        headers=getattr(exc, "headers", None),
    )


async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    issues = [_clean_validation_issue(issue) for issue in exc.errors()]
    first_field = next((str(issue["loc"][-1]) for issue in issues if issue["loc"]), None)
    content: dict = {"detail": issues, "message": VALIDATION_SUMMARY}
    if first_field:
        content["field"] = first_field
    return JSONResponse(status_code=422, content=content)


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Full details stay in the server log; the client gets a generic, safe message.
    logger.exception("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": GENERIC_SERVER_ERROR, "message": GENERIC_SERVER_ERROR},
    )


async def storage_exception_handler(request: Request, exc: OSError) -> JSONResponse:
    # The TinyDB file could not be read or written (disk full, permissions, missing volume).
    logger.error("Storage error on %s %s: %s", request.method, request.url.path, type(exc).__name__)
    message = "El almacenamiento de datos no está disponible en este momento. Inténtalo de nuevo más tarde."
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": message, "message": message},
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(OSError, storage_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
