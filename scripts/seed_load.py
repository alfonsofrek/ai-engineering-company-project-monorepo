#!/usr/bin/env python3
"""Fills a TinyDB file with realistic volume to measure the API under load.

    SUPPLIERS_DB_PATH=/tmp/load.json python scripts/seed_load.py --incidents 20000 --suppliers 1500

Data follows company-BRIEFING.md: incident categories/branches/statuses with a realistic mix,
created_at spread over 18 months, and suppliers per country with the right currency.
Never point it at your real data file: it only appends.
"""

from __future__ import annotations

import argparse
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

if not os.getenv("SUPPLIERS_DB_PATH"):
    sys.exit("Set SUPPLIERS_DB_PATH to a scratch file; this script must not touch services/api/data.")

from tinydb import TinyDB  # noqa: E402

CATEGORIES = [("delayed_delivery", 38), ("wrong_address", 19), ("return_request", 17), ("lost_parcel", 14), ("damage", 12)]
STATUSES = [("resolved", 52), ("open", 29), ("discarded", 14), ("in_progress", 5)]
ORIGINS = [("customer", 70), ("branch", 22), ("internal", 8)]
BRANCHES = {"customer": [("los_angeles", 52), ("zaragoza", 48)], "branch": [("los_angeles", 50), ("zaragoza", 50)], "internal": [("central", 100)]}
PROBLEMS = {
    "delayed_delivery": ["Entrega retrasada {d} días", "El paquete sigue en tránsito tras {d} días", "Ruta reprogramada sin aviso"],
    "wrong_address": ["Dirección de entrega incorrecta", "Código postal no coincide con la calle", "Cliente se ha mudado"],
    "return_request": ["Cliente solicita devolución", "Devolución por talla incorrecta", "Producto no deseado"],
    "lost_parcel": ["Paquete no localizado en el hub", "Sin escaneo desde la recogida", "Paquete perdido en ruta"],
    "damage": ["Caja aplastada en la entrega", "Producto roto al abrir", "Embalaje mojado"],
}
SUPPLIER_CATEGORIES = ["carrier_last_mile", "carrier_international", "warehouse_supplies", "packaging_materials",
                       "reverse_logistics", "fleet_maintenance", "it_and_wms_software", "cleaning_and_facilities"]
US_CITIES = ["Los Angeles", "Long Beach", "Pasadena", "Anaheim", "Riverside", "San Diego", "Irvine"]
ES_CITIES = ["Zaragoza", "Huesca", "Teruel", "Calatayud", "Logroño", "Pamplona", "Lleida"]
COMPANY_WORDS = ["Logistics", "Express", "Supply", "Transportes", "Pack", "Fleet", "Solutions", "Cargo", "Systems", "Servicios"]


def pick(weighted, rng):
    return rng.choices([v for v, _ in weighted], weights=[w for _, w in weighted])[0]


def incident(rng: random.Random, index: int, now: datetime) -> dict:
    category = pick(CATEGORIES, rng)
    origin = pick(ORIGINS, rng)
    created = now - timedelta(minutes=rng.randint(0, 540 * 24 * 60))
    status = pick(STATUSES, rng)
    updated = created + timedelta(hours=rng.randint(0, 96)) if status != "open" else created
    title = rng.choice(PROBLEMS[category]).format(d=rng.randint(2, 9))
    return {
        "title": title,
        "description": f"{title}. Seguimiento TRK-{rng.randint(10**7, 10**8 - 1)}; reportado por {origin}.",
        "category": category,
        "status": status,
        "origin": origin,
        "branch": pick(BRANCHES[origin], rng),
        "source_ref": f"LOAD-{index:06d}",
        "created_at": created.isoformat(),
        "updated_at": min(updated, now).isoformat(),
    }


def supplier(rng: random.Random, index: int, now: datetime) -> dict:
    country = rng.choice(["USA", "Spain"])
    city = rng.choice(US_CITIES if country == "USA" else ES_CITIES)
    return {
        "name": f"{city} {rng.choice(COMPANY_WORDS)} {index:04d}",
        "country": country,
        "categories": rng.sample(SUPPLIER_CATEGORIES, k=rng.randint(1, 3)),
        "rate_per_shipment": round(rng.uniform(1.8, 24.0), 2),
        "currency": "USD" if country == "USA" else "EUR",
        "status": "active" if rng.random() < 0.85 else "suspended",
        "service_zone": city,
        "contact_email": f"ops{index:04d}@example.com",
        "notes": None,
        "updated_at": (now - timedelta(days=rng.randint(0, 365))).isoformat(),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--incidents", type=int, default=20000)
    parser.add_argument("--suppliers", type=int, default=1500)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    now = datetime.now(timezone.utc)
    db = TinyDB(os.environ["SUPPLIERS_DB_PATH"])
    db.table("incidents").insert_multiple(incident(rng, i, now) for i in range(args.incidents))
    db.table("suppliers").insert_multiple(supplier(rng, i, now) for i in range(args.suppliers))
    print(f"Inserted {args.incidents} incidents and {args.suppliers} suppliers into {os.environ['SUPPLIERS_DB_PATH']}")


if __name__ == "__main__":
    main()
