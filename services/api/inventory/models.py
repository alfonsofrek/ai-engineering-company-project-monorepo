"""ORM models for TrackFlow inventory (stored in Supabase via SQLModel).

Entity names follow the Milestone 5 TrackFlow BRIEFING:
``SKU`` (product), ``StockEntry`` (goods receipt) and ``StockExit`` (dispatch or loss).

There is deliberately no stock column on ``SKU``: stock is always derived from the
movement history. There is also no User table — ``user_uuid`` points at the TinyDB user.

No ``from __future__ import annotations`` here: SQLModel needs real annotations to
resolve ``Relationship`` targets.
"""

from datetime import datetime, timezone
from enum import StrEnum
from typing import List, Optional

from sqlalchemy import CheckConstraint, Column, DateTime, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Warehouse(StrEnum):
    LA = "LA"  # Los Angeles
    ZGZ = "ZGZ"  # Zaragoza


class SKUCategory(StrEnum):
    FASHION = "fashion"
    ELECTRONICS = "electronics"
    COSMETICS = "cosmetics"


class ExitType(StrEnum):
    DISPATCH = "dispatch"  # customer shipment
    LOSS = "loss"  # confirmed discrepancy or damage


class SKU(SQLModel, table=True):
    __tablename__ = "sku"
    __table_args__ = (
        UniqueConstraint("sku", "warehouse", name="uq_sku_code_per_warehouse"),
        CheckConstraint("warehouse IN ('LA', 'ZGZ')", name="ck_sku_warehouse"),
        CheckConstraint(
            "category IN ('fashion', 'electronics', 'cosmetics')", name="ck_sku_category"
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=200)
    sku: str = Field(max_length=64, index=True)
    client_name: str = Field(max_length=120)
    category: str = Field(max_length=20)
    warehouse: str = Field(max_length=3, index=True)

    entries: List["StockEntry"] = Relationship(back_populates="sku_item")
    exits: List["StockExit"] = Relationship(back_populates="sku_item")


class StockEntry(SQLModel, table=True):
    __tablename__ = "stock_entry"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_stock_entry_quantity_positive"),
        CheckConstraint("warehouse IN ('LA', 'ZGZ')", name="ck_stock_entry_warehouse"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    sku_id: int = Field(foreign_key="sku.id", index=True, ondelete="RESTRICT")
    quantity: int
    reference: str = Field(max_length=64)
    warehouse: str = Field(max_length=3, index=True)
    created_at: datetime = Field(
        default_factory=utc_now, sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    user_uuid: str = Field(max_length=36, index=True)

    sku_item: Optional[SKU] = Relationship(back_populates="entries")


class StockExit(SQLModel, table=True):
    __tablename__ = "stock_exit"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_stock_exit_quantity_positive"),
        CheckConstraint("warehouse IN ('LA', 'ZGZ')", name="ck_stock_exit_warehouse"),
        CheckConstraint("exit_type IN ('dispatch', 'loss')", name="ck_stock_exit_type"),
        CheckConstraint(
            "(exit_type = 'dispatch' AND tracking_number IS NOT NULL)"
            " OR (exit_type = 'loss' AND tracking_number IS NULL)",
            name="ck_stock_exit_tracking_matches_type",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    sku_id: int = Field(foreign_key="sku.id", index=True, ondelete="RESTRICT")
    quantity: int
    exit_type: str = Field(max_length=10)
    tracking_number: Optional[str] = Field(default=None, max_length=64)
    warehouse: str = Field(max_length=3, index=True)
    created_at: datetime = Field(
        default_factory=utc_now, sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    user_uuid: str = Field(max_length=36, index=True)

    sku_item: Optional[SKU] = Relationship(back_populates="exits")
