import logging

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.exceptions import (
    NotFoundException,
    ConflictException,
    BadRequestException
)
from app.core.responses import error_response
import app.db.events

logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production-grade Inventory & Order Management System API with full CRUD operations, inventory tracking, and order management",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {
            "name": "Products",
            "description": "Product management endpoints - Create, read, update, delete products with inventory tracking",
        },
        {
            "name": "Customers",
            "description": "Customer management endpoints - Create, read, delete customers",
        },
        {
            "name": "Orders",
            "description": "Order management endpoints - Create, read, cancel orders with automatic inventory deduction",
        },
        {
            "name": "Dashboard",
            "description": "Dashboard analytics endpoints - Get stats, low-stock alerts, recent orders",
        },
        {
            "name": "Inventory",
            "description": "Inventory movement tracking and audit logs",
        },
        {
            "name": "Health",
            "description": "Health check endpoints for monitoring and readiness probes",
        },
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["Root"])
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }

app.include_router(
    api_router,
    prefix="/api/v1"
)

@app.exception_handler(NotFoundException)
def not_found_handler(
    request: Request,
    exc: NotFoundException
):
    return JSONResponse(
        status_code=404,
        content=error_response(message=exc.message)
    )

@app.exception_handler(ConflictException)
def conflict_handler(
    request: Request,
    exc: ConflictException
):
    return JSONResponse(
        status_code=409,
        content=error_response(message=exc.message)
    )

@app.exception_handler(BadRequestException)
def bad_request_handler(
    request: Request,
    exc: BadRequestException
):
    return JSONResponse(
        status_code=400,
        content=error_response(message=exc.message)
    )


@app.exception_handler(RequestValidationError)
def validation_exception_handler(
    request: Request,
    exc: RequestValidationError
):
    return JSONResponse(
        status_code=422,
        content=error_response(
            message="Validation failed",
            errors=jsonable_encoder(exc.errors()),
        )
    )


@app.exception_handler(IntegrityError)
def integrity_error_handler(
    request: Request,
    exc: IntegrityError
):
    logger.exception("Database integrity error")
    return JSONResponse(
        status_code=409,
        content=error_response(
            message="Database constraint violation"
        )
    )


@app.exception_handler(SQLAlchemyError)
def sqlalchemy_error_handler(
    request: Request,
    exc: SQLAlchemyError
):
    logger.exception("Database error")
    return JSONResponse(
        status_code=500,
        content=error_response(
            message="Database error"
        )
    )


@app.exception_handler(Exception)
def generic_exception_handler(
    request: Request,
    exc: Exception
):
    logger.exception("Unhandled application error")
    return JSONResponse(
        status_code=500,
        content=error_response(
            message="Internal server error"
        )
    )
