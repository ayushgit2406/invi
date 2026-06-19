from sqlalchemy.orm import Session
from app.repositories.dashboard_repository import (
    get_dashboard_analytics,
    get_dashboard_stats,
    get_low_stock_products,
    get_recent_orders,
)

def fetch_dashboard_stats(db: Session):
    return get_dashboard_stats(db)


def fetch_dashboard_analytics(db: Session, days: int = 30):
    return get_dashboard_analytics(db, days)


def fetch_low_stock_products(db: Session, limit: int = 20):
    return get_low_stock_products(db, limit)


def fetch_recent_orders(db: Session, limit: int = 10):
    return get_recent_orders(db, limit)
