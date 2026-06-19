from datetime import date
from uuid import UUID

from sqlalchemy import String, asc, cast, desc
from sqlalchemy.orm import Session

from app.core.enums import OrderStatus
from app.core.pagination import pagination_offset
from app.models.order import Order
from app.repositories.date_filters import apply_created_at_filters

def create_order(db: Session, order: Order) -> Order:
    db.add(order)
    db.commit()
    db.refresh(order)
    return order

def get_all_orders(
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
    """Get all orders. Note: Orders are never hard-deleted, only status-changed."""
    query = db.query(Order)

    if search:
        query = query.filter(cast(Order.id, String).ilike(f"%{search.strip()}%"))

    if status:
        query = query.filter(Order.status == status)

    if customer_id:
        query = query.filter(Order.customer_id == customer_id)

    query = apply_created_at_filters(
        query,
        Order.created_at,
        created_from,
        created_to,
    )

    sort_columns = {
        "id": Order.id,
        "customer_id": Order.customer_id,
        "total_amount": Order.total_amount,
        "status": Order.status,
        "created_at": Order.created_at,
        "updated_at": Order.updated_at,
    }
    sort_column = sort_columns.get(sort_by, Order.created_at)
    order_clause = asc(sort_column) if sort_order.lower() == "asc" else desc(sort_column)

    total = query.count()
    items = (
        query
        .order_by(order_clause, Order.id.desc())
        .offset(pagination_offset(page, size))
        .limit(size)
        .all()
    )
    return items, total

def get_order_by_id(db: Session, order_id):
    return (
        db.query(Order)
        .filter(Order.id == order_id)
        .first()
    )

def update_order(db: Session, order: Order) -> Order:
    db.commit()
    db.refresh(order)
    return order
