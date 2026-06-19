from uuid import UUID
from datetime import date
from typing import Literal

from fastapi import (
    APIRouter,
    Depends,
    Query,
    status,
)
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.responses import paginated_response, success_response
from app.schemas.common import ApiResponse, DeleteResponse, PaginatedData
from app.schemas.inventory import StockAdjustment
from app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)
from app.services.product_service import (
    create_new_product,
    adjust_product_stock,
    fetch_all_products,
    fetch_product_by_id,
    remove_product,
    update_existing_product,
)

router = APIRouter(
    prefix="/products",
    tags=["Products"]
)


@router.post(
    "/",
    response_model=ApiResponse[ProductResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new product",
    description="Create a new product with unique SKU. Stock quantity starts at the specified value.",
    responses={
        201: {"description": "Product created successfully"},
        409: {"description": "Product with this SKU already exists"},
        422: {"description": "Validation error - check price > 0, stock >= 0"},
    }
)
def create_product_api(
    product: ProductCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new product.
    
    **Required fields:**
    - name: Product name (1-255 chars)
    - sku: Unique product code, normalized to uppercase (1-100 chars)
    - price: Price must be > 0
    - stock_quantity: Initial stock (>= 0, defaults to 0)
    """
    return success_response(
        data=create_new_product(
            db,
            product
        ),
        message="Product created successfully"
    )


@router.get(
    "/",
    response_model=ApiResponse[PaginatedData[ProductResponse]],
    summary="List all products",
    description="Retrieve paginated list of products with optional search and filtering",
    responses={
        200: {"description": "Products retrieved successfully"},
    }
)
def get_products_api(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    size: int = Query(10, ge=1, le=100, description="Items per page"),
    search: str | None = Query(None, description="Search by product name or SKU"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    low_stock: bool = Query(False, description="Show only low stock products (< threshold)"),
    created_from: date | None = Query(None, alias="created_from", description="Filter products created on or after this date"),
    created_to: date | None = Query(None, alias="created_to", description="Filter products created on or before this date"),
    sort_by: Literal["name", "sku", "price", "stock_quantity", "created_at", "updated_at"] = Query(
        "created_at",
        description="Sort field",
    ),
    sort_order: Literal["asc", "desc"] = Query("desc", description="Sort direction"),
    db: Session = Depends(get_db),
):
    """
    Get all products with pagination, search, and filtering.
    
    **Query parameters:**
    - page: Page number (default 1)
    - size: Items per page (default 10, max 100)
    - search: Search products by name or SKU
    - is_active: Filter by active/inactive status
    - low_stock: Show only products below low-stock threshold
    """
    items, total = fetch_all_products(
        db,
        page,
        size,
        search,
        is_active,
        low_stock,
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
        message="Products retrieved successfully",
    )


@router.get(
    "/{product_id}",
    response_model=ApiResponse[ProductResponse],
    summary="Get product by ID",
    description="Retrieve detailed information about a specific product",
    responses={
        200: {"description": "Product retrieved successfully"},
        404: {"description": "Product not found"},
    }
)
def get_product_api(
    product_id: UUID,
    db: Session = Depends(get_db),
):
    """Get a specific product by ID."""
    return success_response(
        data=fetch_product_by_id(
            db,
            product_id
        ),
        message="Product retrieved successfully"
    )


@router.put(
    "/{product_id}",
    response_model=ApiResponse[ProductResponse],
    summary="Update product",
    description="Update product details (name, description, SKU, price, stock quantity, active status)",
    responses={
        200: {"description": "Product updated successfully"},
        404: {"description": "Product not found"},
        409: {"description": "SKU already exists for another product"},
    }
)
def update_product_api(
    product_id: UUID,
    product: ProductUpdate,
    db: Session = Depends(get_db),
):
    """
    Update product information.
    
    **Note:** For stock adjustments, use PATCH /products/{id}/stock instead.
    All fields are optional - only provided fields will be updated.
    """
    return success_response(
        data=update_existing_product(
            db,
            product_id,
            product,
        ),
        message="Product updated successfully"
    )


@router.patch(
    "/{product_id}/stock",
    response_model=ApiResponse[ProductResponse],
    summary="Adjust product stock",
    description="Add or remove stock from a product with audit trail",
    responses={
        200: {"description": "Product stock adjusted successfully"},
        404: {"description": "Product not found"},
        400: {"description": "Invalid stock adjustment"},
    }
)
def adjust_product_stock_api(
    product_id: UUID,
    payload: StockAdjustment,
    db: Session = Depends(get_db),
):
    """
    Adjust product stock quantity.
    
    **Parameters:**
    - quantity_change: Positive to add stock, negative to remove stock
    - reason: Optional reason for the adjustment (audit trail)
    
    This creates an inventory movement record for tracking.
    """
    return success_response(
        data=adjust_product_stock(
            db,
            product_id,
            payload,
        ),
        message="Product stock adjusted successfully"
    )


@router.delete(
    "/{product_id}",
    response_model=ApiResponse[DeleteResponse],
    summary="Delete product",
    description="Soft delete a product (record remains in database with deleted_at timestamp)",
    responses={
        200: {"description": "Product deleted successfully"},
        404: {"description": "Product not found"},
    }
)
def delete_product_api(
    product_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Delete a product (soft delete).
    
    **Note:** This is a soft delete - the product record is preserved with a deleted_at timestamp
    for audit trail purposes. Deleted products won't appear in product listings.
    """
    remove_product(
        db,
        product_id
    )
    return success_response(
        data={"deleted": True},
        message="Product deleted successfully"
    )
