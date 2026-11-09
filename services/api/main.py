import logging
import os
import time

import sys
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.api.errors import register_error_handlers
from services.api.routes.auth import router as auth_router
from services.api.routes.incidents import router as incidents_router
from services.api.routes.incidents_analysis import router as incidents_analysis_router
from services.api.routes.profiles import router as profiles_router
from services.api.routes.suppliers import router as suppliers_router
from services.api.routes.telemetry import router as telemetry_router
from services.api.routes.users import router as users_router

app = FastAPI(title="TrackFlow API")
register_error_handlers(app)
timing_logger = logging.getLogger("api.timing")
if not timing_logger.handlers:  # Uvicorn only configures its own loggers
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(levelname)s:     [timing] %(message)s"))
    timing_logger.addHandler(_handler)
    timing_logger.setLevel(logging.INFO)
    timing_logger.propagate = False


@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    """One log line per request with its duration: the evidence for caching decisions."""
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    cache_state = response.headers.get("X-Cache", "-")
    request_id = request.headers.get("X-Request-ID", "-")  # correlation with frontend telemetry
    timing_logger.info(
        "%s %s → %s | %.1fms | cache=%s | req=%s",
        request.method, request.url.path, response.status_code, duration_ms, cache_state, request_id,
    )
    response.headers["Server-Timing"] = f"app;dur={duration_ms:.1f}"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", os.getenv("BACKOFFICE_ORIGIN", "http://localhost:3000")).split(",")
        if origin.strip()
    ],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(suppliers_router)
app.include_router(incidents_analysis_router)
app.include_router(incidents_router)
app.include_router(telemetry_router)
