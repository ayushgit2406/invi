from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import InventoryMovementType


class StockAdjustment(BaseModel):
    quantity_change: int = Field(..., description="Positive to add stock, negative to remove stock")
    reason: str | None = Field(None, max_length=255)


class InventoryMovementResponse(BaseModel):
    id: UUID
    product_id: UUID
    order_id: UUID | None
    movement_type: InventoryMovementType
    quantity_change: int
    previous_quantity: int
    new_quantity: int
    reason: str | None

    model_config = ConfigDict(from_attributes=True)
