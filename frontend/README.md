# Invi Frontend

React application for the Inventory and Order Management system.

## Features

- Product management
- Customer management
- Order creation and tracking
- Dashboard with inventory and sales summaries

## Run Locally

From the `frontend` directory:

```bash
npm ci
npm run dev
```

The app reads the backend URL from `VITE_API_BASE_URL`.

## Production Build

```bash
npm ci
npm run build
```

## Docker

The frontend is containerized with the root `docker-compose.yml`.
Set `VITE_API_BASE_URL` before building so the static app points to the correct backend.

## Deployment

See [`DEPLOYMENT.md`](../DEPLOYMENT.md) for the deployment setup and environment variable mapping.
