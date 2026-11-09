"""
BaoCaoController (Mục 4.1 Thiết kế kiến trúc - Trang 46 SRS V4.0.0):
"Tiếp nhận bộ lọc (từ ngày... đến ngày...) từ người dùng, gửi yêu cầu tính toán xuống Model
và trả dữ liệu đã xử lý kèm biểu đồ lên View báo cáo."
Bao gồm:
- UC009: Báo cáo hoạt động (Bảng 2-17 & 2-18)
- UC010: Thống kê thuốc bán chạy (Bảng 2-19 & 2-20)
- UC011: Báo cáo doanh thu (Bảng 2-21 & 2-22)
"""
from typing import List, Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.packages.package_nguoidung.models import TaiKhoanModel
from app.packages.package_danhmuc.models import ThuocModel, NhomThuocModel
from app.packages.package_giaodich.models import PhieuNhapModel, PhieuXuatModel
from app.packages.package_giaodich.phieu_xuat_controller import _map_phieu_xuat
from app.packages.package_giaodich.schemas import (
    ActivityReportResponse,
    ActivityReportRow,
    TopSellingItem,
    RevenueReportResponse,
)

router = APIRouter(tags=["5. Báo cáo & Thống kê (UC009, UC010, UC011)"])


class BaoCaoController:
    """Controller Báo cáo & Thống kê (UC009, UC010, UC011)"""

    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _validate_date_range(from_date: Optional[str], to_date: Optional[str]):
        if from_date and to_date and from_date > to_date:
            raise HTTPException(
                status_code=400,
                detail="Ngày kết thúc phải lớn hơn hoặc bằng Ngày bắt đầu (Bảng 2-17 1a & Bảng 2-21 1a).",
            )

    def bao_cao_hoat_dong(
        self,
        from_date: Optional[str],
        to_date: Optional[str],
        activity_type: str,
        ma_thuoc: Optional[str],
        ma_nhom: Optional[str],
    ) -> ActivityReportResponse:
        self._validate_date_range(from_date, to_date)
        rows: List[ActivityReportRow] = []

        if activity_type in ("ALL", "IMPORT", "Tất cả", "Nhập kho"):
            imports = self.db.query(PhieuNhapModel).all()
            for pn in imports:
                date_part = pn.NgayNhap.split(" ")[0]
                if from_date and date_part < from_date:
                    continue
                if to_date and date_part > to_date:
                    continue
                user = (
                    self.db.query(TaiKhoanModel)
                    .filter(TaiKhoanModel.MaTaiKhoan == pn.NguoiLap)
                    .first()
                )
                for ct in pn.chi_tiet_list:
                    med = ct.thuoc
                    nhom = med.MaNhom if med else None
                    if ma_thuoc and ma_thuoc != "ALL" and ct.MaThuoc != ma_thuoc:
                        continue
                    if ma_nhom and ma_nhom != "ALL" and nhom != ma_nhom:
                        continue
                    rows.append(
                        ActivityReportRow(
                            maPhieu=pn.MaPN,
                            loai="Nhập kho",
                            ngayGD=pn.NgayNhap,
                            maThuoc=ct.MaThuoc,
                            tenThuoc=med.TenThuoc if med else ct.MaThuoc,
                            maNhom=nhom,
                            soLuong=ct.SoLuongNhap,
                            donGia=ct.DonGiaNhap,
                            thanhTien=ct.SoLuongNhap * ct.DonGiaNhap,
                            nguoiThucHien=user.HoTen if user else pn.NguoiLap,
                        )
                    )

        if activity_type in ("ALL", "EXPORT", "Tất cả", "Xuất kho"):
            exports = self.db.query(PhieuXuatModel).all()
            for px in exports:
                date_part = px.NgayBan.split(" ")[0]
                if from_date and date_part < from_date:
                    continue
                if to_date and date_part > to_date:
                    continue
                user = (
                    self.db.query(TaiKhoanModel)
                    .filter(TaiKhoanModel.MaTaiKhoan == px.NguoiBan)
                    .first()
                )
                for ct in px.chi_tiet_list:
                    med = ct.thuoc
                    nhom = med.MaNhom if med else None
                    if ma_thuoc and ma_thuoc != "ALL" and ct.MaThuoc != ma_thuoc:
                        continue
                    if ma_nhom and ma_nhom != "ALL" and nhom != ma_nhom:
                        continue
                    rows.append(
                        ActivityReportRow(
                            maPhieu=px.MaPX,
                            loai="Xuất kho",
                            ngayGD=px.NgayBan,
                            maThuoc=ct.MaThuoc,
                            tenThuoc=med.TenThuoc if med else ct.MaThuoc,
                            maNhom=nhom,
                            soLuong=ct.SoLuongXuat,
                            donGia=ct.DonGiaBan,
                            thanhTien=ct.ThanhTien,
                            nguoiThucHien=user.HoTen if user else px.NguoiBan,
                        )
                    )

        rows.sort(key=lambda r: r.ngayGD, reverse=True)
        return ActivityReportResponse(
            tuNgay=from_date or "",
            denNgay=to_date or "",
            loaiHoatDong=activity_type,
            totalQuantity=sum(r.soLuong for r in rows),
            totalAmount=sum(r.thanhTien for r in rows),
            rows=rows,
        )

    def thong_ke_thuoc_ban_chay(
        self,
        from_date: Optional[str],
        to_date: Optional[str],
        top_n: int,
        ma_nhom: Optional[str],
        sort_by: Literal["QUANTITY", "REVENUE"],
    ) -> List[TopSellingItem]:
        self._validate_date_range(from_date, to_date)
        exports = self.db.query(PhieuXuatModel).all()
        categories = {
            c.MaNhom: c.TenNhom for c in self.db.query(NhomThuocModel).all()
        }
        agg = {}

        for px in exports:
            date_part = px.NgayBan.split(" ")[0]
            if from_date and date_part < from_date:
                continue
            if to_date and date_part > to_date:
                continue
            for ct in px.chi_tiet_list:
                med = ct.thuoc
                nhom = med.MaNhom if med else "NT01"
                if ma_nhom and ma_nhom != "ALL" and nhom != ma_nhom:
                    continue
                if ct.MaThuoc not in agg:
                    agg[ct.MaThuoc] = {
                        "maThuoc": ct.MaThuoc,
                        "tenThuoc": med.TenThuoc if med else ct.MaThuoc,
                        "maNhom": nhom,
                        "tenNhom": categories.get(nhom, "Thuốc khác"),
                        "soLuong": 0,
                        "doanhThu": 0,
                    }
                agg[ct.MaThuoc]["soLuong"] += ct.SoLuongXuat
                agg[ct.MaThuoc]["doanhThu"] += ct.ThanhTien

        sorted_list = sorted(
            agg.values(),
            key=lambda x: x["doanhThu"] if sort_by == "REVENUE" else x["soLuong"],
            reverse=True,
        )[:top_n]

        return [
            TopSellingItem(rank=idx + 1, **item)
            for idx, item in enumerate(sorted_list)
        ]

    def bao_cao_doanh_thu(
        self,
        from_date: Optional[str],
        to_date: Optional[str],
        loai_xuat: Optional[str],
        ma_duoc_si: Optional[str],
    ) -> RevenueReportResponse:
        self._validate_date_range(from_date, to_date)
        exports = (
            self.db.query(PhieuXuatModel)
            .order_by(PhieuXuatModel.NgayBan.desc())
            .all()
        )
        filtered = []
        for px in exports:
            date_part = px.NgayBan.split(" ")[0]
            if from_date and date_part < from_date:
                continue
            if to_date and date_part > to_date:
                continue
            if loai_xuat and loai_xuat != "ALL" and px.LoaiXuat != loai_xuat:
                continue
            if ma_duoc_si and ma_duoc_si != "ALL" and px.NguoiBan != ma_duoc_si:
                continue
            filtered.append(px)

        return RevenueReportResponse(
            tuNgay=from_date or "",
            denNgay=to_date or "",
            tongDoanhThu=sum(p.TongTien for p in filtered),
            tongChietKhau=sum(p.ChietKhau for p in filtered),
            soHoaDon=len(filtered),
            donViTienTe="VND",
            danhSachHoaDon=[_map_phieu_xuat(p, self.db) for p in filtered],
        )


# ==================== ENDPOINTS REST API ====================

@router.get(
    "/reports/activity",
    response_model=ActivityReportResponse,
    summary="UC009 - Báo cáo hoạt động Nhập / Xuất kho (Bảng 2-17 & 2-18)",
)
def get_activity_report(
    fromDate: Optional[str] = Query(default=None, description="Từ ngày (YYYY-MM-DD)"),
    toDate: Optional[str] = Query(default=None, description="Đến ngày (YYYY-MM-DD)"),
    type: str = Query(default="ALL", description="ALL | IMPORT | EXPORT"),
    maThuoc: Optional[str] = Query(default=None, description="Lọc theo Mã thuốc (Bảng 2-18 STT 4)"),
    maNhom: Optional[str] = Query(default=None, description="Lọc theo Nhóm thuốc (Bảng 2-18 STT 5)"),
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY"])),
):
    ctrl = BaoCaoController(db)
    return ctrl.bao_cao_hoat_dong(fromDate, toDate, type, maThuoc, maNhom)


@router.get(
    "/reports/top-selling",
    response_model=List[TopSellingItem],
    summary="UC010 - Thống kê thuốc bán chạy (Bảng 2-19 & 2-20)",
)
def get_top_selling_report(
    fromDate: Optional[str] = Query(default=None),
    toDate: Optional[str] = Query(default=None),
    topN: int = Query(default=10, gt=0, description="Số lượng xếp hạng (>0) - Bảng 2-20 STT 2"),
    maNhom: Optional[str] = Query(default=None, description="Lọc theo nhóm thuốc - Bảng 2-20 STT 3"),
    sortBy: Literal["QUANTITY", "REVENUE"] = Query(
        default="QUANTITY", description="Tiêu chí: QUANTITY (Số lượng) | REVENUE (Doanh thu)"
    ),
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY"])),
):
    ctrl = BaoCaoController(db)
    return ctrl.thong_ke_thuoc_ban_chay(fromDate, toDate, topN, maNhom, sortBy)


@router.get(
    "/reports/revenue",
    response_model=RevenueReportResponse,
    summary="UC011 - Báo cáo doanh thu (Bảng 2-21 & 2-22)",
)
def get_revenue_report(
    fromDate: Optional[str] = Query(default=None, description="Từ ngày (YYYY-MM-DD)"),
    toDate: Optional[str] = Query(default=None, description="Đến ngày (YYYY-MM-DD)"),
    loaiXuat: Optional[str] = Query(
        default=None, description="Lọc hình thức xuất: Bán lẻ trực tiếp | Theo đơn"
    ),
    maDuocSi: Optional[str] = Query(
        default=None, description="Lọc theo Mã Dược sĩ bán hàng (Bảng 2-22 STT 4)"
    ),
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY"])),
):
    ctrl = BaoCaoController(db)
    return ctrl.bao_cao_doanh_thu(fromDate, toDate, loaiXuat, maDuocSi)
