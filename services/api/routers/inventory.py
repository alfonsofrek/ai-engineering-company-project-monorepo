"""TrackFlow inventory API — every route lives under ``/inventory``.

Stock can only change by registering a movement: a ``StockEntry`` (goods receipt)
adds units, a ``StockExit`` (dispatch or loss) removes them. Each movement stores the
UUID of the TinyDB user who registered it.

All routes require a bearer token: inventory figures are contractual data for
TrackFlow's client brands, so they are not public.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from services.api import user_store
from services.api.auth_models import UserResponse
from services.api.database import get_db
from services.api.inventory.models import SKU, StockEntry, StockExit, Warehouse
from services.api.inventory.schemas import (
    SKUCreate,
    SKURead,
    SKUSummary,
    StockEntryCreate,
    StockEntryRead,
    StockExitCreate,
    StockExitRead,
    StockMovementRead,
)
from services.api.inventory.stock import available_stock, stock_for
from services.api.security import get_current_user

router = APIRouter(prefix="/inventory", tags=["inventory"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[UserResponse, Depends(get_current_user)]


def _to_sku_read(sku: SKU, current_stock: int) -> SKURead:
    return SKURead(
        id=sku.id,
        name=sku.name,
        sku=sku.sku,
        client_name=sku.client_name,
        category=sku.category,
        warehouse=sku.warehouse,
        current_stock=current_stock,
    )


def _summary(sku: SKU) -> SKUSummary:
    return SKUSummary(
        id=sku.id, name=sku.name, sku=sku.sku, client_name=sku.client_name, warehouse=sku.warehouse
    )


def _entry_read(entry: StockEntry) -> StockEntryRead:
    return StockEntryRead(
        id=entry.id,
        sku_id=entry.sku_id,
        quantity=entry.quantity,
        reference=entry.reference,
        warehouse=entry.warehouse,
        created_at=entry.created_at,
        user_uuid=entry.user_uuid,
        sku=_summary(entry.sku_item),
    )


def _exit_read(exit_: StockExit) -> StockExitRead:
    return StockExitRead(
        id=exit_.id,
        sku_id=exit_.sku_id,
        quantity=exit_.quantity,
        exit_type=exit_.exit_type,
        tracking_number=exit_.tracking_number,
        warehouse=exit_.warehouse,
        created_at=exit_.created_at,
        user_uuid=exit_.user_uuid,
        sku=_summary(exit_.sku_item),
    )


def _get_sku_or_404(session: Session, sku_id: int, *, lock: bool = False) -> SKU:
    statement = select(SKU).where(SKU.id == sku_id)
    if lock:
        # Serialises concurrent movements on the same SKU (PostgreSQL row lock),
        # so two exits cannot both pass the stock check and oversell.
        statement = statement.with_for_update()
    sku = session.exec(statement).first()
    if sku is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"SKU {sku_id} not found.")
    return sku


def _require_same_warehouse(sku: SKU, warehouse: Warehouse) -> None:
    # Each SKU record is a per-warehouse stock unit (e.g. CLT-SNK-W-42 in LA and
    # CLT-SNK-W-42-Z in ZGZ), so its movements must happen in that warehouse.
    if sku.warehouse != warehouse.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"SKU '{sku.sku}' is stocked in warehouse {sku.warehouse}; "
                f"movements for warehouse {warehouse.value} must use that warehouse's SKU."
            ),
        )


# ------------------------------------------------------------------------------ SKUs


@router.get("/products", response_model=list[SKURead])
def list_products(
    session: DbSession,
    _: CurrentUser,
    warehouse: Annotated[Warehouse | None, Query(description="Only SKUs stocked in this warehouse.")] = None,
) -> list[SKURead]:
    statement = select(SKU).order_by(SKU.warehouse, SKU.sku)
    if warehouse is not None:
        statement = statement.where(SKU.warehouse == warehouse.value)
    skus = list(session.exec(statement).all())
    stock = stock_for(session, skus)
    return [_to_sku_read(sku, stock[sku.id]) for sku in skus]


@router.post("/products", response_model=SKURead, status_code=status.HTTP_201_CREATED)
def create_product(payload: SKUCreate, session: DbSession, _: CurrentUser) -> SKURead:
    duplicate = session.exec(
        select(SKU).where(SKU.sku == payload.sku, SKU.warehouse == payload.warehouse.value)
    ).first()
    if duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"SKU '{payload.sku}' already exists in warehouse {payload.warehouse.value}.",
        )
    sku = SKU(**payload.model_dump(mode="json"))
    session.add(sku)
    session.commit()
    session.refresh(sku)
    # A new SKU always starts at zero; stock only grows through StockEntry records.
    return _to_sku_read(sku, 0)


@router.get("/products/{sku_id}", response_model=SKURead)
def get_product(sku_id: int, session: DbSession, _: CurrentUser) -> SKURead:
    sku = _get_sku_or_404(session, sku_id)
    return _to_sku_read(sku, stock_for(session, [sku])[sku.id])


# ------------------------------------------------------------------------- Movements


@router.post("/orders/inbound", response_model=StockEntryRead, status_code=status.HTTP_201_CREATED)
def register_inbound(payload: StockEntryCreate, session: DbSession, user: CurrentUser) -> StockEntryRead:
    sku = _get_sku_or_404(session, payload.sku_id, lock=True)
    _require_same_warehouse(sku, payload.warehouse)
    entry = StockEntry(
        **payload.model_dump(mode="json"),
        user_uuid=user_store.ensure_user_uuid(user.id),
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return _entry_read(entry)


@router.post("/orders/outbound", response_model=StockExitRead, status_code=status.HTTP_201_CREATED)
def register_outbound(payload: StockExitCreate, session: DbSession, user: CurrentUser) -> StockExitRead:
    sku = _get_sku_or_404(session, payload.sku_id, lock=True)
    _require_same_warehouse(sku, payload.warehouse)

    available = available_stock(session, sku, payload.warehouse.value)
    if payload.quantity > available:
        session.rollback()  # release the row lock; nothing was written
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient stock for SKU '{sku.sku}'. "
                f"Available: {available}, requested: {payload.quantity}."
            ),
        )

    exit_ = StockExit(
        **payload.model_dump(mode="json"),
        user_uuid=user_store.ensure_user_uuid(user.id),
    )
    session.add(exit_)
    session.commit()
    session.refresh(exit_)
    return _exit_read(exit_)


@router.get("/orders", response_model=list[StockMovementRead])
def list_orders(
    session: DbSession,
    _: CurrentUser,
    warehouse: Annotated[Warehouse | None, Query()] = None,
    sku_id: Annotated[int | None, Query(gt=0)] = None,
) -> list[StockMovementRead]:
    # selectinload fetches all related SKUs in one extra query instead of one per row (N+1).
    entries_q = select(StockEntry).options(selectinload(StockEntry.sku_item))
    exits_q = select(StockExit).options(selectinload(StockExit.sku_item))
    if warehouse is not None:
        entries_q = entries_q.where(StockEntry.warehouse == warehouse.value)
        exits_q = exits_q.where(StockExit.warehouse == warehouse.value)
    if sku_id is not None:
        entries_q = entries_q.where(StockEntry.sku_id == sku_id)
        exits_q = exits_q.where(StockExit.sku_id == sku_id)

    movements: list[StockMovementRead] = [_entry_read(e) for e in session.exec(entries_q).all()]
    movements += [_exit_read(x) for x in session.exec(exits_q).all()]
    movements.sort(key=lambda m: (m.created_at, m.movement, m.id), reverse=True)
    return movements
