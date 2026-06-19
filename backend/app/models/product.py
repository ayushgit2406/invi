from sqlalchemy import Boolean, CheckConstraint, Numeric, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_model import BaseModel
from app.db.database import Base

class Product(Base, BaseModel):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price > 0", name="ck_products_price_positive"),
        CheckConstraint("stock_quantity >= 0", name="ck_products_stock_non_negative"),
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    description: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True
    )
    sku: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )
    price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )
    stock_quantity: Mapped[int] = mapped_column(
        nullable=False,
        default=0,
        server_default="0"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true")
    )
    order_items = relationship(
        "OrderItem",
        back_populates="product"
    )
    inventory_movements = relationship(
        "InventoryMovement",
        back_populates="product"
    )
