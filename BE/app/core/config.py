"""
Cấu hình hệ thống Quản lý Quầy thuốc (SRS V4.0.0) - Sử dụng SQLite
"""
import os
from pydantic import BaseModel


class Settings(BaseModel):
    PROJECT_NAME: str = "Hệ thống Quản lý Quầy thuốc API (SRS V4.0.0)"
    VERSION: str = "4.0.0"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./quan_ly_quay_thuoc.db",
    )
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "pharmacare_srs_v4_secret_key_2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480


settings = Settings()
