from datetime import datetime, UTC
from sqlalchemy import event
from app.models.product import Product
from app.models.customer import Customer
from app.models.order import Order, OrderItem
from app.models.inventory import InventoryMovement

def update_timestamp(mapper, connection, target):
    target.updated_at = datetime.now(UTC)

for model in [Product, Customer, Order, OrderItem, InventoryMovement]:
    event.listen(model, "before_update", update_timestamp)
