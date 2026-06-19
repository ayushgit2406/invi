from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.responses import success_response
from app.db.session import get_db
from app.schemas.common import ApiResponse
from app.schemas.dashboard import (
    DashboardAnalyticsResponse,
    DashboardStatsResponse,
    LowStockProductResponse,
)
from app.schemas.order import (
    RecentOrderResponse,
)
from app.services.dashboard_service import (
    fetch_dashboard_analytics,
    fetch_dashboard_stats,
    fetch_low_stock_products,
    fetch_recent_orders,
)

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)

@router.get(
    "/stats",
    response_model=ApiResponse[DashboardStatsResponse],
    summary="Get dashboard statistics",
    description="Retrieve key business metrics and statistics",
    responses={
        200: {"description": "Dashboard stats retrieved successfully"},
    }
)
def get_dashboard_stats_api(
    db: Session = Depends(get_db)
):
    """
    Get dashboard summary statistics.
    
    **Returns:**
    - total_products: Count of active products
    - total_customers: Count of active customers
    - total_orders: Count of all orders (any status)
    - total_revenue: Sum of all completed/fulfilled orders
    - pending_orders: Count of pending orders
    - low_stock_products_count: Number of products below low-stock threshold
    """
    return success_response(
        data=fetch_dashboard_stats(db),
        message="Dashboard stats retrieved successfully"
    )


@router.get(
    "/analytics",
    response_model=ApiResponse[DashboardAnalyticsResponse],
    summary="Get dashboard analytics",
    description="Retrieve chart-ready dashboard analytics over a fixed date range",
    responses={
        200: {"description": "Dashboard analytics retrieved successfully"},
    }
)
def get_dashboard_analytics_api(
    days: int = Query(30, ge=7, le=365, description="Number of days to include in the chart window"),
    db: Session = Depends(get_db)
):
    """
    Get chart-ready dashboard analytics.

    **Returns:**
    - Daily order counts and revenue
    - Order status breakdown
    - Date range for the selected window
    """
    return success_response(
        data=fetch_dashboard_analytics(db, days),
        message="Dashboard analytics retrieved successfully"
    )


@router.get(
    "/low-stock",
    response_model=ApiResponse[list[LowStockProductResponse]],
    summary="Get low stock products",
    description="Retrieve products below the low-stock threshold",
    responses={
        200: {"description": "Low stock products retrieved successfully"},
    }
)
def get_low_stock_products_api(
    limit: int = Query(20, ge=1, le=100, description="Maximum number of products to return"),
    db: Session = Depends(get_db)
):
    """
    Get products below the configured low-stock threshold.
    
    Useful for:
    - Alerting on reorder requirements
    - Inventory management dashboards
    - Purchase planning
    """
    return success_response(
        data=fetch_low_stock_products(db, limit),
        message="Low stock products retrieved successfully"
    )


@router.get(
    "/recent-orders",
    response_model=ApiResponse[list[RecentOrderResponse]],
    summary="Get recent orders",
    description="Retrieve most recent orders with summary information",
    responses={
        200: {"description": "Recent orders retrieved successfully"},
    }
)
def get_recent_orders_api(
    limit: int = Query(10, ge=1, le=50, description="Maximum number of orders to return"),
    db: Session = Depends(get_db)
):
    """
    Get most recent orders across all statuses.
    
    **Returns:** Recent orders with:
    - Customer information
    - Order status
    - Total amount
    - Item count
    - Created timestamp
    """
    return success_response(
        data=fetch_recent_orders(db, limit),
        message="Recent orders retrieved successfully"
    )
