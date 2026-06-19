from pydantic import BaseModel
from app.core.enums import OrderStatus


class OrderStatusUpdate(BaseModel):
    status: OrderStatus