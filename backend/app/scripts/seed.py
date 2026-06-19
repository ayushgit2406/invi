from decimal import Decimal
import logging

from app.db.session import SessionLocal
from app.models.customer import Customer
from app.models.product import Product
from app.schemas.order import OrderCreate, OrderItemCreate
from app.services.order_service import create_new_order

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed() -> None:
    """
    Seed the database with demo data.
    
    Creates:
    - 5 products with varying stock levels
    - 3 customers
    - 2 demo orders
    
    Only runs if database is empty.
    """
    db = SessionLocal()
    try:
        if db.query(Product).count() or db.query(Customer).count():
            logger.info("Seed skipped: products or customers already exist")
            return

        logger.info("Starting database seeding...")
        
        # Create products
        products = [
            Product(
                name="Wireless Mouse",
                description="Ergonomic wireless mouse with 2.4GHz receiver",
                sku="MOUSE-001",
                price=Decimal("799.00"),
                stock_quantity=25,
            ),
            Product(
                name="Mechanical Keyboard",
                description="Compact mechanical keyboard with RGB lighting",
                sku="KEYBOARD-001",
                price=Decimal("2499.00"),
                stock_quantity=12,
            ),
            Product(
                name="USB-C Hub",
                description="7-in-1 USB-C hub with HDMI and SD card reader",
                sku="HUB-001",
                price=Decimal("1499.00"),
                stock_quantity=8,
            ),
            Product(
                name="USB-C Cable",
                description="2-meter USB-C charging and data cable",
                sku="CABLE-001",
                price=Decimal("299.00"),
                stock_quantity=3,
            ),
            Product(
                name="Screen Protector",
                description="Tempered glass screen protector for 15-inch laptop",
                sku="PROTECT-001",
                price=Decimal("499.00"),
                stock_quantity=45,
            ),
        ]
        
        # Create customers
        customers = [
            Customer(
                full_name="Rajesh Kumar",
                email="rajesh.kumar@example.com",
                phone_number="+919876543210",
            ),
            Customer(
                full_name="Priya Sharma",
                email="priya.sharma@example.com",
                phone_number="+919876543211",
            ),
            Customer(
                full_name="Amit Patel",
                email="amit.patel@example.com",
                phone_number="+919876543212",
            ),
        ]

        db.add_all(products)
        db.add_all(customers)
        db.commit()

        # Refresh to get IDs
        for product in products:
            db.refresh(product)
        for customer in customers:
            db.refresh(customer)

        logger.info(f"Created {len(products)} products and {len(customers)} customers")

        # Create demo orders
        try:
            order1 = create_new_order(
                db,
                OrderCreate(
                    customer_id=customers[0].id,
                    items=[
                        OrderItemCreate(product_id=products[0].id, quantity=2),
                        OrderItemCreate(product_id=products[2].id, quantity=1),
                    ],
                ),
            )
            logger.info(f"Created order {order1.id} for {customers[0].full_name}")
        except Exception as e:
            logger.error(f"Failed to create order 1: {e}")

        try:
            order2 = create_new_order(
                db,
                OrderCreate(
                    customer_id=customers[1].id,
                    items=[
                        OrderItemCreate(product_id=products[1].id, quantity=1),
                        OrderItemCreate(product_id=products[3].id, quantity=5),
                        OrderItemCreate(product_id=products[4].id, quantity=2),
                    ],
                ),
            )
            logger.info(f"Created order {order2.id} for {customers[1].full_name}")
        except Exception as e:
            logger.error(f"Failed to create order 2: {e}")

        logger.info("✅ Seed completed successfully")
    except Exception as e:
        logger.error(f"Seed failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
