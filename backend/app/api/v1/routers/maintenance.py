from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.responses import success_response
from app.db.session import get_db
from app.schemas.common import ApiResponse
from app.services.maintenance_service import clear_data, seed_demo_data

router = APIRouter(
    prefix="/maintenance",
    tags=["Maintenance"],
)

ResetTarget = Literal["all", "customers", "orders", "products", "inventory"]


@router.post("/seed", response_model=ApiResponse[dict])
def seed_database(db: Session = Depends(get_db)):
    result = seed_demo_data(db)
    if result["status"] == "skipped":
        return success_response(
            data=result,
            message="Seed skipped",
        )

    return success_response(
        data=result,
        message="Demo data seeded",
    )


@router.delete("/reset/{target}", response_model=ApiResponse[dict])
def reset_database(
    target: ResetTarget,
    db: Session = Depends(get_db),
):
    deleted = clear_data(db, target)
    return success_response(
        data={
            "target": target,
            "deleted": deleted,
        },
        message="Data cleared",
    )
