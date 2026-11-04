"""Stock is never stored: it is always SUM(entries) − SUM(exits), per SKU and warehouse."""

from __future__ import annotations

from collections.abc import Iterable

from sqlalchemy import func
from sqlmodel import Session, select

from services.api.inventory.models import SKU, StockEntry, StockExit


def _sums(session: Session, model: type[StockEntry] | type[StockExit], skus: Iterable[SKU]) -> dict[tuple[int, str], int]:
    sku_ids = [sku.id for sku in skus]
    if not sku_ids:
        return {}
    rows = session.exec(
        select(model.sku_id, model.warehouse, func.coalesce(func.sum(model.quantity), 0))
        .where(model.sku_id.in_(sku_ids))
        .group_by(model.sku_id, model.warehouse)
    ).all()
    return {(sku_id, warehouse): int(total) for sku_id, warehouse, total in rows}


def stock_for(session: Session, skus: list[SKU]) -> dict[int, int]:
    """Current stock of each SKU in its own warehouse, in two aggregate queries (no N+1)."""
    entries = _sums(session, StockEntry, skus)
    exits = _sums(session, StockExit, skus)
    return {
        sku.id: entries.get((sku.id, sku.warehouse), 0) - exits.get((sku.id, sku.warehouse), 0)
        for sku in skus
    }


def available_stock(session: Session, sku: SKU, warehouse: str) -> int:
    entries = session.exec(
        select(func.coalesce(func.sum(StockEntry.quantity), 0)).where(
            StockEntry.sku_id == sku.id, StockEntry.warehouse == warehouse
        )
    ).one()
    exits = session.exec(
        select(func.coalesce(func.sum(StockExit.quantity), 0)).where(
            StockExit.sku_id == sku.id, StockExit.warehouse == warehouse
        )
    ).one()
    return int(entries) - int(exits)
