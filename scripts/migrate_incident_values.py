#!/usr/bin/env python3
"""Rewrite stored incidents from the old values to the official briefing values.

Old databases used 5 categories taken from the CSV and 3 branches. The official
briefing (docs/briefings/centralized-incident-manager.es.md) defines 9 categories
and 5 sites. This script maps every stored incident in place, using the same
mapping as the CSV seed, and is safe to run more than once.

Usage:
    python scripts/migrate_incident_values.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

OLD_CATEGORIES = {
    "delayed_delivery": "carrier_issue",
    "wrong_address": "delivery_failure",
    "return_request": "returns_issue",
    "damage": "carrier_issue",
}
# Customer reports come through the office of each country; staff reports, from the warehouse.
OLD_BRANCHES = {
    ("los_angeles", "customer"): "la_office",
    ("zaragoza", "customer"): "zaragoza_office",
    ("los_angeles", "branch"): "la_warehouse",
    ("zaragoza", "branch"): "zaragoza_warehouse",
    ("los_angeles", "internal"): "central",
    ("zaragoza", "internal"): "central",
}


def migrate(table) -> int:
    """Returns how many incidents changed."""
    changed = 0
    for document in table.all():
        updates = {}
        category = OLD_CATEGORIES.get(document.get("category"))
        if category:
            updates["category"] = category
        branch = OLD_BRANCHES.get((document.get("branch"), document.get("origin")))
        if branch:
            updates["branch"] = branch
        if updates:
            table.update(updates, doc_ids=[document.doc_id])
            changed += 1
    return changed


def main() -> int:
    from services.api.cache import cache
    from services.api.database import incidents_table

    changed = migrate(incidents_table)
    cache.clear()
    print(f"Incidencias migradas a los valores oficiales: {changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
