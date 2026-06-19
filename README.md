# Invi

Inventory and order management system with a React frontend, FastAPI backend, PostgreSQL database, and Docker Compose packaging.

## Features

- Product management
- Customer management
- Order creation, tracking, and cancellation
- Inventory reduction on order creation
- Dashboard summaries and analytics

## Project Structure

- `frontend/` - React application
- `backend/` - FastAPI application
- `docker-compose.yml` - local production stack

## Run Locally

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Start the containerized stack:

```bash
docker compose up --build
```

3. Open the apps:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

## Validation

- Frontend build: `npm --prefix frontend run build`
- Frontend lint: `npm --prefix frontend run lint`
- Backend tests: `python -m pytest backend/tests/test_api.py`
