import pytest
from decimal import Decimal
from datetime import datetime, time, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.db.session import get_db
from app.main import app
from app.models.customer import Customer
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.core.enums import OrderStatus, InventoryMovementType
from app.models.inventory import InventoryMovement

DATABASE_URL = "sqlite://"
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def reset_database():
    """Ensure each test starts with a clean SQLite schema."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def db():
    """Fixture providing test database session"""
    db_session = TestingSessionLocal()
    yield db_session
    db_session.close()


@pytest.fixture
def sample_product(db: Session) -> Product:
    """Fixture providing a sample product"""
    product = Product(
        name="Test Product",
        sku="TEST-SKU-001",
        price=Decimal("100.00"),
        stock_quantity=50,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@pytest.fixture
def sample_customer(db: Session) -> Customer:
    """Fixture providing a sample customer"""
    customer = Customer(
        full_name="Test Customer",
        email="test@example.com",
        phone_number="+1234567890",
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@pytest.fixture
def low_stock_product(db: Session) -> Product:
    """Fixture providing a low-stock product"""
    product = Product(
        name="Low Stock Product",
        sku="LOW-STOCK-001",
        price=Decimal("50.00"),
        stock_quantity=3,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def create_product_with_created_at(
    db: Session,
    *,
    name: str,
    sku: str,
    created_at: datetime,
) -> Product:
    product = Product(
        name=name,
        sku=sku,
        price=Decimal("25.00"),
        stock_quantity=10,
        created_at=created_at,
        updated_at=created_at,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def create_customer_with_created_at(
    db: Session,
    *,
    full_name: str,
    email: str,
    created_at: datetime,
) -> Customer:
    customer = Customer(
        full_name=full_name,
        email=email,
        phone_number="+1234567890",
        created_at=created_at,
        updated_at=created_at,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def create_order_with_created_at(
    db: Session,
    *,
    customer: Customer,
    product: Product,
    created_at: datetime,
    status: OrderStatus = OrderStatus.PENDING,
    total_amount: Decimal = Decimal("25.00"),
) -> Order:
    order = Order(
        customer_id=customer.id,
        total_amount=total_amount,
        status=status,
        created_at=created_at,
        updated_at=created_at,
        items=[
            OrderItem(
                product_id=product.id,
                quantity=1,
                price=total_amount,
                created_at=created_at,
                updated_at=created_at,
            )
        ],
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


class TestProductAPIs:
    """Test Product CRUD operations"""

    def test_create_product_success(self):
        """Test successful product creation"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.post(
            "/api/v1/products/",
            json={
                "name": "New Product",
                "sku": "NEW-SKU-001",
                "price": 199.99,
                "stock_quantity": 100,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["data"]["name"] == "New Product"
        assert data["data"]["sku"] == "NEW-SKU-001"

    def test_create_product_duplicate_sku(self, db: Session):
        """Test that duplicate SKU is rejected"""
        from fastapi.testclient import TestClient
        
        product = Product(
            name="Existing",
            sku="DUP-SKU",
            price=Decimal("100.00"),
            stock_quantity=10,
        )
        db.add(product)
        db.commit()

        client = TestClient(app)
        response = client.post(
            "/api/v1/products/",
            json={
                "name": "Duplicate",
                "sku": "DUP-SKU",
                "price": 200.00,
                "stock_quantity": 20,
            },
        )
        assert response.status_code == 409
        assert "already exists" in response.json()["message"]

    def test_create_product_invalid_price(self):
        """Test that negative price is rejected"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.post(
            "/api/v1/products/",
            json={
                "name": "Invalid",
                "sku": "INVALID-SKU",
                "price": -100.00,
                "stock_quantity": 10,
            },
        )
        assert response.status_code == 422

    def test_get_products_list(self, sample_product: Product):
        """Test retrieving products list"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.get("/api/v1/products/")
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["total"] >= 1

    def test_get_products_with_search(self, sample_product: Product):
        """Test product search functionality"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.get("/api/v1/products/?search=Test")
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["total"] >= 1

    def test_get_products_with_created_date_filter(self, db: Session):
        """Test product created_at date filtering"""
        from fastapi.testclient import TestClient

        create_product_with_created_at(
            db,
            name="Old Product",
            sku="OLD-PROD",
            created_at=datetime(2025, 1, 10, 9, 0, 0),
        )
        create_product_with_created_at(
            db,
            name="New Widget",
            sku="NEW-PROD",
            created_at=datetime(2025, 1, 12, 23, 59, 59),
        )

        client = TestClient(app)
        response = client.get("/api/v1/products/?search=Widget&created_from=2025-01-12")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total"] == 1
        assert data["items"][0]["name"] == "New Widget"

        response = client.get("/api/v1/products/?created_from=2025-01-01&created_to=2025-01-11")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total"] == 1
        assert data["items"][0]["name"] == "Old Product"

    def test_get_products_with_ist_boundary(self, db: Session):
        """Test that UTC timestamps are filtered using Asia/Kolkata day boundaries"""
        from fastapi.testclient import TestClient

        create_product_with_created_at(
            db,
            name="IST Boundary Product",
            sku="IST-PROD",
            created_at=datetime(2026, 6, 18, 18, 37, 4, tzinfo=timezone.utc),
        )

        client = TestClient(app)
        response = client.get("/api/v1/products/?created_from=2026-06-19&created_to=2026-06-19")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total"] == 1
        assert data["items"][0]["name"] == "IST Boundary Product"

        response = client.get("/api/v1/products/?created_from=2026-06-18&created_to=2026-06-18")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total"] == 0

    def test_get_product_by_id(self, sample_product: Product):
        """Test retrieving product by ID"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.get(f"/api/v1/products/{sample_product.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["id"] == str(sample_product.id)

    def test_update_product(self, sample_product: Product):
        """Test product update"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.put(
            f"/api/v1/products/{sample_product.id}",
            json={"name": "Updated Product"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["name"] == "Updated Product"

    def test_adjust_stock(self, sample_product: Product):
        """Test stock adjustment"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.patch(
            f"/api/v1/products/{sample_product.id}/stock",
            json={"quantity_change": 10, "reason": "Restock"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["stock_quantity"] == 60

    def test_delete_product_soft_delete(self, sample_product: Product):
        """Test product soft delete"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.delete(f"/api/v1/products/{sample_product.id}")
        assert response.status_code == 200
        
        # Verify product is soft-deleted (should not appear in list)
        response = client.get(f"/api/v1/products/{sample_product.id}")
        assert response.status_code == 404


class TestCustomerAPIs:
    """Test Customer CRUD operations"""

    def test_create_customer_success(self):
        """Test successful customer creation"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.post(
            "/api/v1/customers/",
            json={
                "full_name": "New Customer",
                "email": "new@example.com",
                "phone_number": "+1234567890",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["data"]["full_name"] == "New Customer"

    def test_create_customer_duplicate_email(self, db: Session):
        """Test that duplicate email is rejected"""
        from fastapi.testclient import TestClient
        
        customer = Customer(
            full_name="Existing",
            email="dup@example.com",
            phone_number="+1111111111",
        )
        db.add(customer)
        db.commit()

        client = TestClient(app)
        response = client.post(
            "/api/v1/customers/",
            json={
                "full_name": "Duplicate",
                "email": "dup@example.com",
                "phone_number": "+2222222222",
            },
        )
        assert response.status_code == 409

    def test_get_customers_list(self, sample_customer: Customer):
        """Test retrieving customers list"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.get("/api/v1/customers/")
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["total"] >= 1

    def test_get_customers_with_created_date_filter(self, db: Session):
        """Test customer created_at date filtering"""
        from fastapi.testclient import TestClient

        create_customer_with_created_at(
            db,
            full_name="Old Customer",
            email="old@example.com",
            created_at=datetime(2025, 2, 1, 10, 0, 0),
        )
        create_customer_with_created_at(
            db,
            full_name="New Customer",
            email="newer@example.com",
            created_at=datetime(2025, 2, 10, 23, 59, 59),
        )

        client = TestClient(app)
        response = client.get("/api/v1/customers/?search=New&created_from=2025-02-10")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total"] == 1
        assert data["items"][0]["full_name"] == "New Customer"

        response = client.get("/api/v1/customers/?created_to=2025-02-09")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total"] == 1
        assert data["items"][0]["full_name"] == "Old Customer"

    def test_get_customer_by_id(self, sample_customer: Customer):
        """Test retrieving customer by ID"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.get(f"/api/v1/customers/{sample_customer.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["id"] == str(sample_customer.id)


class TestOrderAPIs:
    """Test Order operations"""

    def test_create_order_success(self, sample_customer: Customer, sample_product: Product):
        """Test successful order creation"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.post(
            "/api/v1/orders/",
            json={
                "customer_id": str(sample_customer.id),
                "items": [
                    {"product_id": str(sample_product.id), "quantity": 2}
                ],
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["data"]["status"] == "PENDING"
        assert data["data"]["total_amount"] == "200.00"

    def test_create_order_insufficient_stock(self, db: Session, sample_customer: Customer):
        """Test that order fails with insufficient stock"""
        from fastapi.testclient import TestClient
        
        product = Product(
            name="Low Stock",
            sku="LOW-001",
            price=Decimal("50.00"),
            stock_quantity=2,
        )
        db.add(product)
        db.commit()
        db.refresh(product)

        client = TestClient(app)
        response = client.post(
            "/api/v1/orders/",
            json={
                "customer_id": str(sample_customer.id),
                "items": [
                    {"product_id": str(product.id), "quantity": 5}  # More than available
                ],
            },
        )
        assert response.status_code == 409
        assert "Insufficient stock" in response.json()["message"]

    def test_order_deducts_stock(self, db: Session, sample_customer: Customer, sample_product: Product):
        """Test that creating order deducts stock"""
        from fastapi.testclient import TestClient
        
        initial_stock = sample_product.stock_quantity
        
        client = TestClient(app)
        response = client.post(
            "/api/v1/orders/",
            json={
                "customer_id": str(sample_customer.id),
                "items": [
                    {"product_id": str(sample_product.id), "quantity": 5}
                ],
            },
        )
        assert response.status_code == 201

        # Verify stock was deducted
        db.refresh(sample_product)
        assert sample_product.stock_quantity == initial_stock - 5

    def test_cancel_order_restores_stock(self, db: Session, sample_customer: Customer, sample_product: Product):
        """Test that cancelling order restores stock"""
        from fastapi.testclient import TestClient
        
        # Create order
        client = TestClient(app)
        response = client.post(
            "/api/v1/orders/",
            json={
                "customer_id": str(sample_customer.id),
                "items": [
                    {"product_id": str(sample_product.id), "quantity": 5}
                ],
            },
        )
        assert response.status_code == 201
        order_id = response.json()["data"]["id"]

        db.refresh(sample_product)
        stock_after_order = sample_product.stock_quantity

        # Cancel order
        response = client.delete(f"/api/v1/orders/{order_id}")
        assert response.status_code == 200

        # Verify stock was restored
        db.refresh(sample_product)
        assert sample_product.stock_quantity == stock_after_order + 5

    def test_get_orders_list(self, sample_customer: Customer, sample_product: Product):
        """Test retrieving orders list"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        # Create an order first
        client.post(
            "/api/v1/orders/",
            json={
                "customer_id": str(sample_customer.id),
                "items": [
                    {"product_id": str(sample_product.id), "quantity": 1}
                ],
            },
        )

        response = client.get("/api/v1/orders/")
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["total"] >= 1

    def test_get_orders_with_id_search(self, sample_customer: Customer, sample_product: Product):
        """Test order id search functionality"""
        from fastapi.testclient import TestClient

        client = TestClient(app)
        create_response = client.post(
            "/api/v1/orders/",
            json={
                "customer_id": str(sample_customer.id),
                "items": [
                    {"product_id": str(sample_product.id), "quantity": 1}
                ],
            },
        )
        assert create_response.status_code == 201
        order_id = create_response.json()["data"]["id"]

        response = client.get(f"/api/v1/orders/?search={order_id[:8]}")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total"] >= 1
        assert any(item["id"] == order_id for item in data["items"])

    def test_get_orders_with_created_date_filter(self, db: Session):
        """Test order created_at date filtering"""
        from fastapi.testclient import TestClient

        customer = create_customer_with_created_at(
            db,
            full_name="Order Customer",
            email="orders@example.com",
            created_at=datetime(2025, 3, 1, 10, 0, 0),
        )
        product = create_product_with_created_at(
            db,
            name="Order Product",
            sku="ORDER-PROD",
            created_at=datetime(2025, 3, 1, 10, 0, 0),
        )

        create_order_with_created_at(
            db,
            customer=customer,
            product=product,
            created_at=datetime(2025, 3, 5, 14, 0, 0),
        )
        create_order_with_created_at(
            db,
            customer=customer,
            product=product,
            created_at=datetime(2025, 3, 20, 14, 0, 0),
        )
        late_order = create_order_with_created_at(
            db,
            customer=customer,
            product=product,
            created_at=datetime(2025, 3, 10, 18, 29, 59),
        )
        late_order.status = OrderStatus.CANCELLED
        db.commit()

        client = TestClient(app)
        response = client.get("/api/v1/orders/?created_from=2025-03-10")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total"] == 2

        response = client.get("/api/v1/orders/?status=CANCELLED&created_from=2025-03-10&created_to=2025-03-10")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total"] == 1
        assert data["items"][0]["status"] == "CANCELLED"

    def test_get_orders_date_filter_pagination(self, db: Session):
        """Test date filtering still paginates correctly"""
        from fastapi.testclient import TestClient

        customer = create_customer_with_created_at(
            db,
            full_name="Paged Customer",
            email="paged@example.com",
            created_at=datetime(2025, 4, 1, 10, 0, 0),
        )
        product = create_product_with_created_at(
            db,
            name="Paged Product",
            sku="PAGED-PROD",
            created_at=datetime(2025, 4, 1, 10, 0, 0),
        )

        for day in range(1, 5):
            create_order_with_created_at(
                db,
                customer=customer,
                product=product,
                created_at=datetime(2025, 4, day, 10, 0, 0),
            )

        client = TestClient(app)
        response = client.get("/api/v1/orders/?created_from=2025-04-01&created_to=2025-04-30&size=2")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total"] == 4
        assert data["pages"] == 2
        assert len(data["items"]) == 2


class TestInventoryMovements:
    """Test inventory tracking"""

    def test_inventory_movement_created_on_order(self, db: Session, sample_customer: Customer, sample_product: Product):
        """Test that inventory movement is created when order is placed"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.post(
            "/api/v1/orders/",
            json={
                "customer_id": str(sample_customer.id),
                "items": [
                    {"product_id": str(sample_product.id), "quantity": 5}
                ],
            },
        )
        assert response.status_code == 201

        # Verify inventory movement exists
        movement = db.query(InventoryMovement).filter(
            InventoryMovement.movement_type == InventoryMovementType.ORDER_PLACED
        ).first()
        assert movement is not None
        assert movement.quantity_change == -5

    def test_inventory_movement_on_cancel(self, db: Session, sample_customer: Customer, sample_product: Product):
        """Test that inventory movement is created when order is cancelled"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        
        # Create order
        response = client.post(
            "/api/v1/orders/",
            json={
                "customer_id": str(sample_customer.id),
                "items": [
                    {"product_id": str(sample_product.id), "quantity": 3}
                ],
            },
        )
        order_id = response.json()["data"]["id"]

        # Cancel order
        client.delete(f"/api/v1/orders/{order_id}")

        # Verify cancellation movement exists
        movement = db.query(InventoryMovement).filter(
            InventoryMovement.movement_type == InventoryMovementType.ORDER_CANCELLED
        ).first()
        assert movement is not None
        assert movement.quantity_change == 3  # Positive change (restoring stock)


class TestDashboard:
    """Test Dashboard endpoints"""

    def test_dashboard_stats(self, sample_customer: Customer, sample_product: Product):
        """Test dashboard stats endpoint"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.get("/api/v1/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_products" in data["data"]
        assert "total_customers" in data["data"]
        assert "total_orders" in data["data"]

    def test_low_stock_products(self, low_stock_product: Product):
        """Test low stock products endpoint"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.get("/api/v1/dashboard/low-stock")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["data"], list)

    def test_dashboard_analytics(
        self,
        db: Session,
        sample_customer: Customer,
        sample_product: Product,
    ):
        """Test dashboard analytics endpoint"""
        from fastapi.testclient import TestClient

        anchor_date = (datetime.now(timezone.utc) - timedelta(days=1)).date()
        before_ist_midnight = datetime.combine(
            anchor_date,
            time(18, 29),
            tzinfo=timezone.utc,
        )
        after_ist_midnight = datetime.combine(
            anchor_date,
            time(18, 31),
            tzinfo=timezone.utc,
        )

        create_order_with_created_at(
            db,
            customer=sample_customer,
            product=sample_product,
            created_at=before_ist_midnight,
            status=OrderStatus.PENDING,
            total_amount=Decimal("25.00"),
        )
        create_order_with_created_at(
            db,
            customer=sample_customer,
            product=sample_product,
            created_at=after_ist_midnight,
            status=OrderStatus.FULFILLED,
            total_amount=Decimal("75.00"),
        )

        client = TestClient(app)
        response = client.get("/api/v1/dashboard/analytics?days=7")
        assert response.status_code == 200

        data = response.json()["data"]
        assert data["total_orders"] == 2
        assert data["total_revenue"] == "100.00"

        daily_by_date = {row["date"]: row for row in data["daily_orders"]}
        assert daily_by_date[anchor_date.isoformat()]["orders"] == 1
        assert daily_by_date[(anchor_date + timedelta(days=1)).isoformat()]["orders"] == 1

        breakdown = {row["status"]: row["count"] for row in data["status_breakdown"]}
        assert breakdown["PENDING"] == 1
        assert breakdown["FULFILLED"] == 1


class TestHealthChecks:
    """Test health check endpoints"""

    def test_health_check(self):
        """Test health check endpoint"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.get("/api/v1/health/")
        assert response.status_code == 200
        assert response.json()["data"]["status"] == "healthy"

    def test_readiness_check(self):
        """Test readiness check endpoint"""
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.get("/api/v1/ready/")
        assert response.status_code == 200
        assert response.json()["data"]["status"] == "ready"


class TestMaintenanceEndpoints:
    """Test maintenance seed/reset endpoints"""

    def test_seed_demo_data(self, db: Session):
        from fastapi.testclient import TestClient

        client = TestClient(app)
        response = client.post("/api/v1/maintenance/seed")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["status"] == "seeded"
        assert data["products_created"] == 25
        assert data["customers_created"] == 20
        assert data["orders_created"] == 20

        assert db.query(Product).count() == 25
        assert db.query(Customer).count() == 20
        assert db.query(Order).count() == 20
        assert db.query(InventoryMovement).count() >= 20

    def test_reset_inventory_endpoint(self, db: Session):
        from fastapi.testclient import TestClient

        client = TestClient(app)
        client.post("/api/v1/maintenance/seed")

        response = client.delete("/api/v1/maintenance/reset/inventory")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["target"] == "inventory"
        assert db.query(InventoryMovement).count() == 0
        assert db.query(Product).count() == 25
        assert db.query(Customer).count() == 20
        assert db.query(Order).count() == 20

    def test_reset_orders_endpoint(self, db: Session):
        from fastapi.testclient import TestClient

        client = TestClient(app)
        client.post("/api/v1/maintenance/seed")

        response = client.delete("/api/v1/maintenance/reset/orders")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["target"] == "orders"
        assert db.query(InventoryMovement).count() == 0
        assert db.query(OrderItem).count() == 0
        assert db.query(Order).count() == 0
        assert db.query(Product).count() == 25
        assert db.query(Customer).count() == 20

    def test_reset_products_endpoint(self, db: Session):
        from fastapi.testclient import TestClient

        client = TestClient(app)
        client.post("/api/v1/maintenance/seed")

        response = client.delete("/api/v1/maintenance/reset/products")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["target"] == "products"
        assert db.query(InventoryMovement).count() == 0
        assert db.query(OrderItem).count() == 0
        assert db.query(Product).count() == 0
        assert db.query(Customer).count() == 20
        assert db.query(Order).count() == 20

    def test_reset_customers_endpoint(self, db: Session):
        from fastapi.testclient import TestClient

        client = TestClient(app)
        client.post("/api/v1/maintenance/seed")

        response = client.delete("/api/v1/maintenance/reset/customers")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["target"] == "customers"
        assert db.query(InventoryMovement).count() == 0
        assert db.query(OrderItem).count() == 0
        assert db.query(Order).count() == 0
        assert db.query(Customer).count() == 0
        assert db.query(Product).count() == 25

    def test_reset_all_endpoint(self, db: Session):
        from fastapi.testclient import TestClient

        client = TestClient(app)
        client.post("/api/v1/maintenance/seed")

        response = client.delete("/api/v1/maintenance/reset/all")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["target"] == "all"
        assert db.query(InventoryMovement).count() == 0
        assert db.query(OrderItem).count() == 0
        assert db.query(Order).count() == 0
        assert db.query(Customer).count() == 0
        assert db.query(Product).count() == 0
