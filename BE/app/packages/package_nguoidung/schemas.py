"""
Pydantic Schemas cho package_nguoidung (UC001, UC002, UC003, UC004)
Bám sát điều kiện hợp lệ tại Bảng 2-2, 2-4, 2-6, 2-8 trong SRS V4.0.0
"""
from typing import Optional, Literal
from pydantic import BaseModel, Field, model_validator


RoleLiteral = Literal["ADMIN", "QUANLY", "DUOCSI"]
StatusLiteral = Literal["Hoạt động", "Khóa"]


# --- UC001: Đăng nhập (Bảng 2-1 & 2-2) ---
class LoginRequest(BaseModel):
    tenDangNhap: str = Field(..., min_length=8, description="Tối thiểu 8 ký tự (Bảng 2-2)")
    matKhau: str = Field(..., min_length=6, description="Tối thiểu 6 ký tự (Bảng 2-2)")


class TaiKhoanResponse(BaseModel):
    maTaiKhoan: str
    tenDangNhap: str
    hoTen: str
    email: Optional[str] = None
    soDienThoai: Optional[str] = None
    maVaiTro: RoleLiteral
    trangThai: StatusLiteral
    ngayTao: str
    ghiChu: Optional[str] = None


class LoginResponse(BaseModel):
    success: bool
    accessToken: str
    tokenType: str = "Bearer"
    user: TaiKhoanResponse
    message: str = "Đăng nhập thành công"


# --- UC002: Đăng ký / Tạo tài khoản mới (Bảng 2-3 & 2-4) ---
class RegisterAccountRequest(BaseModel):
    tenDangNhap: str = Field(..., min_length=8, max_length=50, description="Tối thiểu 8 ký tự")
    matKhau: str = Field(..., min_length=6, description="Ít nhất 6 ký tự")
    xacNhanMatKhau: Optional[str] = Field(default=None, description="Trùng với Mật khẩu")
    hoTen: str = Field(..., min_length=1, max_length=255, description="Họ và tên nhân viên")
    email: Optional[str] = None
    soDienThoai: Optional[str] = None
    maVaiTro: RoleLiteral = Field(default="DUOCSI", description="Vai trò: ADMIN | QUANLY | DUOCSI")
    ghiChu: Optional[str] = None

    @model_validator(mode="after")
    def check_passwords_match(self):
        if self.xacNhanMatKhau is not None and self.matKhau != self.xacNhanMatKhau:
            raise ValueError("Xác nhận mật khẩu không trùng khớp với mật khẩu.")
        return self


# --- UC003: Quản lý tài khoản - Cập nhật & Phân quyền (Bảng 2-5 & 2-6) ---
class UpdateAccountRequest(BaseModel):
    hoTen: str = Field(..., min_length=1, max_length=255)
    email: Optional[str] = None
    soDienThoai: Optional[str] = None
    matKhauMoi: Optional[str] = Field(default=None, min_length=6)
    xacNhanMatKhau: Optional[str] = None
    maVaiTro: Optional[RoleLiteral] = None
    trangThai: Optional[StatusLiteral] = None
    ghiChu: Optional[str] = None

    @model_validator(mode="after")
    def check_new_passwords_match(self):
        if self.matKhauMoi is not None and self.xacNhanMatKhau is not None:
            if self.matKhauMoi != self.xacNhanMatKhau:
                raise ValueError("Xác nhận mật khẩu không trùng khớp với mật khẩu mới.")
        return self


class UpdateRoleRequest(BaseModel):
    maVaiTro: RoleLiteral = Field(..., description="Quyền hệ thống (ADMIN / QUANLY / DUOCSI)")


# --- UC004: Quản lý trạng thái tài khoản (Bảng 2-7 & 2-8) ---
class UpdateStatusRequest(BaseModel):
    trangThaiMoi: StatusLiteral = Field(..., description="Chọn: Hoạt động / Khóa")
    lyDo: Optional[str] = Field(default=None, max_length=500, description="Lý do khóa/mở khóa (tối đa 500 ký tự)")
    nguoiThucHien: str = Field(default="admin_clin_01", description="Admin thực hiện thao tác")


class AuditLogStatusResponse(BaseModel):
    id: str
    maTaiKhoan: str
    tenTaiKhoan: str
    trangThaiCu: StatusLiteral
    trangThaiMoi: StatusLiteral
    lyDo: str
    nguoiThucHien: str
    thoiDiem: str
