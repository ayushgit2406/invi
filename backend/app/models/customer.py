from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_model import BaseModel
from app.db.database import Base

class Customer(Base, BaseModel):
    __tablename__ = "customers"
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )
    phone_number: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )
    orders = relationship(
        "Order",
        back_populates="customer"
    )
