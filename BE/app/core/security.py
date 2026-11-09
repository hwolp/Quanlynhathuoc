"""
Bảo mật & Phân quyền RBAC (Mục 3.2 Tính bảo mật - SRS V4.0.0):
- Phân quyền chi tiết: ADMIN, QUANLY, DUOCSI
- Xác thực JWT Token hoặc Header X-User-Role / Bearer Token cho môi trường Mock Testing
"""
import hashlib
from typing import List, Optional
from fastapi import Depends, HTTPException, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db

security_scheme = HTTPBearer(auto_error=False)


def hash_password(raw_password: str) -> str:
    """Băm mật khẩu theo yêu cầu Bảng taikhoan (Mục 4.2.1 SRS)"""
    return hashlib.sha256(raw_password.encode("utf-8")).hexdigest()


def verify_password(raw_password: str, stored_password: str) -> bool:
    """Kiểm tra mật khẩu (hỗ trợ cả bản rõ trong seed mẫu và bản băm SHA256)"""
    if raw_password == stored_password:
        return True
    return hash_password(raw_password) == stored_password


def create_mock_jwt_token(ma_tai_khoan: str, ten_dang_nhap: str, ma_vai_tro: str) -> str:
    """Tạo token định danh phiên đăng nhập"""
    return f" token_{ma_tai_khoan}_{ma_vai_tro}_{ten_dang_nhap}".strip()


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Lấy tài khoản hiện tại từ Bearer Token hoặc Header X-User-Id"""
    from app.packages.package_nguoidung.models import TaiKhoanModel

    ma_tk = None
    if credentials and credentials.credentials:
        token = credentials.credentials.strip()
        if token.startswith("token_"):
            parts = token.split("_")
            if len(parts) >= 3:
                ma_tk = parts[1]
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token xác thực không hợp lệ.",
            )
    if not ma_tk and x_user_id:
        ma_tk = x_user_id

    if not ma_tk:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu đăng nhập và xác thực để truy cập hệ thống (Mục 3.2 SRS).",
        )

    user = db.query(TaiKhoanModel).filter(TaiKhoanModel.MaTaiKhoan == ma_tk).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc tài khoản không tồn tại.",
        )
    if credentials and credentials.credentials:
        expected = create_mock_jwt_token(user.MaTaiKhoan, user.TenDangNhap, user.MaVaiTro)
        if credentials.credentials.strip() != expected:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Phiên đăng nhập không hợp lệ hoặc đã thay đổi quyền hạn.",
            )
    if user.TrangThai == "Khóa":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Tài khoản đã bị khóa. Lý do: {user.GhiChu or 'Liên hệ Admin'}",
        )
    return user


def require_roles(allowed_roles: List[str]):
    """Middleware kiểm tra phân quyền theo vai trò (ADMIN, QUANLY, DUOCSI)"""
    def role_checker(current_user=Depends(get_current_user)):
        if current_user and current_user.MaVaiTro not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Quyền truy cập bị từ chối. Yêu cầu một trong các vai trò: {', '.join(allowed_roles)}",
            )
        return current_user
    return role_checker
