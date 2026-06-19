from uuid import UUID
from datetime import date
import logging

from sqlalchemy.orm import Session

from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
)
from app.core.config import settings
from app.core.enums import InventoryMovementType
from app.models.inventory import InventoryMovement
from app.models.product import Product
from app.repositories.product_repository import (
    create_product,
    delete_product,
    get_all_products,
    get_product_by_id,
    get_product_by_sku,
    get_product_by_sku_except_id,
    update_product,
)
from app.repositories.inventory_repository import create_inventory_movement
from app.schemas.inventory import StockAdjustment
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
)

logger = logging.getLogger(__name__)


def create_new_product(
    db: Session,
    product_data: ProductCreate
) -> Product:
    existing_product = get_product_by_sku(
        db,
        product_data.sku
    )

    if existing_product:
        raise ConflictException(
            "Product with this SKU already exists"
        )

    product = Product(
        name=product_data.name,
        description=product_data.description,
        sku=product_data.sku,
        price=product_data.price,
        stock_quantity=product_data.stock_quantity,
    )

    return create_product(
        db,
        product
    )


def fetch_all_products(
    db: Session,
    page: int = 1,
    size: int = 10,
    search: str | None = None,
    is_active: bool | None = None,
    low_stock: bool = False,
    created_from: date | None = None,
    created_to: date | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
):
    return get_all_products(
        db,
        page,
        size,
        search,
        is_active,
        low_stock,
        settings.LOW_STOCK_THRESHOLD,
        created_from,
        created_to,
        sort_by,
        sort_order,
    )


def fetch_product_by_id(
    db: Session,
    product_id: UUID
):
    product = get_product_by_id(
        db,
        product_id
    )

    if not product:
        raise NotFoundException(
            "Product not found"
        )

    return product


def update_existing_product(
    db: Session,
    product_id: UUID,
    product_data: ProductUpdate,
):
    product = get_product_by_id(
        db,
        product_id
    )

    if not product:
        raise NotFoundException(
            "Product not found"
        )

    update_data = product_data.model_dump(
        exclude_unset=True
    )

    if "sku" in update_data:
        existing_product = get_product_by_sku_except_id(
            db,
            update_data["sku"],
            product_id,
        )
        if existing_product:
            raise ConflictException(
                "Product with this SKU already exists"
            )

    for key, value in update_data.items():
        setattr(product, key, value)

    return update_product(
        db,
        product
    )


def remove_product(
    db: Session,
    product_id: UUID
):
    product = get_product_by_id(
        db,
        product_id
    )

    if not product:
        raise NotFoundException(
            "Product not found"
        )

    if product.order_items:
        raise ConflictException(
            "Cannot delete product used in orders"
        )

    delete_product(
        db,
        product
    )


def adjust_product_stock(
    db: Session,
    product_id: UUID,
    payload: StockAdjustment,
):
    product = get_product_by_id(
        db,
        product_id
    )

    if not product:
        raise NotFoundException(
            "Product not found"
        )

    previous_quantity = product.stock_quantity
    new_quantity = previous_quantity + payload.quantity_change

    if new_quantity < 0:
        raise BadRequestException(
            "Stock adjustment cannot make quantity negative"
        )

    product.stock_quantity = new_quantity
    movement_type = (
        InventoryMovementType.STOCK_IN
        if payload.quantity_change > 0
        else InventoryMovementType.MANUAL_ADJUSTMENT
    )

    create_inventory_movement(
        db,
        InventoryMovement(
            product_id=product.id,
            movement_type=movement_type,
            quantity_change=payload.quantity_change,
            previous_quantity=previous_quantity,
            new_quantity=new_quantity,
            reason=payload.reason or "Manual stock adjustment",
        ),
    )

    db.commit()
    db.refresh(product)
    logger.info(
        "Adjusted stock for product %s by %s",
        product.id,
        payload.quantity_change,
    )
    return product
