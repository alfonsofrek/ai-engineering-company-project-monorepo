#!/usr/bin/env python3
"""Load the historical incident CSV into the incident manager database.

Every record is stored with origin "customer". The CSV -> model transformations
follow company-BRIEFING.md §5, and rows are validated with the same rules as the
CSV analyzer (packages/shared/python/incident_validation.py). The script is
idempotent: rows whose incident_id is already stored as source_ref are skipped.

Usage:
    python scripts/seed_incidents.py [path/to/incidents.csv]
"""

from __future__ import annotations

import argparse
import csv
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for extra_path in (ROOT, ROOT / "packages" / "shared" / "python"):
    if str(extra_path) not in sys.path:
        sys.path.insert(0, str(extra_path))

from incident_validation import FIELDS, INVALID_REASONS, record_errors  # noqa: E402
from tinydb import Query  # noqa: E402

DEFAULT_CSV = ROOT / "scripts" / "incidents-trackflow.csv"

STATUS_MAP = {"OPEN": "open", "CLOSED": "resolved", "DISCARDED": "discarded"}
CATEGORY_MAP = {
    "LOST_PARCEL": "lost_parcel",
    "DELAYED_DELIVERY": "delayed_delivery",
    "WRONG_ADDRESS": "wrong_address",
    "RETURN_REQUEST": "return_request",
    "DAMAGE": "damage",
}
BRANCH_MAP = {"US": "los_angeles", "ES": "zaragoza"}
TITLE_MAX_LENGTH = 120


def to_incident(row: dict[str, str]) -> dict[str, object]:
    """Applies the BRIEFING transformations to a row that already passed validation."""
    description = row["description"].strip()
    created_at = datetime.strptime(row["date"].strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc).isoformat()
    return {
        "title": description[:TITLE_MAX_LENGTH].strip(),
        "description": description,
        "category": CATEGORY_MAP[row["category"].strip()],
        "status": STATUS_MAP[row["status"].strip()],
        "origin": "customer",
        "branch": BRANCH_MAP[row["country"].strip()],
        "source_ref": row["incident_id"].strip(),
        "created_at": created_at,
        "updated_at": created_at,
    }


def read_rows(csv_path: Path) -> list[dict[str, str]]:
    with csv_path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        if reader.fieldnames is None:
            raise ValueError("el CSV está vacío o no tiene cabecera")
        missing = [name for name in FIELDS if name not in reader.fieldnames]
        if missing:
            raise ValueError("faltan columnas obligatorias: " + ", ".join(missing))
        return list(reader)


def seed(csv_path: Path, table) -> tuple[int, int, list[str]]:
    """Returns (inserted, skipped_existing, rejected_descriptions)."""
    rows = read_rows(csv_path)
    existing_refs = {document.get("source_ref") for document in table.search(Query().source_ref.exists())}
    inserted = skipped = 0
    rejected: list[str] = []

    for line_number, row in enumerate(rows, start=2):
        errors, _ = record_errors(row)
        if errors:
            reasons = ", ".join(INVALID_REASONS[error] for error in errors)
            rejected.append(f"línea {line_number} ({row.get('incident_id') or 'sin id'}): {reasons}")
            continue
        incident = to_incident(row)
        if incident["source_ref"] in existing_refs:
            skipped += 1
            continue
        table.insert(incident)
        existing_refs.add(incident["source_ref"])
        inserted += 1
    return inserted, skipped, rejected


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed historical TrackFlow incidents (origin: customer).")
    parser.add_argument("csv_path", nargs="?", type=Path, default=DEFAULT_CSV)
    args = parser.parse_args()

    if not args.csv_path.is_file():
        print(f"Error: no existe el archivo {args.csv_path}", file=sys.stderr)
        return 1

    try:
        from services.api.database import incidents_table
    except OSError as error:
        print(f"Error: no se pudo abrir la base de datos ({error.strerror or 'error de E/S'})", file=sys.stderr)
        return 1

    try:
        inserted, skipped, rejected = seed(args.csv_path, incidents_table)
    except UnicodeError:
        print("Error: el CSV no está codificado en UTF-8", file=sys.stderr)
        return 1
    except csv.Error as error:
        print(f"Error: formato CSV no válido ({error})", file=sys.stderr)
        return 1
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    except OSError as error:
        print(f"Error: no se pudo leer o escribir ({error.strerror or 'error de E/S'})", file=sys.stderr)
        return 1

    print(f"Incidencias insertadas: {inserted}")
    print(f"Ya existentes (omitidas): {skipped}")
    print(f"Filas rechazadas por validación: {len(rejected)}")
    for item in rejected:
        print(f"  - {item}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
