from uuid import UUID
from datetime import date
from sqlalchemy.orm import Session
from app.core.exceptions import ConflictException, NotFoundException
from app.models.customer import Customer
from app.repositories.customer_repository import (
    create_customer,
    delete_customer,
    get_all_customers,
    get_customer_by_email,
    get_customer_by_id,
)
from app.schemas.customer import CustomerCreate

def create_new_customer(db: Session, customer_data: CustomerCreate) -> Customer:
    existing_customer = get_customer_by_email(
        db,
        customer_data.email
    )
    if existing_customer:
        raise ConflictException(
            "Customer with this email already exists"
        )
    customer = Customer(
        full_name=customer_data.full_name,
        email=customer_data.email,
        phone_number=customer_data.phone_number,
    )
    return create_customer(db, customer)

def fetch_all_customers(
    db: Session,
    page: int = 1,
    size: int = 10,
    search: str | None = None,
    created_from: date | None = None,
    created_to: date | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
):
    return get_all_customers(
        db,
        page,
        size,
        search,
        created_from,
        created_to,
        sort_by,
        sort_order,
    )

def fetch_customer_by_id(db: Session, customer_id: UUID):
    customer = get_customer_by_id(
        db,
        customer_id
    )
    if not customer:
        raise NotFoundException(
            "Customer not found"
        )
    return customer

def remove_customer(db: Session, customer_id: UUID):
    customer = get_customer_by_id(
        db,
        customer_id
    )
    if not customer:
        raise NotFoundException(
            "Customer not found"
        )
    if customer.orders:
        raise ConflictException(
            "Cannot delete customer with existing orders"
        )
    delete_customer(
        db,
        customer
    )
