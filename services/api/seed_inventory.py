"""Seeds TrackFlow inventory in Supabase with the Milestone 5 BRIEFING data.

Idempotent: SKUs are matched by (sku, warehouse), entries by reference and exits by
(sku, type, quantity, tracking number), so running it twice inserts nothing new.

Movements are attributed to a TinyDB user. Pass ``--email`` to use an existing account
(e.g. your admin); otherwise a dedicated ``inventory.seed@trackflow.com`` operative is
created with a random, unknown password so nobody can log in with it.

    uv run seed-inventory
    uv run seed-inventory --email you@example.com
"""

from __future__ import annotations

import argparse
import secrets
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from sqlmodel import Session, select  # noqa: E402

from services.api import user_store  # noqa: E402
from services.api.database import get_engine, init_inventory_db  # noqa: E402
from services.api.inventory.models import SKU, StockEntry, StockExit  # noqa: E402
from services.api.inventory.stock import stock_for  # noqa: E402

SEED_OPERATIVE_EMAIL = "inventory.seed@trackflow.com"

SKUS = [
    ("Classic White Sneaker - Size 42", "CLT-SNK-W-42", "PureStep Footwear", "fashion", "LA"),
    ("Classic White Sneaker - Size 42", "CLT-SNK-W-42-Z", "PureStep Footwear", "fashion", "ZGZ"),
    ("Wireless Earbuds Pro", "TEC-EAR-001", "SoundWave Electronics", "electronics", "LA"),
    ("Hydrating Face Serum 30ml", "CSM-SRM-030", "GlowLab Cosmetics", "cosmetics", "ZGZ"),
    ("Slim Fit Chino - Navy 32/32", "CLT-CHN-N-32", "UrbanThread", "fashion", "LA"),
    ("USB-C Fast Charger 65W", "TEC-CHG-065", "SoundWave Electronics", "electronics", "ZGZ"),
]

# (sku code, warehouse, quantity, reference). Two receipts for CLT-SNK-W-42 in LA.
ENTRIES = [
    ("CLT-SNK-W-42", "LA", 40, "PO-2024-0098"),
    ("CLT-SNK-W-42", "LA", 25, "GR-LA-0234"),
    ("CLT-SNK-W-42-Z", "ZGZ", 30, "PO-2024-0112"),
    ("TEC-EAR-001", "LA", 60, "GR-LA-0241"),
    ("CSM-SRM-030", "ZGZ", 80, "PO-2024-0120"),
    ("CLT-CHN-N-32", "LA", 35, "GR-LA-0250"),
    ("TEC-CHG-065", "ZGZ", 50, "GR-ZGZ-0107"),
]

# (sku code, warehouse, quantity, exit_type, tracking_number)
EXITS = [
    ("CLT-SNK-W-42", "LA", 12, "dispatch", "1Z999AA10123456784"),
    ("TEC-EAR-001", "LA", 8, "dispatch", "1Z999AA10123456791"),
    ("CLT-SNK-W-42-Z", "ZGZ", 5, "dispatch", "ES-ZGZ-0045217893"),
    ("CSM-SRM-030", "ZGZ", 3, "loss", None),
]

EXPECTED_STOCK = {
    ("CLT-SNK-W-42", "LA"): 53,
    ("CLT-SNK-W-42-Z", "ZGZ"): 25,
    ("TEC-EAR-001", "LA"): 52,
    ("CSM-SRM-030", "ZGZ"): 77,
    ("CLT-CHN-N-32", "LA"): 35,
    ("TEC-CHG-065", "ZGZ"): 50,
}


def _seed_user_uuid(email: str | None) -> str:
    if email:
        user = user_store.get_user_by_email(email)
        if user is None:
            raise SystemExit(f"No TinyDB user with email {email}. Register it first with POST /users.")
        return user_store.ensure_user_uuid(user["id"])
    user = user_store.get_user_by_email(SEED_OPERATIVE_EMAIL)
    if user is None:
        user, _ = user_store.create_user(
            SEED_OPERATIVE_EMAIL, secrets.token_urlsafe(32), name="Inventory seed operative"
        )
    return user_store.ensure_user_uuid(user["id"])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--email", help="TinyDB user to attribute the seeded movements to.")
    args = parser.parse_args()

    init_inventory_db()
    user_uuid = _seed_user_uuid(args.email)
    counts = {"skus": 0, "entries": 0, "exits": 0}

    with Session(get_engine()) as session:
        by_code: dict[tuple[str, str], SKU] = {}
        for name, code, client, category, warehouse in SKUS:
            sku = session.exec(select(SKU).where(SKU.sku == code, SKU.warehouse == warehouse)).first()
            if sku is None:
                sku = SKU(name=name, sku=code, client_name=client, category=category, warehouse=warehouse)
                session.add(sku)
                session.flush()
                counts["skus"] += 1
            by_code[(code, warehouse)] = sku

        for code, warehouse, quantity, reference in ENTRIES:
            sku = by_code[(code, warehouse)]
            exists = session.exec(
                select(StockEntry).where(StockEntry.reference == reference, StockEntry.sku_id == sku.id)
            ).first()
            if exists is None:
                session.add(
                    StockEntry(sku_id=sku.id, quantity=quantity, reference=reference,
                               warehouse=warehouse, user_uuid=user_uuid)
                )
                counts["entries"] += 1
        session.flush()

        for code, warehouse, quantity, exit_type, tracking in EXITS:
            sku = by_code[(code, warehouse)]
            exists = session.exec(
                select(StockExit).where(
                    StockExit.sku_id == sku.id,
                    StockExit.exit_type == exit_type,
                    StockExit.quantity == quantity,
                    StockExit.tracking_number == tracking
                    if tracking is not None
                    else StockExit.tracking_number.is_(None),
                )
            ).first()
            if exists is None:
                session.add(
                    StockExit(sku_id=sku.id, quantity=quantity, exit_type=exit_type,
                              tracking_number=tracking, warehouse=warehouse, user_uuid=user_uuid)
                )
                counts["exits"] += 1
        session.commit()

        skus = list(by_code.values())
        stock = stock_for(session, skus)

    print(f"SKUs inserted: {counts['skus']} · entries: {counts['entries']} · exits: {counts['exits']}")
    print("Current stock (entries − exits, per warehouse):")
    mismatches = 0
    for (code, warehouse), sku in by_code.items():
        expected = EXPECTED_STOCK[(code, warehouse)]
        mark = "OK" if stock[sku.id] == expected else f"expected {expected}"
        mismatches += stock[sku.id] != expected
        print(f"  {warehouse:<3} {code:<15} {stock[sku.id]:>4}  {mark}")
    if mismatches:
        print("Stock differs from the seed plan — other movements already exist in the database.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
