from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/meeting_intel"
    GEMINI_API_KEY: str = ""
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    PORT: int = 8000

    class Config:
        env_file = ".env"


settings = Settings()
