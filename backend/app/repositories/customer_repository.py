from datetime import date, datetime
from uuid import UUID

from sqlalchemy import asc, desc, or_
from sqlalchemy.orm import Session

from app.core.pagination import pagination_offset
from app.models.customer import Customer
from app.repositories.date_filters import apply_created_at_filters

def create_customer(db: Session, customer: Customer) -> Customer:
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def get_all_customers(
    db: Session,
    page: int = 1,
    size: int = 10,
    search: str | None = None,
    created_from: date | None = None,
    created_to: date | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
):
    query = db.query(Customer).filter(Customer.deleted_at.is_(None))

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Customer.full_name.ilike(pattern),
                Customer.email.ilike(pattern),
                Customer.phone_number.ilike(pattern),
            )
        )

    query = apply_created_at_filters(
        query,
        Customer.created_at,
        created_from,
        created_to,
    )

    sort_columns = {
        "full_name": Customer.full_name,
        "email": Customer.email,
        "phone_number": Customer.phone_number,
        "created_at": Customer.created_at,
        "updated_at": Customer.updated_at,
    }
    sort_column = sort_columns.get(sort_by, Customer.created_at)
    order_clause = asc(sort_column) if sort_order.lower() == "asc" else desc(sort_column)

    total = query.count()
    items = (
        query
        .order_by(order_clause, Customer.id.desc())
        .offset(pagination_offset(page, size))
        .limit(size)
        .all()
    )
    return items, total


def get_customer_by_id(db: Session, customer_id: UUID):
    return db.query(Customer).filter(Customer.id == customer_id, Customer.deleted_at.is_(None)).first()


def get_customer_by_email(db: Session, email: str):
    return db.query(Customer).filter(Customer.email == email, Customer.deleted_at.is_(None)).first()


def delete_customer(db: Session, customer: Customer):
    """Soft delete customer by setting deleted_at timestamp"""
    customer.deleted_at = datetime.utcnow()
    db.commit()
    db.refresh(customer)
