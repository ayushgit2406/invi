from decimal import Decimal
from uuid import uuid4
from faker import Faker
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.customer import Customer
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.models.inventory import InventoryMovement
from app.core.enums import OrderStatus, InventoryMovementType


fake = Faker()


def seed():
    db: Session = SessionLocal()

    try:
        db.query(InventoryMovement).delete()
        db.query(OrderItem).delete()
        db.query(Order).delete()
        db.query(Product).delete()
        db.query(Customer).delete()

        customers = []
        products = []
        orders = []

        for i in range(50):
            customers.append(
                Customer(
                    id=uuid4(),
                    full_name=fake.name(),
                    email=fake.unique.email(),
                    phone_number=fake.msisdn()[:12],
                )
            )

        db.add_all(customers)
        db.flush()

        for i in range(50):
            products.append(
                Product(
                    id=uuid4(),
                    name=fake.unique.word().title() + f" {i}",
                    description=fake.sentence(),
                    sku=f"SKU-{i:05d}",
                    price=Decimal(str(round(fake.random_number(digits=4) + 100, 2))),
                    stock_quantity=fake.random_int(min=10, max=100),
                    is_active=True,
                )
            )

        db.add_all(products)
        db.flush()

        for i in range(50):
            customer = fake.random_element(customers)

            order = Order(
                id=uuid4(),
                customer_id=customer.id,
                total_amount=Decimal("0.00"),
                status=fake.random_element(
                    [
                        OrderStatus.PENDING,
                        OrderStatus.CONFIRMED,
                        OrderStatus.SHIPPED,
                        OrderStatus.DELIVERED,
                    ]
                ),
                idempotency_key=str(uuid4()),
            )

            db.add(order)
            db.flush()

            item_count = fake.random_int(min=1, max=3)
            chosen_products = fake.random_elements(products, length=item_count, unique=True)

            total = Decimal("0.00")
            items = []

            for p in chosen_products:
                qty = fake.random_int(min=1, max=3)

                items.append(
                    OrderItem(
                        id=uuid4(),
                        order_id=order.id,
                        product_id=p.id,
                        quantity=qty,
                        price=p.price,
                    )
                )

                total += Decimal(p.price) * qty

                old_qty = p.stock_quantity
                new_qty = old_qty - qty
                p.stock_quantity = new_qty

                db.add(
                    InventoryMovement(
                        id=uuid4(),
                        product_id=p.id,
                        order_id=order.id,
                        movement_type=InventoryMovementType.STOCK_OUT,
                        quantity_change=-qty,
                        previous_quantity=old_qty,
                        new_quantity=new_qty,
                        reason="ORDER_PLACED",
                    )
                )

            order.total_amount = total
            order.items = items
            orders.append(order)

        db.add_all(orders)

        db.commit()
        print("Seed completed: 50 customers, 50 products, 50 orders")

    except Exception as e:
        db.rollback()
        print("Seed failed:", str(e))

    finally:
        db.close()


if __name__ == "__main__":
    seed()