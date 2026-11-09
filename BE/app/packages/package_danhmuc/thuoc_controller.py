"""
ThuocController & TonKhoController (Mục 4.1 Thiết kế kiến trúc - Trang 46 SRS V4.0.0):
- ThuocController: Tiếp nhận thao tác thêm, sửa, xóa, tìm kiếm thuốc (UC008).
- TonKhoController: Tra cứu tồn kho (UC005) và trích xuất dữ liệu cảnh báo thuốc sắp hết/hết hạn.
Triển khai <<Interface>> QuanLy<Thuoc>
"""
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.core.security import require_roles
from app.interfaces.quan_ly import QuanLy
from app.packages.package_danhmuc.models import NhomThuocModel, ThuocModel, LoThuocModel
from app.packages.package_giaodich.models import ChiTietPhieuNhapModel, ChiTietPhieuXuatModel
from app.packages.package_danhmuc.schemas import (
    NhomThuocSchema,
    LoThuocSchema,
    ThuocCreateRequest,
    ThuocUpdateRequest,
    ThuocResponse,
    InventoryAlertsResponse,
)

router = APIRouter(tags=["2. Danh mục Thuốc & Tra cứu Tồn kho (UC005, UC008)"])


DEFAULT_MEDICINE_IMAGES = {
    "PARA500": "/medicines/para500.jpg",
    "P_AMOX_500": "/medicines/p_amox_500.jpg",
    "AUG_625": "/medicines/aug_625.jpg",
    "BERB_100": "/medicines/berb_100.jpg",
    "VITC_500": "/medicines/vitc_500.jpg",
}


def _map_thuoc_response(m: ThuocModel, include_batches: bool = False) -> ThuocResponse:
    if m.TongTonKho <= 0:
        trang_thai = "Hết"
    elif m.TongTonKho <= m.TonToiThieu:
        trang_thai = "Sắp hết"
    else:
        trang_thai = "Còn"

    batches = None
    if include_batches:
        batches = [
            LoThuocSchema(
                maLo=b.MaLo,
                maThuoc=b.MaThuoc,
                hanSuDung=b.HanSuDung,
                soLuongTonLo=b.SoLuongTonLo,
            )
            for b in m.lo_thuoc_list
        ]

    return ThuocResponse(
        maThuoc=m.MaThuoc,
        tenThuoc=m.TenThuoc,
        maNhom=m.MaNhom,
        tenNhom=m.nhom_thuoc.TenNhom if m.nhom_thuoc else m.MaNhom,
        donViTinh=m.DonViTinh,
        giaBan=m.GiaBan,
        tongTonKho=m.TongTonKho,
        tonToiThieu=m.TonToiThieu,
        hanSuDung=m.HanSuDung,
        quyCach=m.QuyCach,
        hoatChat=m.HoatChat,
        hinhAnh=getattr(m, "HinhAnh", None) or DEFAULT_MEDICINE_IMAGES.get(m.MaThuoc),
        trangThaiTon=trang_thai,
        danhSachLo=batches,
    )


class ThuocController(QuanLy[ThuocModel, str]):
    """Controller Quản lý Danh mục Thuốc (UC008)"""

    def __init__(self, db: Session):
        self.db = db

    def doc_danh_sach(
        self,
        keyword: Optional[str] = None,
        ma_nhom: Optional[str] = None,
        trang_thai_ton: Optional[str] = None,
        nguong_ton_toi_thieu: Optional[int] = None,
    ) -> List[ThuocModel]:
        query = self.db.query(ThuocModel)
        if keyword and keyword.strip():
            kw = f"%{keyword.strip()}%"
            query = query.filter(
                or_(
                    ThuocModel.MaThuoc.ilike(kw),
                    ThuocModel.TenThuoc.ilike(kw),
                    ThuocModel.HoatChat.ilike(kw),
                )
            )
        if ma_nhom and ma_nhom != "ALL":
            query = query.filter(ThuocModel.MaNhom == ma_nhom)

        items = query.order_by(ThuocModel.MaThuoc.asc()).all()

        # Lọc theo Bảng 2-10 (UC005: Trạng thái tồn kho & Ngưỡng tồn tối thiểu)
        result = []
        for item in items:
            threshold = (
                nguong_ton_toi_thieu
                if nguong_ton_toi_thieu is not None
                else item.TonToiThieu
            )
            if trang_thai_ton == "Hết" and item.TongTonKho > 0:
                continue
            if trang_thai_ton == "Sắp hết" and not (0 < item.TongTonKho <= threshold):
                continue
            if trang_thai_ton == "Còn" and item.TongTonKho <= threshold:
                continue
            result.append(item)
        return result

    def doc_chi_tiet(self, ma_id: str) -> Optional[ThuocModel]:
        return (
            self.db.query(ThuocModel)
            .filter(ThuocModel.MaThuoc == ma_id)
            .first()
        )

    def them_moi(self, payload: ThuocCreateRequest) -> ThuocModel:
        ma = payload.maThuoc.strip().upper()
        if self.doc_chi_tiet(ma):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Mã thuốc đã tồn tại trong danh mục (Bảng 2-15 5a).",
            )
        med = ThuocModel(
            MaThuoc=ma,
            TenThuoc=payload.tenThuoc.strip(),
            MaNhom=payload.maNhom,
            DonViTinh=payload.donViTinh,
            GiaBan=payload.giaBan,
            TongTonKho=0,
            TonToiThieu=payload.tonToiThieu,
            HanSuDung=payload.hanSuDung,
            QuyCach=payload.quyCach,
            HoatChat=payload.hoatChat,
            HinhAnh=payload.hinhAnh or DEFAULT_MEDICINE_IMAGES.get(ma),
        )
        self.db.add(med)
        self.db.commit()
        self.db.refresh(med)
        return med

    def cap_nhat(self, ma_id: str, payload: ThuocUpdateRequest) -> ThuocModel:
        med = self.doc_chi_tiet(ma_id)
        if not med:
            raise HTTPException(status_code=404, detail="Không tìm thấy thuốc.")
        med.TenThuoc = payload.tenThuoc.strip()
        med.set_gia_ban(payload.giaBan)
        med.TonToiThieu = payload.tonToiThieu
        if payload.maNhom:
            med.MaNhom = payload.maNhom
        if payload.donViTinh:
            med.DonViTinh = payload.donViTinh
        if payload.hanSuDung is not None:
            med.HanSuDung = payload.hanSuDung
        if payload.quyCach is not None:
            med.QuyCach = payload.quyCach
        if payload.hoatChat is not None:
            med.HoatChat = payload.hoatChat
        if payload.hinhAnh is not None:
            med.HinhAnh = payload.hinhAnh

        self.db.commit()
        self.db.refresh(med)
        return med

    def xoa(self, ma_id: str) -> bool:
        med = self.doc_chi_tiet(ma_id)
        if not med:
            raise HTTPException(status_code=404, detail="Không tìm thấy thuốc cần xóa.")
        has_imports = (
            self.db.query(ChiTietPhieuNhapModel)
            .filter(ChiTietPhieuNhapModel.MaThuoc == ma_id)
            .first()
        )
        has_exports = (
            self.db.query(ChiTietPhieuXuatModel)
            .filter(ChiTietPhieuXuatModel.MaThuoc == ma_id)
            .first()
        )
        if med.TongTonKho > 0 or has_imports or has_exports:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể xóa thuốc còn tồn kho hoặc đã phát sinh giao dịch nhập/xuất.",
            )
        self.db.delete(med)
        self.db.commit()
        return True


class TonKhoController:
    """Controller Giám sát & Cảnh báo Tồn kho (UC005 - Mục 4.1 SRS)"""

    def __init__(self, db: Session):
        self.db = db

    def lay_canh_bao_ton_kho(self, days_threshold: int = 90) -> InventoryAlertsResponse:
        all_meds = self.db.query(ThuocModel).all()
        low_stock = [
            _map_thuoc_response(m)
            for m in all_meds
            if m.kiem_tra_can_nhap_hang()
        ]
        expiring = []
        today = date.today()
        for m in all_meds:
            if m.HanSuDung:
                try:
                    exp_date = datetime.strptime(m.HanSuDung, "%Y-%m-%d").date()
                    if (exp_date - today).days <= days_threshold:
                        expiring.append(_map_thuoc_response(m))
                except Exception:
                    pass
        return InventoryAlertsResponse(
            tongThuocSapHet=len(low_stock),
            tongThuocSapHetHan=len(expiring),
            danhSachSapHet=low_stock,
            danhSachSapHetHan=expiring,
        )


# ==================== ENDPOINTS REST API ====================

@router.get(
    "/categories",
    response_model=List[NhomThuocSchema],
    summary="Danh sách Nhóm thuốc (Bảng nhomthuoc)",
)
def get_categories(
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY", "DUOCSI"])),
):
    cats = db.query(NhomThuocModel).all()
    return [NhomThuocSchema(maNhom=c.MaNhom, tenNhom=c.TenNhom) for c in cats]


@router.get(
    "/medicines",
    response_model=List[ThuocResponse],
    summary="UC005 & UC008 - Tra cứu danh mục thuốc & lọc tồn kho (Bảng 2-10)",
)
def list_medicines(
    search: Optional[str] = Query(default=None, description="Từ khóa mã/tên thuốc (Bảng 2-10)"),
    maNhom: Optional[str] = Query(default=None, description="Lọc theo nhóm dược phẩm"),
    trangThaiTon: Optional[str] = Query(
        default=None, description="Lọc trạng thái tồn: Còn | Sắp hết | Hết"
    ),
    nguongTonToiThieu: Optional[int] = Query(
        default=None, gt=0, description="Ngưỡng tồn tối thiểu tùy chỉnh (>0)"
    ),
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY", "DUOCSI"])),
):
    ctrl = ThuocController(db)
    meds = ctrl.doc_danh_sach(
        keyword=search,
        ma_nhom=maNhom,
        trang_thai_ton=trangThaiTon,
        nguong_ton_toi_thieu=nguongTonToiThieu,
    )
    return [_map_thuoc_response(m, include_batches=True) for m in meds]


@router.get(
    "/medicines/{ma_thuoc}",
    response_model=ThuocResponse,
    summary="UC005 - Xem chi tiết thuốc & các lô tồn kho (Bảng 2-9 STT 3, 4)",
)
def get_medicine_detail(
    ma_thuoc: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY", "DUOCSI"])),
):
    ctrl = ThuocController(db)
    med = ctrl.doc_chi_tiet(ma_thuoc)
    if not med:
        raise HTTPException(status_code=404, detail="Không tìm thấy thuốc trong kho.")
    return _map_thuoc_response(med, include_batches=True)


@router.post(
    "/medicines",
    response_model=ThuocResponse,
    status_code=status.HTTP_201_CREATED,
    summary="UC008 - Thêm thuốc mới vào danh mục (Bảng 2-15 & 2-16)",
)
def create_medicine(
    payload: ThuocCreateRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY"])),
):
    ctrl = ThuocController(db)
    med = ctrl.them_moi(payload)
    return _map_thuoc_response(med, include_batches=True)


@router.put(
    "/medicines/{ma_thuoc}",
    response_model=ThuocResponse,
    summary="UC008 - Cập nhật thông tin thuốc",
)
def update_medicine(
    ma_thuoc: str,
    payload: ThuocUpdateRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY"])),
):
    ctrl = ThuocController(db)
    med = ctrl.cap_nhat(ma_thuoc, payload)
    return _map_thuoc_response(med, include_batches=True)


@router.delete(
    "/medicines/{ma_thuoc}",
    summary="UC008 - Xóa thuốc khỏi danh mục",
)
def delete_medicine(
    ma_thuoc: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY"])),
):
    ctrl = ThuocController(db)
    ctrl.xoa(ma_thuoc)
    return {"success": True, "message": f"Đã xóa thuốc {ma_thuoc} khỏi danh mục."}


@router.get(
    "/inventory/alerts",
    response_model=InventoryAlertsResponse,
    summary="UC005 - Cảnh báo thuốc sắp hết hàng & sắp hết hạn (Hình 4-12)",
)
def get_inventory_alerts(
    daysThreshold: int = Query(default=90, gt=0),
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY", "DUOCSI"])),
):
    ctrl = TonKhoController(db)
    return ctrl.lay_canh_bao_ton_kho(days_threshold=daysThreshold)


@router.get(
    "/inventory/batches",
    response_model=List[LoThuocSchema],
    summary="UC005 - Danh sách toàn bộ Lô thuốc (Bảng lothuoc)",
)
def list_batches(
    maThuoc: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY", "DUOCSI"])),
):
    q = db.query(LoThuocModel)
    if maThuoc:
        q = q.filter(LoThuocModel.MaThuoc == maThuoc)
    batches = q.all()
    return [
        LoThuocSchema(
            maLo=b.MaLo,
            maThuoc=b.MaThuoc,
            hanSuDung=b.HanSuDung,
            soLuongTonLo=b.SoLuongTonLo,
        )
        for b in batches
    ]
