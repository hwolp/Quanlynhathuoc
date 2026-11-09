"""
Cấu hình kết nối Cơ sở dữ liệu SQLite bằng SQLAlchemy 2.0
Bám sát Mục 3.3 & 4.2 Tài liệu SRS V4.0.0 (Bật PRAGMA foreign_keys=ON cho SQLite)
"""
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {},
)


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Kích hoạt ràng buộc khóa ngoại (Foreign Key Constraints) trên SQLite"""
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency cung cấp DB Session cho các Controller"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
