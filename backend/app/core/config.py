from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Invi API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/invi_db"
    )
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    LOW_STOCK_THRESHOLD: int = 10
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_file = ".env", 
        extra = "ignore"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]


settings = Settings()
