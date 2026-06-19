from uuid import UUID
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.enums import OrderStatus
from app.core.responses import paginated_response, success_response
from app.db.session import get_db
from app.schemas.common import ApiResponse, DeleteResponse, PaginatedData
from app.schemas.order import (
    OrderCreate,
    OrderResponse,
)
from app.schemas.order_status import (
    OrderStatusUpdate,
)
from app.services.order_service import (
    cancel_order,
    create_new_order,
    fetch_all_orders,
    fetch_order_by_id,
    update_order_status,
)

router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
)


@router.post(
    "/",
    response_model=ApiResponse[OrderResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new order",
    description="Create a new order with items and automatic stock deduction",
    responses={
        201: {"description": "Order created successfully"},
        404: {"description": "Customer or product not found"},
        409: {"description": "Insufficient stock for a product"},
    }
)
def create_order_api(
    order: OrderCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new order.
    
    **Features:**
    - Automatic stock deduction from inventory
    - Atomic transaction (all or nothing)
    - Idempotency support: provide idempotency_key to handle retries safely
    - Inventory audit trail created automatically
    
    **Parameters:**
    - customer_id: UUID of existing customer
    - items: List of product IDs with quantities (at least 1 item required)
    - idempotency_key: (Optional) UUID/string for idempotent requests
    
    **Returns:** Order with total amount calculated from product prices
    """
    return success_response(
        data=create_new_order(
            db,
            order
        ),
        message="Order created successfully"
    )


@router.get(
    "/",
    response_model=ApiResponse[PaginatedData[OrderResponse]],
    summary="List all orders",
    description="Retrieve paginated list of orders with optional filtering",
    responses={
        200: {"description": "Orders retrieved successfully"},
    }
)
def get_orders_api(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    size: int = Query(10, ge=1, le=100, description="Items per page"),
    search: str | None = Query(None, description="Search by order ID"),
    status_filter: OrderStatus | None = Query(None, alias="status", description="Filter by order status"),
    customer_id: UUID | None = Query(None, description="Filter by customer ID"),
    created_from: date | None = Query(None, alias="created_from", description="Filter orders created on or after this date"),
    created_to: date | None = Query(None, alias="created_to", description="Filter orders created on or before this date"),
    sort_by: Literal["id", "customer_id", "total_amount", "status", "created_at", "updated_at"] = Query(
        "created_at",
        description="Sort field",
    ),
    sort_order: Literal["asc", "desc"] = Query("desc", description="Sort direction"),
    db: Session = Depends(get_db),
):
    """
    Get all orders with pagination and filtering.
    
    **Query parameters:**
    - page: Page number (default 1)
    - size: Items per page (default 10, max 100)
    - status: Filter by order status (PENDING, CONFIRMED, PROCESSING, SHIPPED, FULFILLED, CANCELLED, etc.)
    - customer_id: Filter orders by customer
    """
    items, total = fetch_all_orders(
        db,
        page,
        size,
        search,
        status_filter,
        customer_id,
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
        message="Orders retrieved successfully",
    )


@router.get(
    "/{order_id}",
    response_model=ApiResponse[OrderResponse],
    summary="Get order by ID",
    description="Retrieve detailed information about a specific order",
    responses={
        200: {"description": "Order retrieved successfully"},
        404: {"description": "Order not found"},
    }
)
def get_order_by_id_api(
    order_id: UUID,
    db: Session = Depends(get_db),
):
    """Get a specific order by ID including all items and status."""
    return success_response(
        data=fetch_order_by_id(
            db,
            order_id
        ),
        message="Order retrieved successfully"
    )


@router.patch(
    "/{order_id}/status",
    response_model=ApiResponse[OrderResponse],
    summary="Update order status",
    description="Update order status (e.g., PENDING -> CONFIRMED -> FULFILLED or CANCELLED)",
    responses={
        200: {"description": "Order status updated successfully"},
        404: {"description": "Order not found"},
        400: {"description": "Invalid status transition"},
    }
)
def update_order_status_api(
    order_id: UUID,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Update order status with business logic validation.
    
    **Status transitions:**
    - PENDING -> CONFIRMED/PROCESSING/CANCELLED
    - CONFIRMED -> PROCESSING/SHIPPED/CANCELLED
    - PROCESSING -> SHIPPED/CANCELLED
    - SHIPPED -> FULFILLED
    - FULFILLED or CANCELLED -> No further transitions allowed
    
    **Important:** Transitioning to CANCELLED automatically restores inventory.
    """
    return success_response(
        data=update_order_status(
            db,
            order_id,
            payload.status
        ),
        message="Order status updated successfully"
    )


@router.delete(
    "/{order_id}",
    response_model=ApiResponse[DeleteResponse],
    summary="Cancel order",
    description="Cancel an order and restore inventory",
    responses={
        200: {"description": "Order cancelled successfully"},
        404: {"description": "Order not found"},
        400: {"description": "Order is already cancelled"},
    }
)
def delete_order_api(
    order_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Cancel an order (convenience endpoint for DELETE).
    
    **Effects:**
    - Sets order status to CANCELLED
    - Restores all inventory quantities
    - Creates inventory audit trail records
    """
    cancel_order(
        db,
        order_id
    )
    return success_response(
        data={"deleted": True},
        message="Order cancelled successfully"
    )
