from typing import Any

def success_response(data: Any = None, message: str = "Success"):
    return {
        "success": True,
        "message": message,
        "data": data
    }

def error_response(message: str = "Error", errors: list | None = None):
    return {
        "success": False,
        "message": message,
        "errors": errors or []
    }


def paginated_response(
    items: list[Any],
    total: int,
    page: int,
    size: int,
    message: str = "Success",
):
    return success_response(
        data={
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size if size else 0,
        },
        message=message,
    )
