from uuid import UUID

from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import InventoryMovementType
from app.db.base_model import BaseModel
from app.db.database import Base


class InventoryMovement(Base, BaseModel):
    __tablename__ = "inventory_movements"

    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id"),
        nullable=False,
        index=True
    )
    order_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("orders.id"),
        nullable=True,
        index=True
    )
    movement_type: Mapped[InventoryMovementType] = mapped_column(
        Enum(InventoryMovementType),
        nullable=False
    )
    quantity_change: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    previous_quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    new_quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    reason: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    product = relationship(
        "Product",
        back_populates="inventory_movements"
    )
    order = relationship("Order")
