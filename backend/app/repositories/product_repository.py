from datetime import date, datetime
from uuid import UUID

from sqlalchemy import asc, desc, or_
from sqlalchemy.orm import Session

from app.models.product import Product
from app.core.pagination import pagination_offset
from app.repositories.date_filters import apply_created_at_filters


def create_product(
    db: Session,
    product: Product
) -> Product:
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def get_all_products(
    db: Session,
    page: int = 1,
    size: int = 10,
    search: str | None = None,
    is_active: bool | None = None,
    low_stock: bool = False,
    low_stock_threshold: int = 10,
    created_from: date | None = None,
    created_to: date | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
):
    query = db.query(Product).filter(Product.deleted_at.is_(None))

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(pattern),
                Product.sku.ilike(pattern),
            )
        )

    if is_active is not None:
        query = query.filter(Product.is_active == is_active)

    if low_stock:
        query = query.filter(Product.stock_quantity < low_stock_threshold)

    query = apply_created_at_filters(
        query,
        Product.created_at,
        created_from,
        created_to,
    )

    sort_columns = {
        "name": Product.name,
        "sku": Product.sku,
        "price": Product.price,
        "stock_quantity": Product.stock_quantity,
        "created_at": Product.created_at,
        "updated_at": Product.updated_at,
    }
    sort_column = sort_columns.get(sort_by, Product.created_at)
    order_clause = asc(sort_column) if sort_order.lower() == "asc" else desc(sort_column)

    total = query.count()
    items = (
        query
        .order_by(order_clause, Product.id.desc())
        .offset(pagination_offset(page, size))
        .limit(size)
        .all()
    )
    return items, total


def get_product_by_id(
    db: Session,
    product_id: UUID
):
    return (
        db.query(Product)
        .filter(Product.id == product_id, Product.deleted_at.is_(None))
        .first()
    )


def get_product_by_sku(
    db: Session,
    sku: str
):
    return (
        db.query(Product)
        .filter(Product.sku == sku, Product.deleted_at.is_(None))
        .first()
    )


def get_product_by_sku_except_id(
    db: Session,
    sku: str,
    product_id: UUID
):
    return (
        db.query(Product)
        .filter(Product.sku == sku, Product.id != product_id, Product.deleted_at.is_(None))
        .first()
    )


def update_product(
    db: Session,
    product: Product
):
    db.commit()
    db.refresh(product)
    return product


def delete_product(
    db: Session,
    product: Product
):
    """Soft delete product by setting deleted_at timestamp"""
    product.deleted_at = datetime.utcnow()
    db.commit()
    db.refresh(product)
