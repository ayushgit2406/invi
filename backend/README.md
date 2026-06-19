# Invi Backend

FastAPI backend for the Inventory and Order Management system.

## Environment

Copy the root `.env.example` into the backend folder and set values as needed:

```bash
cp ../.env.example .env
```

Key variables:

- `DATABASE_URL`: PostgreSQL connection string.
- `CORS_ORIGINS`: comma-separated frontend origins.
- `LOW_STOCK_THRESHOLD`: dashboard threshold for low stock products.

## Run Locally

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

API docs:

- Swagger: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Docker Compose

From the repository root:

```bash
cp .env.example .env
docker compose up --build
```

Backend API: `http://localhost:8000`

PostgreSQL data is persisted in the named volume `postgres_data`.

## Seed Data

After migrations are applied:

```bash
cd backend
python -m app.scripts.seed
```

Inside Docker:

```bash
docker compose exec backend python -m app.scripts.seed
```

## Maintenance API

- `POST /api/v1/maintenance/seed`
- `DELETE /api/v1/maintenance/reset/all`
- `DELETE /api/v1/maintenance/reset/products`
- `DELETE /api/v1/maintenance/reset/customers`
- `DELETE /api/v1/maintenance/reset/orders`
- `DELETE /api/v1/maintenance/reset/inventory`

## Health Checks

- `GET /api/v1/health/`
- `GET /api/v1/health/db`
- `GET /api/v1/ready/`

## API Conventions

- Successful responses use `{ "success": true, "message": "...", "data": ... }`.
- Error responses use `{ "success": false, "message": "...", "errors": [] }`.
- Order creation validates stock and reduces inventory atomically.
- Order cancellation restores inventory once and records audit movements.
