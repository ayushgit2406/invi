from uuid import UUID
from datetime import date
from typing import Literal
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.responses import paginated_response, success_response
from app.db.session import get_db
from app.schemas.common import ApiResponse, DeleteResponse, PaginatedData
from app.schemas.customer import CustomerCreate, CustomerResponse
from app.services.customer_service import create_new_customer, fetch_all_customers, fetch_customer_by_id, remove_customer

router = APIRouter(
    prefix="/customers",
    tags=["Customers"],
)

@router.post(
    "/",
    response_model=ApiResponse[CustomerResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new customer",
    description="Create a new customer with unique email",
    responses={
        201: {"description": "Customer created successfully"},
        409: {"description": "Customer with this email already exists"},
    }
)
def create_customer_api(
    customer: CustomerCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new customer.
    
    **Required fields:**
    - full_name: Customer name (1-255 chars)
    - email: Unique email address
    - phone_number: Contact phone number
    """
    return success_response(
        data=create_new_customer(db, customer),
        message="Customer created successfully"
    )


@router.get(
    "/",
    response_model=ApiResponse[PaginatedData[CustomerResponse]],
    summary="List all customers",
    description="Retrieve paginated list of customers with optional search",
    responses={
        200: {"description": "Customers retrieved successfully"},
    }
)
def get_customers_api(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    size: int = Query(10, ge=1, le=100, description="Items per page"),
    search: str | None = Query(None, description="Search by name, email, or phone"),
    created_from: date | None = Query(None, alias="created_from", description="Filter customers created on or after this date"),
    created_to: date | None = Query(None, alias="created_to", description="Filter customers created on or before this date"),
    sort_by: Literal["full_name", "email", "phone_number", "created_at", "updated_at"] = Query(
        "created_at",
        description="Sort field",
    ),
    sort_order: Literal["asc", "desc"] = Query("desc", description="Sort direction"),
    db: Session = Depends(get_db),
):
    """
    Get all customers with pagination and search.
    
    **Query parameters:**
    - page: Page number (default 1)
    - size: Items per page (default 10, max 100)
    - search: Search by customer name, email, or phone number
    """
    items, total = fetch_all_customers(
        db,
        page,
        size,
        search,
        created_from,
        created_to,
        sort_by,
        sort_order,
    )
    return paginated_response(
        items=items,
        total=total,
        page=page,
        size=size,
        message="Customers retrieved successfully",
    )


@router.get(
    "/{customer_id}",
    response_model=ApiResponse[CustomerResponse],
    summary="Get customer by ID",
    description="Retrieve detailed information about a specific customer",
    responses={
        200: {"description": "Customer retrieved successfully"},
        404: {"description": "Customer not found"},
    }
)
def get_customer_api(
    customer_id: UUID,
    db: Session = Depends(get_db),
):
    """Get a specific customer by ID."""
    return success_response(
        data=fetch_customer_by_id(db, customer_id),
        message="Customer retrieved successfully"
    )


@router.delete(
    "/{customer_id}",
    response_model=ApiResponse[DeleteResponse],
    summary="Delete customer",
    description="Soft delete a customer (record remains for audit purposes)",
    responses={
        200: {"description": "Customer deleted successfully"},
        404: {"description": "Customer not found"},
    }
)
def delete_customer_api(
    customer_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Delete a customer (soft delete).
    
    **Note:** This is a soft delete - the customer record is preserved with a deleted_at timestamp
    for audit trail purposes. Soft-deleted customers won't appear in customer listings.
    Existing orders remain associated with the customer for historical tracking.
    """
    remove_customer(db, customer_id)
    return success_response(
        data={"deleted": True},
        message="Customer deleted successfully"
    )
