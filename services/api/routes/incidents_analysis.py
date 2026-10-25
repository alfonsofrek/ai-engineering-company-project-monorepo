from __future__ import annotations

import csv
import io
import logging
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from scripts.analyze import (
    Analysis,
    CATEGORIES,
    CsvFormatError,
    COUNTRIES,
    INVALID_REASONS,
    STATUSES,
    analyze_csv,
)

router = APIRouter(tags=["incidents-analysis"])
logger = logging.getLogger("trackflow.api")

latest_analysis: Analysis | None = None


def serialize_analysis(analysis: Analysis) -> dict[str, object]:
    return {
        "metrics": {
            "total": analysis.total,
            "valid": analysis.valid,
            "invalid": analysis.invalid,
            "scoredClosed": analysis.closed_scored,
            "closed": analysis.statuses["CLOSED"],
            "averageSatisfaction": analysis.average_satisfaction,
        },
        "errors": {
            key: {"label": label, "count": analysis.errors[key]}
            for key, label in INVALID_REASONS.items()
        },
        "categories": {name: analysis.categories[name] for name in CATEGORIES},
        "statuses": {name: analysis.statuses[name] for name in STATUSES},
        "countries": {name: analysis.countries[name] for name in COUNTRIES},
        "satisfactionScores": {
            str(score): analysis.satisfaction_scores[score] for score in range(1, 6)
        },
    }


@router.post("/api/incidents/analyze")
def analyze_upload(file: UploadFile = File(...)) -> dict[str, object]:
    global latest_analysis

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Sube un archivo con extensión .csv.")

    temporary_path: Path | None = None
    try:
        # Step 1 — store the upload. A failure here is ours (disk/permissions), not the user's.
        try:
            with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as temporary_file:
                temporary_path = Path(temporary_file.name)
                shutil.copyfileobj(file.file, temporary_file)
                size = temporary_file.tell()
        except OSError:
            logger.exception("Could not store uploaded CSV")
            raise HTTPException(
                status_code=503,
                detail="No se pudo procesar el archivo en este momento. Inténtalo de nuevo más tarde.",
            ) from None

        if size == 0:
            raise HTTPException(status_code=400, detail="El archivo CSV está vacío.")

        # Step 2 — parse it. These errors describe the file content, so they are safe to show.
        try:
            analysis = analyze_csv(temporary_path)
        except UnicodeError:
            raise HTTPException(status_code=400, detail="El archivo no está codificado en UTF-8.") from None
        except csv.Error:
            raise HTTPException(status_code=400, detail="El archivo no tiene un formato CSV válido.") from None
        except CsvFormatError as error:
            raise HTTPException(status_code=400, detail=str(error)) from None
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)
        file.file.close()

    latest_analysis = analysis
    return serialize_analysis(analysis)


@router.get("/api/incidents/results/export")
def export_latest_results() -> StreamingResponse:
    if latest_analysis is None:
        raise HTTPException(status_code=404, detail="Todavía no hay ningún análisis. Analiza un CSV antes de descargar los resultados.")

    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(("metrica", "valor"))
    writer.writerows(latest_analysis.export_rows())
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="results.csv"'},
    )