import logging

from app.db.session import SessionLocal
from app.services.maintenance_service import seed_demo_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed() -> None:
    db = SessionLocal()
    try:
        result = seed_demo_data(db)
        logger.info("Seed result: %s", result)
    except Exception as e:
        logger.error("Seed failed: %s", e)
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
