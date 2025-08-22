from pydantic_settings import BaseSettings
from typing import List
import json

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:8080"
    upload_dir: str = "uploads"
    max_file_size: int = 524288000  # 500MB

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"

settings = Settings()
