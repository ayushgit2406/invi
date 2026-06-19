from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.responses import paginated_response, success_response
from app.db.session import get_db
from app.schemas.common import ApiResponse, PaginatedData
from app.schemas.inventory import InventoryMovementResponse
from app.repositories.inventory_repository import get_all_inventory_movements

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"],
)


@router.get(
    "/movements",
    response_model=ApiResponse[PaginatedData[InventoryMovementResponse]],
    summary="List inventory movements",
    description="Retrieve audit trail of all inventory movements (stock in, orders, adjustments, cancellations)",
    responses={
        200: {"description": "Inventory movements retrieved successfully"},
    }
)
def get_inventory_movements_api(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    product_id: UUID | None = Query(None, description="Filter by product ID"),
    order_id: UUID | None = Query(None, description="Filter by order ID"),
    db: Session = Depends(get_db),
):
    """
    Get inventory movements with pagination and filtering.
    
    **Features:**
    - Complete audit trail of all inventory changes
    - Shows movement type: STOCK_IN, ORDER_PLACED, ORDER_CANCELLED, MANUAL_ADJUSTMENT
    - Tracks previous and new quantities for every change
    - Links to orders and products
    
    **Query parameters:**
    - page: Page number (default 1)
    - size: Items per page (default 20, max 100)
    - product_id: Filter movements for a specific product
    - order_id: Filter movements related to a specific order
    """
    items, total = get_all_inventory_movements(db, page, size, product_id, order_id)
    return paginated_response(
        items=items,
        total=total,
        page=page,
        size=size,
        message="Inventory movements retrieved successfully",
    )
