from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.responses import success_response
from app.db.session import get_db
from app.schemas.common import ApiResponse

router = APIRouter(
    prefix = "/health",
    tags = ["Health"]
)

@router.get("/", response_model=ApiResponse[dict])
def health_check():
    return success_response(
        data={
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "healthy"
        },
        message="Service healthy"
    )


@router.get("/db", response_model=ApiResponse[dict])
def database_health_check(
    db: Session = Depends(get_db)
):
    db.execute(text("SELECT 1"))
    return success_response(
        data={
            "database": "healthy"
        },
        message="Database healthy"
    )


ready_router = APIRouter(
    prefix="/ready",
    tags=["Health"]
)


@ready_router.get("/", response_model=ApiResponse[dict])
def readiness_check():
    return success_response(
        data={
            "app": settings.APP_NAME,
            "status": "ready"
        },
        message="Service ready"
    )
