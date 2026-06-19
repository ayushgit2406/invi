import logging
from datetime import date
from uuid import UUID

from sqlalchemy.orm import Session
from decimal import Decimal
from app.core.enums import InventoryMovementType, OrderStatus
from app.models.inventory import InventoryMovement
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.repositories.customer_repository import get_customer_by_id
from app.repositories.inventory_repository import create_inventory_movement
from app.schemas.order import OrderCreate
from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.repositories.order_repository import (
    get_all_orders,
    get_order_by_id,
    update_order,
)

logger = logging.getLogger(__name__)


def create_new_order(db: Session, order_data: OrderCreate) -> Order:
    if order_data.idempotency_key:
        existing_order = db.query(Order).filter(
            Order.idempotency_key == order_data.idempotency_key
        ).first()
        if existing_order:
            logger.info(
                "Returning existing order %s for idempotency key %s",
                existing_order.id,
                order_data.idempotency_key
            )
            return existing_order
    
    total = Decimal("0")
    order_items = []
    inventory_movements = []
    try:
        customer = get_customer_by_id(
            db,
            order_data.customer_id
        )
        if not customer:
            raise NotFoundException(
                "Customer not found"
            )

        for item in order_data.items:
            product = (
                db.query(Product)
                .filter(Product.id == item.product_id)
                .first()
            )
            if not product:
                raise NotFoundException(
                    "Product not found"
                )
            if product.stock_quantity < item.quantity:
                raise ConflictException(
                    f"Insufficient stock for {product.name}. Available: {product.stock_quantity}, Requested: {item.quantity}"
                )
            previous_quantity = product.stock_quantity
            product.stock_quantity -= item.quantity
            item_total = (
                product.price * item.quantity
            )
            total += item_total
            order_items.append(
                OrderItem(
                    product_id=product.id,
                    quantity=item.quantity,
                    price=product.price,
                )
            )
            movement = InventoryMovement(
                product_id=product.id,
                movement_type=InventoryMovementType.ORDER_PLACED,
                quantity_change=-item.quantity,
                previous_quantity=previous_quantity,
                new_quantity=product.stock_quantity,
                reason="Order placed",
            )
            inventory_movements.append(movement)
            create_inventory_movement(db, movement)
        
        order = Order(
            customer_id=order_data.customer_id,
            total_amount=total,
            status=OrderStatus.PENDING,
            idempotency_key=order_data.idempotency_key,
            items=order_items,
        )
        db.add(order)
        db.flush()

        for movement in inventory_movements:
            movement.order_id = order.id

        db.commit()
        db.refresh(order)
        logger.info("Created order %s for customer %s", order.id, order.customer_id)
        return order
    except Exception as e:
        db.rollback()
        logger.error("Failed to create order: %s", str(e))
        raise

def fetch_all_orders(
    db: Session,
    page: int = 1,
    size: int = 10,
    search: str | None = None,
    status: OrderStatus | None = None,
    customer_id: UUID | None = None,
    created_from: date | None = None,
    created_to: date | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
):
    return get_all_orders(
        db,
        page,
        size,
        search,
        status,
        customer_id,
        created_from,
        created_to,
        sort_by,
        sort_order,
    )

def fetch_order_by_id(db: Session, order_id):
    order = get_order_by_id(
        db,
        order_id
    )
    if not order:
        raise NotFoundException(
            "Order not found"
        )
    return order

def update_order_status(db: Session, order_id, status: OrderStatus):
    order = get_order_by_id(
        db,
        order_id
    )
    if not order:
        raise NotFoundException(
            "Order not found"
        )
    old_status = order.status
    if old_status == OrderStatus.CANCELLED and status != OrderStatus.CANCELLED:
        raise BadRequestException(
            "Cancelled orders cannot be reactivated"
        )

    if status == OrderStatus.CANCELLED and old_status != OrderStatus.CANCELLED:
        restore_order_inventory(db, order)
    order.status = status
    updated_order = update_order(
        db,
        order
    )
    logger.info("Updated order %s status from %s to %s", order.id, old_status, status)
    return updated_order


def cancel_order(db: Session, order_id: UUID) -> Order:
    order = get_order_by_id(
        db,
        order_id
    )
    if not order:
        raise NotFoundException(
            "Order not found"
        )

    if order.status == OrderStatus.CANCELLED:
        return order

    restore_order_inventory(db, order)
    order.status = OrderStatus.CANCELLED
    updated_order = update_order(
        db,
        order
    )
    logger.info("Cancelled order %s", order.id)
    return updated_order


def restore_order_inventory(db: Session, order: Order) -> None:
    if order.status == OrderStatus.CANCELLED:
        raise BadRequestException(
            "Order is already cancelled"
        )

    for item in order.items:
        product = (
            db.query(Product)
            .filter(
                Product.id == item.product_id
            )
            .first()
        )
        if product:
            previous_quantity = product.stock_quantity
            product.stock_quantity += item.quantity
            create_inventory_movement(
                db,
                InventoryMovement(
                    product_id=product.id,
                    order_id=order.id,
                    movement_type=InventoryMovementType.ORDER_CANCELLED,
                    quantity_change=item.quantity,
                    previous_quantity=previous_quantity,
                    new_quantity=product.stock_quantity,
                    reason="Order cancelled",
                ),
            )
