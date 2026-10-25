import os

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.api.errors import register_error_handlers
from services.api.routes.auth import router as auth_router
from services.api.routes.incidents_analysis import router as incidents_analysis_router
from services.api.routes.profiles import router as profiles_router
from services.api.routes.suppliers import router as suppliers_router
from services.api.routes.users import router as users_router

app = FastAPI(title="TrackFlow API")
register_error_handlers(app)
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
