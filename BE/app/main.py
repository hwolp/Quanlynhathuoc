"""
Main Entry Point: Hệ thống Quản lý Quầy thuốc Backend (Python - FastAPI, SQLite)
Bám sát 100% Tài liệu SRS Phiên bản 4.0.0:
- Kiến trúc MVC & 3 Packages: package_nguoidung, package_danhmuc, package_giaodich
- Đầy đủ 11 Use Cases: UC001 -> UC011
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.core.seed import seed_initial_data
from app.packages.package_nguoidung.tai_khoan_controller import router as nguoidung_router
from app.packages.package_danhmuc.thuoc_controller import router as danhmuc_router
from app.packages.package_giaodich.phieu_nhap_controller import router as phieunhap_router
from app.packages.package_giaodich.phieu_xuat_controller import router as phieuxuat_router
from app.packages.package_giaodich.bao_cao_controller import router as baocao_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tự động khởi tạo bảng CSDL SQLite và dữ liệu mẫu khi chạy
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Bộ RESTful API Contract & Backend cho **Hệ thống Quản lý Quầy thuốc V4.0.0** "
        "sử dụng **SQLite Database** "
        "(Hướng dẫn: TS. Võ Đức Hoàng - Nhóm: Lê Đăng Khánh, Nguyễn Đình Hiến, Bùi Đức Minh Phú)."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gắn các Controller Router theo cấu trúc 3 Packages trong SRS Mục 4.3
app.include_router(nguoidung_router, prefix=settings.API_V1_STR)
app.include_router(danhmuc_router, prefix=settings.API_V1_STR)
app.include_router(phieunhap_router, prefix=settings.API_V1_STR)
app.include_router(phieuxuat_router, prefix=settings.API_V1_STR)
app.include_router(baocao_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health Check"])
def health_check():
    return {
        "status": "UP",
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "databaseEngine": "SQLite 3 (quan_ly_quay_thuoc.db)",
        "databaseUrl": settings.DATABASE_URL,
    }
