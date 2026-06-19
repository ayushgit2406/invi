from pydantic import BaseModel, Field


class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    size: int = Field(10, ge=1, le=100)


def pagination_offset(page: int, size: int) -> int:
    return (page - 1) * size
