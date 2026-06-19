from uuid import UUID
from sqlalchemy.orm import Session

from app.models.inventory import InventoryMovement
from app.core.pagination import pagination_offset


def create_inventory_movement(
    db: Session,
    movement: InventoryMovement,
) -> InventoryMovement:
    db.add(movement)
    return movement


def get_all_inventory_movements(
    db: Session,
    page: int = 1,
    size: int = 20,
    product_id: UUID | None = None,
    order_id: UUID | None = None,
):
    """Get all inventory movements with optional filtering"""
    query = db.query(InventoryMovement)

    if product_id:
        query = query.filter(InventoryMovement.product_id == product_id)

    if order_id:
        query = query.filter(InventoryMovement.order_id == order_id)

    total = query.count()
    items = (
        query
        .order_by(InventoryMovement.created_at.desc())
        .offset(pagination_offset(page, size))
        .limit(size)
        .all()
    )
    return items, total

