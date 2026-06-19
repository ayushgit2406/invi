from __future__ import annotations

from decimal import Decimal
from logging import getLogger
from random import Random
from typing import Literal

from sqlalchemy.orm import Session

from app.core.enums import OrderStatus
from app.models.customer import Customer
from app.models.inventory import InventoryMovement
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.schemas.order import OrderCreate, OrderItemCreate
from app.services.order_service import create_new_order, update_order_status

logger = getLogger(__name__)

MaintenanceResetTarget = Literal["all", "customers", "orders", "products", "inventory"]


def seed_demo_data(db: Session) -> dict[str, object]:
    """Seed the database with the standard demo dataset."""
    rng = Random(42)

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

    product_names = [
        "Wireless Mouse",
        "Mechanical Keyboard",
        "USB-C Hub",
        "USB-C Cable",
        "Screen Protector",
        "Portable Monitor",
        "Laptop Stand",
        "Webcam",
        "Noise Cancelling Headset",
        "Wireless Charger",
        "Desk Lamp",
        "Notebook",
        "Pen Set",
        "Docking Station",
        "External SSD",
        "Phone Holder",
        "Power Strip",
        "Smart Plug",
        "Paper Tray",
        "Cable Organizer",
        "Bluetooth Speaker",
        "Microphone",
        "Tablet Stand",
        "Router",
        "Office Chair Cushion",
        "Ergonomic Chair",
        "Standing Desk Mat",
        "HDMI Adapter",
        "Monitor Arm",
        "Label Printer",
        "File Organizer",
        "Sticky Notes Pack",
        "Conference Speaker",
        "Webcam Cover",
        "Desk Calendar",
        "Tablet Keyboard",
        "Laptop Sleeve",
        "Power Bank",
        "Surge Protector",
        "Presentation Remote",
    ]

    products = []
    for index, name in enumerate(product_names, start=1):
        products.append(
            Product(
                name=name,
                description=f"{name} for everyday workspace use.",
                sku=f"SKU-{index:04d}",
                price=Decimal(str(rng.randint(150, 7500))),
                stock_quantity=rng.randint(120, 260),
            )
        )

    customers = []
    customer_names = [
        "Aarav Mehta",
        "Priya Sharma",
        "Rahul Verma",
        "Ananya Iyer",
        "Vikram Singh",
        "Neha Kapoor",
        "Sahil Gupta",
        "Pooja Nair",
        "Arjun Rao",
        "Sneha Patel",
        "Karan Malhotra",
        "Meera Joshi",
        "Rohan Choudhary",
        "Isha Jain",
        "Nitin Shah",
        "Ritika Menon",
        "Aditya Kulkarni",
        "Divya Bansal",
        "Harsh Vyas",
        "Maya Desai",
        "Kabir Sethi",
        "Nandini Reddy",
        "Yash Thakur",
        "Tanvi Ahuja",
        "Manish Grover",
        "Shruti Agarwal",
        "Dev Patel",
        "Aisha Khan",
        "Omkar Kulkarni",
        "Lavanya Srinivasan",
    ]
    for index, name in enumerate(customer_names, start=1):
        customer_number = index
        customers.append(
            Customer(
                full_name=name,
                email=f"{name.lower().replace(' ', '.')}@example.com",
                phone_number=f"+91{9876500000 + customer_number}",
            )
        )

    db.add_all(products)
    db.add_all(customers)
    db.commit()

    for product in products:
        db.refresh(product)
    for customer in customers:
        db.refresh(customer)

    status_plan = (
        [OrderStatus.CONFIRMED] * 16
        + [OrderStatus.PROCESSING] * 12
        + [OrderStatus.SHIPPED] * 12
        + [OrderStatus.PENDING] * 8
        + [OrderStatus.FULFILLED] * 6
        + [OrderStatus.DELIVERED] * 4
        + [OrderStatus.CANCELLED] * 2
    )
    rng.shuffle(status_plan)

    orders_created = 0
    order_count = 60
    for order_index in range(order_count):
        customer = customers[order_index % len(customers)]
        item_count = rng.randint(1, 4)
        product_indexes = rng.sample(range(len(products)), k=item_count)
        items = [
            OrderItemCreate(
                product_id=products[product_index].id,
                quantity=rng.randint(1, 4),
            )
            for product_index in product_indexes
        ]

        try:
            order = create_new_order(
                db,
                OrderCreate(
                    customer_id=customer.id,
                    items=items,
                ),
            )
            update_order_status(
                db,
                order.id,
                status_plan[order_index],
            )
            orders_created += 1
        except Exception as exc:  # pragma: no cover - defensive logging path
            logger.error("Failed to create demo order %s: %s", order_index + 1, exc)

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
