"""Request/response schemas for the inventory API.

Plain Pydantic models, kept separate from the SQLModel tables in ``models.py``.
Endpoints always return these — never a raw ORM object.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from services.api.inventory.models import ExitType, SKUCategory, Warehouse

Quantity = Field(gt=0, le=1_000_000, description="Units, always a positive integer.")


# ------------------------------------------------------------------------------ SKU


class SKUCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=200)
    sku: str = Field(min_length=2, max_length=64)
    client_name: str = Field(min_length=2, max_length=120)
    category: SKUCategory
    warehouse: Warehouse


class SKURead(BaseModel):
    id: int
    name: str
    sku: str
    client_name: str
    category: SKUCategory
    warehouse: Warehouse
    current_stock: int = Field(
        description="Computed: entries − exits for this SKU in its own warehouse. Never stored."
    )


class SKUSummary(BaseModel):
    """SKU data embedded in each stock movement."""

    id: int
    name: str
    sku: str
    client_name: str
    warehouse: Warehouse


# --------------------------------------------------------------------- Stock movements


class StockEntryCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    sku_id: int = Field(gt=0)
    quantity: int = Quantity
    reference: str = Field(min_length=2, max_length=64)
    warehouse: Warehouse


class StockExitCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    sku_id: int = Field(gt=0)
    quantity: int = Quantity
    exit_type: ExitType
    tracking_number: str | None = Field(default=None, max_length=64)
    warehouse: Warehouse

    @model_validator(mode="after")
    def tracking_matches_exit_type(self) -> "StockExitCreate":
        if self.exit_type == ExitType.DISPATCH and not self.tracking_number:
            raise ValueError("tracking_number is required when exit_type is 'dispatch'.")
        if self.exit_type == ExitType.LOSS and self.tracking_number is not None:
            raise ValueError("tracking_number must be null when exit_type is 'loss'.")
        return self


class StockEntryRead(BaseModel):
    id: int
    movement: Literal["inbound"] = "inbound"
    sku_id: int
    quantity: int
    reference: str
    warehouse: Warehouse
    created_at: datetime
    user_uuid: str
    sku: SKUSummary


class StockExitRead(BaseModel):
    id: int
    movement: Literal["outbound"] = "outbound"
    sku_id: int
    quantity: int
    exit_type: ExitType
    tracking_number: str | None
    warehouse: Warehouse
    created_at: datetime
    user_uuid: str
    sku: SKUSummary


StockMovementRead = StockEntryRead | StockExitRead
