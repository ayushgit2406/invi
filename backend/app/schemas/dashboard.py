from datetime import date
from decimal import Decimal
from pydantic import BaseModel
from uuid import UUID

class DashboardStatsResponse(BaseModel):
    total_products: int
    active_products: int
    total_customers: int
    total_orders: int
    inventory_value: Decimal
    low_stock_products: int


class DashboardDailyOrdersResponse(BaseModel):
    date: date
    orders: int
    revenue: Decimal


class DashboardStatusBreakdownResponse(BaseModel):
    status: str
    count: int


class DashboardAnalyticsResponse(BaseModel):
    range_start: date
    range_end: date
    total_orders: int
    total_revenue: Decimal
    daily_orders: list[DashboardDailyOrdersResponse]
    status_breakdown: list[DashboardStatusBreakdownResponse]


class LowStockProductResponse(BaseModel):
    id: UUID
    name: str
    sku: str
    stock_quantity: int
