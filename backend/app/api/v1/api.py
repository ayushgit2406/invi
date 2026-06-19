from fastapi import APIRouter
from app.api.v1.routers.health import (
    router as health_router,
    ready_router,
)
from app.api.v1.routers.products import (
    router as product_router
)
from app.api.v1.routers.customers import (
    router as customer_router
)
from app.api.v1.routers.orders import (
    router as order_router
)
from app.api.v1.routers.dashboard import (
    router as dashboard_router
)
from app.api.v1.routers.inventory import (
    router as inventory_router
)

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(ready_router)
api_router.include_router(product_router)
api_router.include_router(customer_router)
api_router.include_router(order_router)
api_router.include_router(dashboard_router)
api_router.include_router(inventory_router)
