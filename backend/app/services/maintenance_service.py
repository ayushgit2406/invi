from __future__ import annotations

from decimal import Decimal
from logging import getLogger
from typing import Literal

from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.inventory import InventoryMovement
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.schemas.order import OrderCreate, OrderItemCreate
from app.services.order_service import create_new_order

logger = getLogger(__name__)

MaintenanceResetTarget = Literal["all", "customers", "orders", "products", "inventory"]


def seed_demo_data(db: Session) -> dict[str, object]:
    """Seed the database with the standard demo dataset."""
    existing_counts = {
        "products": db.query(Product).count(),
        "customers": db.query(Customer).count(),
        "orders": db.query(Order).count(),
        "inventory_movements": db.query(InventoryMovement).count(),
    }
    if any(existing_counts.values()):
        return {
            "status": "skipped",
            "message": "Database already contains data",
            "existing": existing_counts,
        }

    logger.info("Starting demo data seed")

    products = [
        Product(
            name="Wireless Mouse",
            description="Ergonomic wireless mouse with 2.4GHz receiver",
            sku="MOUSE-001",
            price=Decimal("799.00"),
            stock_quantity=25,
        ),
        Product(
            name="Mechanical Keyboard",
            description="Compact mechanical keyboard with RGB lighting",
            sku="KEYBOARD-001",
            price=Decimal("2499.00"),
            stock_quantity=12,
        ),
        Product(
            name="USB-C Hub",
            description="7-in-1 USB-C hub with HDMI and SD card reader",
            sku="HUB-001",
            price=Decimal("1499.00"),
            stock_quantity=8,
        ),
        Product(
            name="USB-C Cable",
            description="2-meter USB-C charging and data cable",
            sku="CABLE-001",
            price=Decimal("299.00"),
            stock_quantity=8,
        ),
        Product(
            name="Screen Protector",
            description="Tempered glass screen protector for 15-inch laptop",
            sku="PROTECT-001",
            price=Decimal("499.00"),
            stock_quantity=45,
        ),
    ]

    customers = [
        Customer(
            full_name="Rajesh Kumar",
            email="rajesh.kumar@example.com",
            phone_number="+919876543210",
        ),
        Customer(
            full_name="Priya Sharma",
            email="priya.sharma@example.com",
            phone_number="+919876543211",
        ),
        Customer(
            full_name="Amit Patel",
            email="amit.patel@example.com",
            phone_number="+919876543212",
        ),
    ]

    db.add_all(products)
    db.add_all(customers)
    db.commit()

    for product in products:
        db.refresh(product)
    for customer in customers:
        db.refresh(customer)

    orders_created = 0
    try:
        create_new_order(
            db,
            OrderCreate(
                customer_id=customers[0].id,
                items=[
                    OrderItemCreate(product_id=products[0].id, quantity=2),
                    OrderItemCreate(product_id=products[2].id, quantity=1),
                ],
            ),
        )
        orders_created += 1
    except Exception as exc:  # pragma: no cover - defensive logging path
        logger.error("Failed to create demo order 1: %s", exc)

    try:
        create_new_order(
            db,
            OrderCreate(
                customer_id=customers[1].id,
                items=[
                    OrderItemCreate(product_id=products[1].id, quantity=1),
                    OrderItemCreate(product_id=products[3].id, quantity=5),
                    OrderItemCreate(product_id=products[4].id, quantity=2),
                ],
            ),
        )
        orders_created += 1
    except Exception as exc:  # pragma: no cover - defensive logging path
        logger.error("Failed to create demo order 2: %s", exc)

    return {
        "status": "seeded",
        "products_created": len(products),
        "customers_created": len(customers),
        "orders_created": orders_created,
    }


def clear_data(db: Session, target: MaintenanceResetTarget) -> dict[str, int]:
    """Clear data for a requested maintenance scope."""
    deleted: dict[str, int] = {}

    if target in {"all", "customers", "orders", "products", "inventory"}:
        deleted["inventory_movements"] = db.query(InventoryMovement).delete(
            synchronize_session=False
        )

    if target in {"all", "customers", "orders", "products"}:
        deleted["order_items"] = db.query(OrderItem).delete(synchronize_session=False)

    if target in {"all", "customers", "orders"}:
        deleted["orders"] = db.query(Order).delete(synchronize_session=False)

    if target in {"all", "customers"}:
        deleted["customers"] = db.query(Customer).delete(synchronize_session=False)

    if target in {"all", "products"}:
        deleted["products"] = db.query(Product).delete(synchronize_session=False)

    db.commit()
    logger.info("Cleared maintenance scope %s", target)
    return deleted
