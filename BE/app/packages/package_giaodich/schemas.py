"""
Pydantic Schemas cho package_giaodich (UC006, UC007, UC009, UC010, UC011)
Bám sát Bảng 2-12, 2-14, 2-18, 2-20, 2-22 trong SRS V4.0.0
"""
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class NhaCungCapSchema(BaseModel):
    maNCC: str
    tenNCC: str
    soDienThoai: Optional[str] = None
    diaChi: Optional[str] = None


# --- UC007: Quản lý Phiếu Nhập (Bảng 2-13 & 2-14) ---
class ChiTietPhieuNhapItem(BaseModel):
    maThuoc: str = Field(..., description="Mã thuốc tồn tại trong danh mục")
    tenThuoc: Optional[str] = None
    maLo: str = Field(..., min_length=1, description="Mã lô sản xuất (VD: LOT2024-A1)")
    soLuongNhap: int = Field(..., gt=0, description="Số lượng nhập thực tế (> 0)")
    donGiaNhap: int = Field(..., ge=0, description="Giá vốn nhập vào (>= 0)")
    hanSuDung: str = Field(..., description="Hạn sử dụng phải sau ngày nhập hàng (YYYY-MM-DD)")


class PhieuNhapCreateRequest(BaseModel):
    maPN: Optional[str] = None
    ngayNhap: str = Field(..., description="Thời điểm nhập hàng vào kho")
    maNCC: str = Field(..., description="Mã nhà cung cấp")
    nguoiLap: str = Field(..., description="Mã tài khoản Quản lý lập phiếu")
    chiTiet: List[ChiTietPhieuNhapItem] = Field(..., min_length=1)


class PhieuNhapUpdateRequest(BaseModel):
    ngayNhap: Optional[str] = None
    maNCC: Optional[str] = None
    chiTiet: List[ChiTietPhieuNhapItem] = Field(..., min_length=1)


class PhieuNhapResponse(BaseModel):
    maPN: str
    ngayNhap: str
    maNCC: str
    tenNCC: Optional[str] = None
    nguoiLap: str
    tenNguoiLap: Optional[str] = None
    tongTien: int
    chiTiet: List[ChiTietPhieuNhapItem]


# --- UC006: Quản lý Phiếu Xuất (Bảng 2-11 & 2-12) ---
class ChiTietPhieuXuatItem(BaseModel):
    maThuoc: str = Field(..., description="Mã thuốc")
    tenThuoc: Optional[str] = None
    donViTinh: Optional[str] = None
    soLuongXuat: int = Field(..., gt=0, description="Số lượng thuốc nguyên dương (> 0)")
    donGiaBan: int = Field(..., ge=0, description="Giá bán thực tế")
    thanhTien: Optional[int] = None


class PhieuXuatCreateRequest(BaseModel):
    maPX: Optional[str] = None
    nguoiBan: str = Field(..., description="Mã tài khoản Dược sĩ bán thuốc")
    ngayBan: str = Field(..., description="Ngày bán")
    loaiXuat: Literal["Bán lẻ trực tiếp", "Theo đơn"] = "Bán lẻ trực tiếp"
    tenKhachHang: Optional[str] = None
    chietKhau: int = Field(default=0, ge=0)
    phuongThucThanhToan: Literal["Tiền mặt", "Chuyển khoản"] = "Tiền mặt"
    chiTiet: List[ChiTietPhieuXuatItem] = Field(..., min_length=1)


class PhieuXuatUpdateRequest(BaseModel):
    loaiXuat: Optional[Literal["Bán lẻ trực tiếp", "Theo đơn"]] = None
    tenKhachHang: Optional[str] = None
    chietKhau: int = Field(default=0, ge=0)
    phuongThucThanhToan: Optional[Literal["Tiền mặt", "Chuyển khoản"]] = None
    chiTiet: List[ChiTietPhieuXuatItem] = Field(..., min_length=1)


class PhieuXuatResponse(BaseModel):
    maPX: str
    nguoiBan: str
    tenNguoiBan: Optional[str] = None
    ngayBan: str
    loaiXuat: str
    tenKhachHang: Optional[str] = None
    chietKhau: int
    tongTien: int
    phuongThucThanhToan: str = "Tiền mặt"
    chiTiet: List[ChiTietPhieuXuatItem]


# --- UC009, UC010, UC011: Báo cáo & Thống kê ---
class ActivityReportRow(BaseModel):
    maPhieu: str
    loai: Literal["Nhập kho", "Xuất kho"]
    ngayGD: str
    maThuoc: str
    tenThuoc: str
    maNhom: Optional[str] = None
    soLuong: int
    donGia: int
    thanhTien: int
    nguoiThucHien: str


class ActivityReportResponse(BaseModel):
    tuNgay: str
    denNgay: str
    loaiHoatDong: str
    totalQuantity: int
    totalAmount: int
    rows: List[ActivityReportRow]


class TopSellingItem(BaseModel):
    rank: int
    maThuoc: str
    tenThuoc: str
    maNhom: str
    tenNhom: str
    soLuong: int
    doanhThu: int


class RevenueReportResponse(BaseModel):
    tuNgay: str
    denNgay: str
    tongDoanhThu: int
    tongChietKhau: int
    soHoaDon: int
    donViTienTe: str = "VND"
    danhSachHoaDon: List[PhieuXuatResponse]
