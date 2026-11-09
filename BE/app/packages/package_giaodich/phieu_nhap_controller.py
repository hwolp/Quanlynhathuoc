"""
PhieuNhapController (Mục 4.1 Thiết kế kiến trúc - Trang 46 SRS V4.0.0):
"Điều phối quy trình tạo mới và chỉnh sửa phiếu nhập, đồng thời gọi các hàm để tự động cập nhật
số lượng tồn kho (TongTonKho & SoLuongTonLo) sau khi lập phiếu thành công."
Triển khai <<Interface>> QuanLy<PhieuNhap> (UC007 - Xem, Tạo, Cập nhật, Xóa)
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
from app.packages.package_danhmuc.models import ThuocModel, LoThuocModel
from app.packages.package_giaodich.models import (
    NhaCungCapModel,
    PhieuNhapModel,
    ChiTietPhieuNhapModel,
)
from app.packages.package_giaodich.schemas import (
    NhaCungCapSchema,
    PhieuNhapCreateRequest,
    PhieuNhapUpdateRequest,
    PhieuNhapResponse,
    ChiTietPhieuNhapItem,
)

router = APIRouter(tags=["3. Quản lý Phiếu Nhập & Nhà Cung Cấp (UC007)"])


def _map_phieu_nhap(pn: PhieuNhapModel, db: Session) -> PhieuNhapResponse:
    user = (
        db.query(TaiKhoanModel)
        .filter(TaiKhoanModel.MaTaiKhoan == pn.NguoiLap)
        .first()
    )
    items = []
    for ct in pn.chi_tiet_list:
        items.append(
            ChiTietPhieuNhapItem(
                maThuoc=ct.MaThuoc,
                tenThuoc=ct.thuoc.TenThuoc if ct.thuoc else ct.MaThuoc,
                maLo=ct.MaLo,
                soLuongNhap=ct.SoLuongNhap,
                donGiaNhap=ct.DonGiaNhap,
                hanSuDung=ct.HanSuDung or (ct.thuoc.HanSuDung if ct.thuoc else "2027-12-31"),
            )
        )
    return PhieuNhapResponse(
        maPN=pn.MaPN,
        ngayNhap=pn.NgayNhap,
        maNCC=pn.MaNCC,
        tenNCC=pn.nha_cung_cap.TenNCC if pn.nha_cung_cap else pn.MaNCC,
        nguoiLap=pn.NguoiLap,
        tenNguoiLap=user.HoTen if user else pn.NguoiLap,
        tongTien=pn.TongTien,
        chiTiet=items,
    )


class PhieuNhapController(QuanLy[PhieuNhapModel, str]):
    """Controller Quản lý Phiếu Nhập Kho (UC007: Read, Create, Update, Delete)"""

    def __init__(self, db: Session):
        self.db = db

    def doc_danh_sach(self) -> List[PhieuNhapModel]:
        return (
            self.db.query(PhieuNhapModel)
            .order_by(PhieuNhapModel.NgayNhap.desc())
            .all()
        )

    def doc_chi_tiet(self, ma_id: str) -> Optional[PhieuNhapModel]:
        return (
            self.db.query(PhieuNhapModel)
            .filter(PhieuNhapModel.MaPN == ma_id)
            .first()
        )

    def them_moi(self, payload: PhieuNhapCreateRequest) -> PhieuNhapModel:
        ngay_nhap_date = payload.ngayNhap.split(" ")[0]
        today_str = datetime.now().strftime("%Y-%m-%d")
        if ngay_nhap_date > today_str:
            raise HTTPException(
                status_code=400,
                detail="Ngày nhập hàng không được sau ngày hiện tại (Bảng 2-14 STT 2).",
            )
        for item in payload.chiTiet:
            if item.hanSuDung <= ngay_nhap_date:
                raise HTTPException(
                    status_code=400,
                    detail=f"Hạn sử dụng ({item.hanSuDung}) phải sau ngày nhập hàng ({ngay_nhap_date}) (Bảng 2-14 STT 6).",
                )

        ma_pn = payload.maPN or (
            f"PN{datetime.now().strftime('%y%m%d')}_{random.randint(10, 99)}"
        )
        while self.doc_chi_tiet(ma_pn):
            ma_pn = f"PN{datetime.now().strftime('%y%m%d')}_{random.randint(100, 999)}"

        pn = PhieuNhapModel(
            MaPN=ma_pn,
            NgayNhap=payload.ngayNhap,
            MaNCC=payload.maNCC,
            NguoiLap=payload.nguoiLap,
            TongTien=0,
        )
        self.db.add(pn)

        for item in payload.chiTiet:
            med = (
                self.db.query(ThuocModel)
                .filter(ThuocModel.MaThuoc == item.maThuoc)
                .first()
            )
            if not med:
                raise HTTPException(
                    status_code=400,
                    detail=f"Mã thuốc {item.maThuoc} không tồn tại trong danh mục (Bảng 2-14 STT 3).",
                )
            # Cộng tồn kho thuốc
            med.thay_doi_ton_kho(item.soLuongNhap)
            if item.hanSuDung:
                med.HanSuDung = item.hanSuDung

            # Cập nhật hoặc tạo mới lô thuốc (bảng lothuoc)
            batch = (
                self.db.query(LoThuocModel)
                .filter(
                    LoThuocModel.MaLo == item.maLo,
                    LoThuocModel.MaThuoc == item.maThuoc,
                )
                .first()
            )
            if batch:
                batch.cap_nhat_ton_lo(item.soLuongNhap)
                batch.HanSuDung = item.hanSuDung
            else:
                batch = LoThuocModel(
                    MaLo=item.maLo,
                    MaThuoc=item.maThuoc,
                    HanSuDung=item.hanSuDung,
                    SoLuongTonLo=item.soLuongNhap,
                )
                self.db.add(batch)

            ct = ChiTietPhieuNhapModel(
                MaPN=ma_pn,
                MaThuoc=item.maThuoc,
                MaLo=item.maLo,
                SoLuongNhap=item.soLuongNhap,
                DonGiaNhap=item.donGiaNhap,
                HanSuDung=item.hanSuDung,
            )
            pn.them_chi_tiet(ct)

        pn.chot_phieu()
        self.db.commit()
        self.db.refresh(pn)
        return pn

    def cap_nhat(self, ma_id: str, payload: PhieuNhapUpdateRequest) -> PhieuNhapModel:
        pn = self.doc_chi_tiet(ma_id)
        if not pn:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiếu nhập.")

        # Hoàn tác lượng tồn kho của các dòng chi tiết cũ trước khi ghi nhận chi tiết mới
        for old_ct in pn.chi_tiet_list:
            med = (
                self.db.query(ThuocModel)
                .filter(ThuocModel.MaThuoc == old_ct.MaThuoc)
                .first()
            )
            if med:
                med.TongTonKho = max(0, med.TongTonKho - old_ct.SoLuongNhap)
            batch = (
                self.db.query(LoThuocModel)
                .filter(
                    LoThuocModel.MaLo == old_ct.MaLo,
                    LoThuocModel.MaThuoc == old_ct.MaThuoc,
                )
                .first()
            )
            if batch:
                batch.cap_nhat_ton_lo(-old_ct.SoLuongNhap)

        pn.chi_tiet_list.clear()
        self.db.flush()

        if payload.ngayNhap:
            pn.NgayNhap = payload.ngayNhap
        if payload.maNCC:
            pn.MaNCC = payload.maNCC

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
            med.thay_doi_ton_kho(item.soLuongNhap)
            if item.hanSuDung:
                med.HanSuDung = item.hanSuDung

            batch = (
                self.db.query(LoThuocModel)
                .filter(
                    LoThuocModel.MaLo == item.maLo,
                    LoThuocModel.MaThuoc == item.maThuoc,
                )
                .first()
            )
            if batch:
                batch.cap_nhat_ton_lo(item.soLuongNhap)
                batch.HanSuDung = item.hanSuDung
            else:
                batch = LoThuocModel(
                    MaLo=item.maLo,
                    MaThuoc=item.maThuoc,
                    HanSuDung=item.hanSuDung,
                    SoLuongTonLo=item.soLuongNhap,
                )
                self.db.add(batch)

            ct = ChiTietPhieuNhapModel(
                MaPN=pn.MaPN,
                MaThuoc=item.maThuoc,
                MaLo=item.maLo,
                SoLuongNhap=item.soLuongNhap,
                DonGiaNhap=item.donGiaNhap,
                HanSuDung=item.hanSuDung,
            )
            pn.them_chi_tiet(ct)

        pn.chot_phieu()
        self.db.commit()
        self.db.refresh(pn)
        return pn

    def xoa(self, ma_id: str) -> bool:
        pn = self.doc_chi_tiet(ma_id)
        if not pn:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiếu nhập cần hủy/xóa.")
        # Trừ lại số lượng tồn kho đã nhập
        for ct in pn.chi_tiet_list:
            med = (
                self.db.query(ThuocModel)
                .filter(ThuocModel.MaThuoc == ct.MaThuoc)
                .first()
            )
            if med:
                med.TongTonKho = max(0, med.TongTonKho - ct.SoLuongNhap)
            batch = (
                self.db.query(LoThuocModel)
                .filter(
                    LoThuocModel.MaLo == ct.MaLo,
                    LoThuocModel.MaThuoc == ct.MaThuoc,
                )
                .first()
            )
            if batch:
                batch.cap_nhat_ton_lo(-ct.SoLuongNhap)

        self.db.delete(pn)
        self.db.commit()
        return True


# ==================== ENDPOINTS REST API ====================

@router.get(
    "/suppliers",
    response_model=List[NhaCungCapSchema],
    summary="Danh sách Nhà cung cấp (Bảng nhacungcap)",
)
def get_suppliers(
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY"])),
):
    items = db.query(NhaCungCapModel).all()
    return [
        NhaCungCapSchema(
            maNCC=s.MaNCC,
            tenNCC=s.TenNCC,
            soDienThoai=s.SoDienThoai,
            diaChi=s.DiaChi,
        )
        for s in items
    ]


@router.get(
    "/import-vouchers",
    response_model=List[PhieuNhapResponse],
    summary="UC007 - Xem danh sách Phiếu Nhập Kho (Read)",
)
def list_import_vouchers(
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY"])),
):
    ctrl = PhieuNhapController(db)
    return [_map_phieu_nhap(pn, db) for pn in ctrl.doc_danh_sach()]


@router.get(
    "/import-vouchers/{ma_pn}",
    response_model=PhieuNhapResponse,
    summary="UC007 - Xem chi tiết Phiếu Nhập Kho (Read)",
)
def get_import_voucher(
    ma_pn: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY"])),
):
    ctrl = PhieuNhapController(db)
    pn = ctrl.doc_chi_tiet(ma_pn)
    if not pn:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu nhập.")
    return _map_phieu_nhap(pn, db)


@router.post(
    "/import-vouchers",
    response_model=PhieuNhapResponse,
    status_code=status.HTTP_201_CREATED,
    summary="UC007 - Lập Phiếu Nhập Kho mới & Tự động cộng Tồn Kho (Create)",
)
def create_import_voucher(
    payload: PhieuNhapCreateRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY"])),
):
    ctrl = PhieuNhapController(db)
    pn = ctrl.them_moi(payload)
    return _map_phieu_nhap(pn, db)


@router.put(
    "/import-vouchers/{ma_pn}",
    response_model=PhieuNhapResponse,
    summary="UC007 - Cập nhật Phiếu Nhập Kho & Đồng bộ lại Tồn Kho (Update)",
)
def update_import_voucher(
    ma_pn: str,
    payload: PhieuNhapUpdateRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY"])),
):
    ctrl = PhieuNhapController(db)
    pn = ctrl.cap_nhat(ma_pn, payload)
    return _map_phieu_nhap(pn, db)


@router.delete(
    "/import-vouchers/{ma_pn}",
    summary="UC007 - Xóa / Hủy Phiếu Nhập Kho & Hoàn trả Tồn Kho (Delete)",
)
def delete_import_voucher(
    ma_pn: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY"])),
):
    ctrl = PhieuNhapController(db)
    ctrl.xoa(ma_pn)
    return {"success": True, "message": f"Đã hủy phiếu nhập {ma_pn} và cập nhật lại tồn kho."}
