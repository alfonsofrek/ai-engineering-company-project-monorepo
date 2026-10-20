import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.api.routes.suppliers import router as suppliers_router

app = FastAPI(title="TrackFlow Supplier API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("BACKOFFICE_ORIGIN", "http://localhost:3000")],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)
app.include_router(suppliers_router)
