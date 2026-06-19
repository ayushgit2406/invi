from datetime import datetime, time, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.customer import Customer
from app.models.order import Order
from app.models.order import OrderItem
from app.core.config import settings
from app.core.enums import OrderStatus
from app.core.timezone import APP_TIMEZONE

IST = ZoneInfo(APP_TIMEZONE)

def get_dashboard_stats(db: Session) -> dict:
    total_products = db.query(Product).count()

    active_products = (
        db.query(Product)
        .filter(Product.is_active == True)
        .count()
    )

    total_customers = db.query(Customer).count()

    total_orders = db.query(Order).count()

    inventory_value = (
        db.query(
            func.sum(
                Product.price * Product.stock_quantity
            )
        )
        .scalar()
        or Decimal("0")
    )

    low_stock_products = (
        db.query(Product)
        .filter(Product.stock_quantity < settings.LOW_STOCK_THRESHOLD)
        .count()
    )

    return {
        "total_products": total_products,
        "active_products": active_products,
        "total_customers": total_customers,
        "total_orders": total_orders,
        "inventory_value": inventory_value,
        "low_stock_products": low_stock_products,
    }


def get_low_stock_products(db: Session, limit: int = 20):
    return (
        db.query(Product)
        .filter(Product.stock_quantity < settings.LOW_STOCK_THRESHOLD)
        .order_by(Product.stock_quantity.asc(), Product.name.asc())
        .limit(limit)
        .all()
    )


def get_recent_orders(db: Session, limit: int = 10):
    rows = (
        db.query(
            Order.id,
            Order.customer_id,
            Customer.full_name.label("customer_name"),
            Order.total_amount,
            Order.status,
            func.count(OrderItem.id).label("item_count"),
            Order.created_at,
        )
        .join(Customer, Customer.id == Order.customer_id)
        .join(OrderItem, OrderItem.order_id == Order.id)
        .group_by(Order.id, Customer.full_name, Order.created_at)
        .order_by(Order.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": row.id,
            "customer_id": row.customer_id,
            "customer_name": row.customer_name,
            "total_amount": row.total_amount,
            "status": row.status,
            "item_count": row.item_count,
            "created_at": row.created_at,
        }
        for row in rows
    ]


def get_dashboard_analytics(db: Session, days: int = 30) -> dict:
    end_date = datetime.now(IST).date()
    start_date = end_date - timedelta(days=days - 1)

    start_utc = datetime.combine(start_date, time.min, tzinfo=IST).astimezone(
        timezone.utc,
    )
    end_utc = datetime.combine(end_date, time.max, tzinfo=IST).astimezone(
        timezone.utc,
    )

    daily_totals = {
        start_date + timedelta(days=offset): {
            "date": start_date + timedelta(days=offset),
            "orders": 0,
            "revenue": Decimal("0"),
        }
        for offset in range(days)
    }
    status_totals = {status.value: 0 for status in OrderStatus}

    rows = (
        db.query(Order.created_at, Order.total_amount, Order.status)
        .filter(Order.created_at >= start_utc)
        .filter(Order.created_at <= end_utc)
        .order_by(Order.created_at.asc())
        .all()
    )

    total_orders = 0
    total_revenue = Decimal("0")

    for created_at, total_amount, status in rows:
        local_created_at = created_at
        if local_created_at.tzinfo is None:
            local_created_at = local_created_at.replace(tzinfo=timezone.utc)
        local_date = local_created_at.astimezone(IST).date()

        if local_date in daily_totals:
            daily_totals[local_date]["orders"] += 1
            daily_totals[local_date]["revenue"] += total_amount

        status_key = status.value if hasattr(status, "value") else str(status)
        if status_key in status_totals:
            status_totals[status_key] += 1
        else:
            status_totals[status_key] = 1

        total_orders += 1
        total_revenue += total_amount

    return {
        "range_start": start_date,
        "range_end": end_date,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "daily_orders": list(daily_totals.values()),
        "status_breakdown": [
            {"status": status.value, "count": status_totals.get(status.value, 0)}
            for status in OrderStatus
        ],
    }
