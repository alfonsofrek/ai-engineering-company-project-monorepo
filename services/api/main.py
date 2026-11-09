import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.api.database import init_inventory_db
from services.api.errors import register_error_handlers
from services.api.routers.inventory import router as inventory_router
from services.api.routes.auth import router as auth_router
from services.api.routes.incidents import router as incidents_router
from services.api.routes.incidents_analysis import router as incidents_analysis_router
from services.api.routes.profiles import router as profiles_router
from services.api.routes.suppliers import router as suppliers_router
from services.api.routes.users import router as users_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Creates the SKU / stock_entry / stock_exit tables in Supabase on startup.
    init_inventory_db()
    yield


app = FastAPI(title="TrackFlow API", lifespan=lifespan)
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
    timing_logger.info(
        "%s %s → %s | %.1fms | cache=%s", request.method, request.url.path, response.status_code, duration_ms, cache_state
    )
    response.headers["Server-Timing"] = f"app;dur={duration_ms:.1f}"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("BACKOFFICE_ORIGIN", "http://localhost:3000")],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(suppliers_router)
app.include_router(incidents_analysis_router)
app.include_router(incidents_router)
app.include_router(inventory_router)
