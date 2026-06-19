from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo

from app.core.timezone import APP_TIMEZONE

IST = ZoneInfo(APP_TIMEZONE)


def apply_created_at_filters(
    query,
    created_at_column,
    created_from: date | None = None,
    created_to: date | None = None,
):
    if created_from is not None:
        start = datetime.combine(created_from, time.min, tzinfo=IST).astimezone(
            timezone.utc,
        )
        query = query.filter(
            created_at_column >= start,
        )

    if created_to is not None:
        end = datetime.combine(created_to, time.max, tzinfo=IST).astimezone(
            timezone.utc,
        )
        query = query.filter(
            created_at_column <= end,
        )

    return query
