from datetime import datetime
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class OrderItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    customer_id: UUID
    items: list[OrderItemCreate] = Field(..., min_length=1)
    idempotency_key: str | None = Field(None, max_length=255, description="Unique key for idempotent order creation")


class OrderItemResponse(BaseModel):
    product_id: UUID
    quantity: int
    price: Decimal

    model_config = ConfigDict(
        from_attributes=True
    )


class OrderResponse(BaseModel):
    id: UUID
    customer_id: UUID
    total_amount: Decimal
    status: str
    items: list[OrderItemResponse]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class RecentOrderResponse(BaseModel):
    id: UUID
    customer_id: UUID
    customer_name: str
    total_amount: Decimal
    status: str
    item_count: int
    created_at: datetime


class CancelOrderResponse(BaseModel):
    id: UUID
    status: str
    restored_inventory: bool
