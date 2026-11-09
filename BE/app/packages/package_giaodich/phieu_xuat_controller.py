"""
PhieuXuatController (Mục 4.1 Thiết kế kiến trúc - Trang 46 SRS V4.0.0):
"Điều phối quy trình tạo mới và chỉnh sửa phiếu xuất bán lẻ/theo đơn, đồng thời tự động
trừ/hoàn trả số lượng tồn kho (TongTonKho)."
Triển khai <<Interface>> QuanLy<PhieuXuat> (UC006 - Xem, Tạo, Cập nhật, Xóa)
"""
from datetime import datetime
from typing import List, Optional
import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.interfaces.quan_ly import QuanLy
from app.packages.package_nguoidung.models import TaiKhoanModel
from app.packages.package_danhmuc.models import ThuocModel
from app.packages.package_giaodich.models import PhieuXuatModel, ChiTietPhieuXuatModel
from app.packages.package_giaodich.schemas import (
    PhieuXuatCreateRequest,
    PhieuXuatUpdateRequest,
    PhieuXuatResponse,
    ChiTietPhieuXuatItem,
)

router = APIRouter(tags=["4. Quản lý Phiếu Xuất & Bán lẻ POS (UC006)"])


def _map_phieu_xuat(px: PhieuXuatModel, db: Session) -> PhieuXuatResponse:
    user = (
        db.query(TaiKhoanModel)
        .filter(TaiKhoanModel.MaTaiKhoan == px.NguoiBan)
        .first()
    )
    items = []
    for ct in px.chi_tiet_list:
        items.append(
            ChiTietPhieuXuatItem(
                maThuoc=ct.MaThuoc,
                tenThuoc=ct.thuoc.TenThuoc if ct.thuoc else ct.MaThuoc,
                donViTinh=ct.thuoc.DonViTinh if ct.thuoc else "Hộp",
                soLuongXuat=ct.SoLuongXuat,
                donGiaBan=ct.DonGiaBan,
                thanhTien=ct.ThanhTien,
            )
        )
    return PhieuXuatResponse(
        maPX=px.MaPX,
        nguoiBan=px.NguoiBan,
        tenNguoiBan=user.HoTen if user else px.NguoiBan,
        ngayBan=px.NgayBan,
        loaiXuat=px.LoaiXuat,
        tenKhachHang=px.TenKhachHang,
        chietKhau=px.ChietKhau,
        tongTien=px.TongTien,
        phuongThucThanhToan=px.PhuongThucThanhToan or "Tiền mặt",
        chiTiet=items,
    )


class PhieuXuatController(QuanLy[PhieuXuatModel, str]):
    """Controller Quản lý Phiếu Xuất / Hóa đơn POS (UC006: Read, Create, Update, Delete)"""

    def __init__(self, db: Session):
        self.db = db

    def doc_danh_sach(self) -> List[PhieuXuatModel]:
        return (
            self.db.query(PhieuXuatModel)
            .order_by(PhieuXuatModel.NgayBan.desc())
            .all()
        )

    def doc_chi_tiet(self, ma_id: str) -> Optional[PhieuXuatModel]:
        return (
            self.db.query(PhieuXuatModel)
            .filter(PhieuXuatModel.MaPX == ma_id)
            .first()
        )

    def them_moi(self, payload: PhieuXuatCreateRequest) -> PhieuXuatModel:
        ngay_ban_date = payload.ngayBan.split(" ")[0]
        today_str = datetime.now().strftime("%Y-%m-%d")
        if ngay_ban_date > today_str:
            raise HTTPException(
                status_code=400,
                detail="Ngày bán không được sau ngày hiện tại (Bảng 2-12 STT 2).",
            )

        # 1. Kiểm tra tồn kho & hạn sử dụng trước khi xuất (Biểu đồ hoạt động Hình 2-20 & Mục 2.2)
        for item in payload.chiTiet:
            med = (
                self.db.query(ThuocModel)
                .filter(ThuocModel.MaThuoc == item.maThuoc)
                .first()
            )
            if not med:
                raise HTTPException(
                    status_code=400,
                    detail=f"Thuốc {item.maThuoc} không tồn tại trong danh mục.",
                )
            if med.HanSuDung and med.HanSuDung < today_str:
                raise HTTPException(
                    status_code=400,
                    detail=f"Thuốc {med.TenThuoc} đã hết hạn sử dụng ({med.HanSuDung}), không thể xuất bán.",
                )
            if med.TongTonKho < item.soLuongXuat:
                raise HTTPException(
                    status_code=400,
                    detail=f"Thuốc {med.TenThuoc} không đủ tồn kho (Hiện còn: {med.TongTonKho}, yêu cầu: {item.soLuongXuat}).",
                )

        ma_px = payload.maPX or (
            f"PX{datetime.now().strftime('%y%m%d')}_{random.randint(100, 999)}"
        )
        while self.doc_chi_tiet(ma_px):
            ma_px = f"PX{datetime.now().strftime('%y%m%d')}_{random.randint(100, 999)}"

        px = PhieuXuatModel(
            MaPX=ma_px,
            NguoiBan=payload.nguoiBan,
            NgayBan=payload.ngayBan,
            LoaiXuat=payload.loaiXuat,
            TenKhachHang=payload.tenKhachHang,
            ChietKhau=payload.chietKhau,
            PhuongThucThanhToan=payload.phuongThucThanhToan,
            TongTien=0,
        )
        self.db.add(px)

        # 2. Trừ tồn kho và thêm dòng chi tiết
        for item in payload.chiTiet:
            med = (
                self.db.query(ThuocModel)
                .filter(ThuocModel.MaThuoc == item.maThuoc)
                .first()
            )
            med.thay_doi_ton_kho(-item.soLuongXuat)
            ct = ChiTietPhieuXuatModel(
                MaPX=ma_px,
                MaThuoc=item.maThuoc,
                SoLuongXuat=item.soLuongXuat,
                DonGiaBan=item.donGiaBan,
                ThanhTien=item.soLuongXuat * item.donGiaBan,
            )
            px.them_chi_tiet(ct)

        px.chot_phieu()
        self.db.commit()
        self.db.refresh(px)
        return px

    def cap_nhat(self, ma_id: str, payload: PhieuXuatUpdateRequest) -> PhieuXuatModel:
        px = self.doc_chi_tiet(ma_id)
        if not px:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiếu xuất.")

        # Hoàn lại tồn kho cũ trước khi kiểm tra số lượng mới
        for old_ct in px.chi_tiet_list:
            med = (
                self.db.query(ThuocModel)
                .filter(ThuocModel.MaThuoc == old_ct.MaThuoc)
                .first()
            )
            if med:
                med.thay_doi_ton_kho(old_ct.SoLuongXuat)

        # Kiểm tra tồn kho với danh sách mới
        for item in payload.chiTiet:
            med = (
                self.db.query(ThuocModel)
                .filter(ThuocModel.MaThuoc == item.maThuoc)
                .first()
            )
            if not med:
                raise HTTPException(
                    status_code=400, detail=f"Thuốc {item.maThuoc} không tồn tại."
                )
            if med.TongTonKho < item.soLuongXuat:
                raise HTTPException(
                    status_code=400,
                    detail=f"Thuốc {med.TenThuoc} không đủ tồn kho để cập nhật (Còn {med.TongTonKho}).",
                )

        px.chi_tiet_list.clear()
        self.db.flush()

        if payload.loaiXuat:
            px.LoaiXuat = payload.loaiXuat
        if payload.tenKhachHang is not None:
            px.TenKhachHang = payload.tenKhachHang
        if payload.phuongThucThanhToan:
            px.PhuongThucThanhToan = payload.phuongThucThanhToan
        px.set_chiet_khau(payload.chietKhau)

        for item in payload.chiTiet:
            med = (
                self.db.query(ThuocModel)
                .filter(ThuocModel.MaThuoc == item.maThuoc)
                .first()
            )
            med.thay_doi_ton_kho(-item.soLuongXuat)
            ct = ChiTietPhieuXuatModel(
                MaPX=px.MaPX,
                MaThuoc=item.maThuoc,
                SoLuongXuat=item.soLuongXuat,
                DonGiaBan=item.donGiaBan,
                ThanhTien=item.soLuongXuat * item.donGiaBan,
            )
            px.them_chi_tiet(ct)

        px.chot_phieu()
        self.db.commit()
        self.db.refresh(px)
        return px

    def xoa(self, ma_id: str) -> bool:
        px = self.doc_chi_tiet(ma_id)
        if not px:
            raise HTTPException(
                status_code=404, detail="Không tìm thấy phiếu xuất cần hủy/xóa."
            )
        # Hoàn trả số lượng tồn kho khi hủy phiếu xuất (UC006)
        for ct in px.chi_tiet_list:
            med = (
                self.db.query(ThuocModel)
                .filter(ThuocModel.MaThuoc == ct.MaThuoc)
                .first()
            )
            if med:
                med.thay_doi_ton_kho(ct.SoLuongXuat)

        self.db.delete(px)
        self.db.commit()
        return True


# ==================== ENDPOINTS REST API ====================

@router.get(
    "/export-vouchers",
    response_model=List[PhieuXuatResponse],
    summary="UC006 - Xem danh sách Phiếu Xuất / Lịch sử bán hàng (Hình 2-13)",
)
def list_export_vouchers(
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY", "DUOCSI"])),
):
    ctrl = PhieuXuatController(db)
    return [_map_phieu_xuat(px, db) for px in ctrl.doc_danh_sach()]


@router.get(
    "/export-vouchers/{ma_px}",
    response_model=PhieuXuatResponse,
    summary="UC006 - Xem chi tiết Phiếu Xuất (Hình 2-13)",
)
def get_export_voucher(
    ma_px: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY", "DUOCSI"])),
):
    ctrl = PhieuXuatController(db)
    px = ctrl.doc_chi_tiet(ma_px)
    if not px:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu xuất.")
    return _map_phieu_xuat(px, db)


@router.post(
    "/export-vouchers",
    response_model=PhieuXuatResponse,
    status_code=status.HTTP_201_CREATED,
    summary="UC006 - Tạo Phiếu Xuất bán lẻ / theo đơn & Tự động trừ Tồn Kho (Hình 2-14)",
)
def create_export_voucher(
    payload: PhieuXuatCreateRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY", "DUOCSI"])),
):
    ctrl = PhieuXuatController(db)
    px = ctrl.them_moi(payload)
    return _map_phieu_xuat(px, db)


@router.put(
    "/export-vouchers/{ma_px}",
    response_model=PhieuXuatResponse,
    summary="UC006 - Cập nhật / Điều chỉnh Phiếu Xuất & Đồng bộ Tồn Kho (Hình 2-15)",
)
def update_export_voucher(
    ma_px: str,
    payload: PhieuXuatUpdateRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY", "DUOCSI"])),
):
    ctrl = PhieuXuatController(db)
    px = ctrl.cap_nhat(ma_px, payload)
    return _map_phieu_xuat(px, db)


@router.delete(
    "/export-vouchers/{ma_px}",
    summary="UC006 - Xóa / Hủy Phiếu Xuất khi có sai sót/trả hàng & Hoàn Tồn Kho (Hình 2-16)",
)
def delete_export_voucher(
    ma_px: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY", "DUOCSI"])),
):
    ctrl = PhieuXuatController(db)
    ctrl.xoa(ma_px)
    return {
        "success": True,
        "message": f"Đã hủy phiếu xuất {ma_px} và hoàn trả tồn kho thành công.",
    }
