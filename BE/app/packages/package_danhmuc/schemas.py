"""
Pydantic Schemas cho package_danhmuc (UC005: Tra cứu tồn kho & UC008: Quản lý thuốc)
Bám sát Bảng 2-10 & Bảng 2-16 trong SRS V4.0.0
"""
from typing import Optional, List
from pydantic import BaseModel, Field


class NhomThuocSchema(BaseModel):
    maNhom: str
    tenNhom: str


class LoThuocSchema(BaseModel):
    maLo: str
    maThuoc: str
    hanSuDung: str
    soLuongTonLo: int


class ThuocCreateRequest(BaseModel):
    maThuoc: str = Field(..., min_length=1, max_length=50, description="ID duy nhất của thuốc (Bảng 2-16)")
    tenThuoc: str = Field(..., min_length=1, max_length=255, description="Tên thương mại dược phẩm")
    maNhom: str = Field(..., description="Mã nhóm thuốc")
    donViTinh: str = Field(..., description="Viên, Vỉ, Hộp, Lọ, Tuýp, Gói")
    giaBan: int = Field(..., gt=0, description="Đơn giá bán lẻ hiện hành (> 0)")
    tonToiThieu: int = Field(default=10, gt=0, description="Ngưỡng cảnh báo sắp hết hàng (> 0)")
    hanSuDung: Optional[str] = Field(default=None, description="Hạn sử dụng (YYYY-MM-DD)")
    quyCach: Optional[str] = None
    hoatChat: Optional[str] = None
    hinhAnh: Optional[str] = None


class ThuocUpdateRequest(BaseModel):
    tenThuoc: str = Field(..., min_length=1, max_length=255)
    maNhom: Optional[str] = None
    donViTinh: Optional[str] = None
    giaBan: int = Field(..., gt=0)
    tonToiThieu: int = Field(default=10, gt=0)
    hanSuDung: Optional[str] = None
    quyCach: Optional[str] = None
    hoatChat: Optional[str] = None
    hinhAnh: Optional[str] = None


class ThuocResponse(BaseModel):
    maThuoc: str
    tenThuoc: str
    maNhom: str
    tenNhom: Optional[str] = None
    donViTinh: str
    giaBan: int
    tongTonKho: int
    tonToiThieu: int
    hanSuDung: Optional[str] = None
    quyCach: Optional[str] = None
    hoatChat: Optional[str] = None
    hinhAnh: Optional[str] = None
    trangThaiTon: str = "Còn hàng"
    danhSachLo: Optional[List[LoThuocSchema]] = None


class InventoryAlertsResponse(BaseModel):
    tongThuocSapHet: int
    tongThuocSapHetHan: int
    danhSachSapHet: List[ThuocResponse]
    danhSachSapHetHan: List[ThuocResponse]
