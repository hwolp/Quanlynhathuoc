"""
TaiKhoanController (Mục 4.1 Thiết kế kiến trúc - Trang 46 SRS V4.0.0):
"Xử lý logic đăng nhập, tạo tài khoản, đổi trạng thái và phân quyền."
Triển khai <<Interface>> QuanLy<TaiKhoan>
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.core.security import verify_password, hash_password, create_mock_jwt_token, get_current_user, require_roles, security_scheme
from app.interfaces.quan_ly import QuanLy
from app.packages.package_nguoidung.models import TaiKhoanModel, LichSuTrangThaiModel
from app.packages.package_nguoidung.schemas import (
    LoginRequest,
    LoginResponse,
    RegisterAccountRequest,
    UpdateAccountRequest,
    UpdateRoleRequest,
    UpdateStatusRequest,
    TaiKhoanResponse,
    AuditLogStatusResponse,
)

router = APIRouter(tags=["1. Quản lý Tài khoản & Xác thực (UC001 - UC004)"])


def _to_response(acc: TaiKhoanModel) -> TaiKhoanResponse:
    ngay_tao_str = (
        acc.NgayTao.strftime("%Y-%m-%d %H:%M")
        if isinstance(acc.NgayTao, datetime)
        else str(acc.NgayTao)
    )
    return TaiKhoanResponse(
        maTaiKhoan=acc.MaTaiKhoan,
        tenDangNhap=acc.TenDangNhap,
        hoTen=acc.HoTen,
        email=acc.Email,
        soDienThoai=acc.SoDienThoai,
        maVaiTro=acc.MaVaiTro,
        trangThai=acc.TrangThai,
        ngayTao=ngay_tao_str,
        ghiChu=acc.GhiChu,
    )


class TaiKhoanController(QuanLy[TaiKhoanModel, str]):
    """Controller điều phối nghiệp vụ Tài khoản (UC001, UC002, UC003, UC004)"""

    def __init__(self, db: Session):
        self.db = db

    def doc_danh_sach(self, keyword: Optional[str] = None) -> List[TaiKhoanModel]:
        query = self.db.query(TaiKhoanModel)
        if keyword and keyword.strip():
            kw = f"%{keyword.strip()}%"
            query = query.filter(
                or_(
                    TaiKhoanModel.MaTaiKhoan.ilike(kw),
                    TaiKhoanModel.TenDangNhap.ilike(kw),
                    TaiKhoanModel.HoTen.ilike(kw),
                    TaiKhoanModel.Email.ilike(kw),
                )
            )
        return query.order_by(TaiKhoanModel.MaTaiKhoan.asc()).all()

    def doc_chi_tiet(self, ma_id: str) -> Optional[TaiKhoanModel]:
        return (
            self.db.query(TaiKhoanModel)
            .filter(TaiKhoanModel.MaTaiKhoan == ma_id)
            .first()
        )

    def them_moi(self, payload: RegisterAccountRequest) -> TaiKhoanModel:
        existing = (
            self.db.query(TaiKhoanModel)
            .filter(TaiKhoanModel.TenDangNhap == payload.tenDangNhap.strip())
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Tên đăng nhập đã tồn tại trong hệ thống.",
            )
        if payload.email and payload.email.strip():
            dup_email = (
                self.db.query(TaiKhoanModel)
                .filter(TaiKhoanModel.Email == payload.email.strip())
                .first()
            )
            if dup_email:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Địa chỉ Email đã được sử dụng bởi tài khoản khác.",
                )
        if payload.soDienThoai and payload.soDienThoai.strip():
            dup_phone = (
                self.db.query(TaiKhoanModel)
                .filter(TaiKhoanModel.SoDienThoai == payload.soDienThoai.strip())
                .first()
            )
            if dup_phone:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Số điện thoại đã được sử dụng bởi tài khoản khác.",
                )

        prefix = (
            "AD"
            if payload.maVaiTro == "ADMIN"
            else "QL"
            if payload.maVaiTro == "QUANLY"
            else "DS"
        )
        count = (
            self.db.query(TaiKhoanModel)
            .filter(TaiKhoanModel.MaVaiTro == payload.maVaiTro)
            .count()
            + 1
        )
        ma_tk = f"{prefix}{count:03d}"
        while self.doc_chi_tiet(ma_tk):
            count += 1
            ma_tk = f"{prefix}{count:03d}"

        new_acc = TaiKhoanModel(
            MaTaiKhoan=ma_tk,
            TenDangNhap=payload.tenDangNhap.strip(),
            MatKhau=hash_password(payload.matKhau),
            HoTen=payload.hoTen.strip(),
            Email=payload.email.strip() if payload.email else None,
            SoDienThoai=payload.soDienThoai.strip() if payload.soDienThoai else None,
            MaVaiTro=payload.maVaiTro,
            TrangThai="Hoạt động",
            NgayTao=datetime.now(),
            GhiChu=payload.ghiChu,
        )
        self.db.add(new_acc)
        self.db.commit()
        self.db.refresh(new_acc)
        return new_acc

    def cap_nhat(self, ma_id: str, payload: UpdateAccountRequest) -> TaiKhoanModel:
        acc = self.doc_chi_tiet(ma_id)
        if not acc:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")
        if payload.email and payload.email.strip():
            dup_email = (
                self.db.query(TaiKhoanModel)
                .filter(
                    TaiKhoanModel.Email == payload.email.strip(),
                    TaiKhoanModel.MaTaiKhoan != ma_id,
                )
                .first()
            )
            if dup_email:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Địa chỉ Email đã được sử dụng bởi tài khoản khác.",
                )
        if payload.soDienThoai and payload.soDienThoai.strip():
            dup_phone = (
                self.db.query(TaiKhoanModel)
                .filter(
                    TaiKhoanModel.SoDienThoai == payload.soDienThoai.strip(),
                    TaiKhoanModel.MaTaiKhoan != ma_id,
                )
                .first()
            )
            if dup_phone:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Số điện thoại đã được sử dụng bởi tài khoản khác.",
                )
        acc.cap_nhat_thong_tin(
            ho_ten=payload.hoTen,
            email=payload.email.strip() if payload.email else None,
            sdt=payload.soDienThoai.strip() if payload.soDienThoai else None,
        )
        if payload.matKhauMoi:
            acc.doi_mat_khau(payload.matKhauMoi)
        if payload.maVaiTro:
            acc.MaVaiTro = payload.maVaiTro
        if payload.trangThai:
            acc.TrangThai = payload.trangThai
        if payload.ghiChu is not None:
            acc.GhiChu = payload.ghiChu

        self.db.commit()
        self.db.refresh(acc)
        return acc

    def xoa(self, ma_id: str) -> bool:
        acc = self.doc_chi_tiet(ma_id)
        if not acc:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản cần xóa.")
        self.db.query(LichSuTrangThaiModel).filter(
            LichSuTrangThaiModel.MaTaiKhoan == ma_id
        ).delete()
        self.db.delete(acc)
        self.db.commit()
        return True


# ==================== ENDPOINTS REST API ====================

@router.post("/auth/login", response_model=LoginResponse, summary="UC001 - Đăng nhập hệ thống")
def login_endpoint(payload: LoginRequest, db: Session = Depends(get_db)):
    acc = (
        db.query(TaiKhoanModel)
        .filter(TaiKhoanModel.TenDangNhap == payload.tenDangNhap.strip())
        .first()
    )
    if not acc or not verify_password(payload.matKhau, acc.MatKhau):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản hoặc mật khẩu chưa đúng.",
        )
    if acc.TrangThai == "Khóa":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Tài khoản đã bị khóa. Lý do: {acc.GhiChu or 'Liên hệ quản trị viên.'}",
        )
    token = create_mock_jwt_token(acc.MaTaiKhoan, acc.TenDangNhap, acc.MaVaiTro)
    return LoginResponse(
        success=True,
        accessToken=token,
        user=_to_response(acc),
    )


@router.post(
    "/accounts",
    response_model=TaiKhoanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="UC002 & UC003 - Đăng ký / Tạo tài khoản mới (Admin)",
)
def register_account(
    payload: RegisterAccountRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN"])),
):
    ctrl = TaiKhoanController(db)
    acc = ctrl.them_moi(payload)
    return _to_response(acc)


@router.get(
    "/accounts",
    response_model=List[TaiKhoanResponse],
    summary="UC003 - Xem danh sách & Tìm kiếm tài khoản (Admin)",
)
def list_accounts(
    search: Optional[str] = Query(default=None, description="Tìm theo mã, tên đăng nhập, họ tên, email"),
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY"])),
):
    ctrl = TaiKhoanController(db)
    return [_to_response(a) for a in ctrl.doc_danh_sach(keyword=search)]


@router.get(
    "/accounts/{ma_tai_khoan}",
    response_model=TaiKhoanResponse,
    summary="UC003 - Xem chi tiết tài khoản (Hình 2-7)",
)
def get_account_detail(
    ma_tai_khoan: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN", "QUANLY"])),
):
    ctrl = TaiKhoanController(db)
    acc = ctrl.doc_chi_tiet(ma_tai_khoan)
    if not acc:
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại.")
    return _to_response(acc)


@router.put(
    "/accounts/{ma_tai_khoan}",
    response_model=TaiKhoanResponse,
    summary="UC003 - Sửa thông tin tài khoản (Hình 2-8)",
)
def update_account(
    ma_tai_khoan: str,
    payload: UpdateAccountRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN"])),
):
    ctrl = TaiKhoanController(db)
    acc = ctrl.cap_nhat(ma_tai_khoan, payload)
    return _to_response(acc)


@router.patch(
    "/accounts/{ma_tai_khoan}/role",
    response_model=TaiKhoanResponse,
    summary="UC003 - Phân quyền tài khoản (Hình 2-10)",
)
def change_account_role(
    ma_tai_khoan: str,
    payload: UpdateRoleRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN"])),
):
    ctrl = TaiKhoanController(db)
    acc = ctrl.doc_chi_tiet(ma_tai_khoan)
    if not acc:
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại.")
    acc.MaVaiTro = payload.maVaiTro
    db.commit()
    db.refresh(acc)
    return _to_response(acc)


@router.patch(
    "/accounts/{ma_tai_khoan}/status",
    response_model=TaiKhoanResponse,
    summary="UC004 - Quản lý trạng thái tài khoản: Khóa / Mở khóa (Bảng 2-7 & 2-8)",
)
def change_account_status(
    ma_tai_khoan: str,
    payload: UpdateStatusRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN"])),
):
    ctrl = TaiKhoanController(db)
    acc = ctrl.doc_chi_tiet(ma_tai_khoan)
    if not acc:
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại.")

    old_status = acc.TrangThai
    acc.TrangThai = payload.trangThaiMoi
    if payload.lyDo:
        acc.GhiChu = payload.lyDo

    thoi_diem = datetime.now().strftime("%d/%m/%Y %H:%M")
    log_entry = LichSuTrangThaiModel(
        MaTaiKhoan=acc.MaTaiKhoan,
        TenTaiKhoan=acc.TenDangNhap,
        TrangThaiCu=old_status,
        TrangThaiMoi=payload.trangThaiMoi,
        LyDo=payload.lyDo or ("Khóa bảo mật" if payload.trangThaiMoi == "Khóa" else "Mở khóa tài khoản"),
        NguoiThucHien=payload.nguoiThucHien,
        ThoiDiem=thoi_diem,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(acc)
    return _to_response(acc)


@router.delete(
    "/accounts/{ma_tai_khoan}",
    summary="UC003 - Xóa tài khoản (Hình 2-9)",
)
def delete_account(
    ma_tai_khoan: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["ADMIN"])),
):
    if current_user and current_user.MaTaiKhoan == ma_tai_khoan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa tài khoản Admin đang đăng nhập.",
        )
    ctrl = TaiKhoanController(db)
    ctrl.xoa(ma_tai_khoan)
    return {"success": True, "message": f"Đã xóa tài khoản {ma_tai_khoan} thành công."}


@router.get(
    "/accounts-status-logs",
    response_model=List[AuditLogStatusResponse],
    summary="UC004 - Xem lịch sử thay đổi trạng thái tài khoản",
)
def get_status_audit_logs(
    db: Session = Depends(get_db),
    _user=Depends(require_roles(["ADMIN"])),
):
    logs = (
        db.query(LichSuTrangThaiModel)
        .order_by(LichSuTrangThaiModel.MaLichSu.desc())
        .all()
    )
    return [
        AuditLogStatusResponse(
            id=f"LOG_{l.MaLichSu}",
            maTaiKhoan=l.MaTaiKhoan,
            tenTaiKhoan=l.TenTaiKhoan,
            trangThaiCu=l.TrangThaiCu,
            trangThaiMoi=l.TrangThaiMoi,
            lyDo=l.LyDo or "",
            nguoiThucHien=l.NguoiThucHien,
            thoiDiem=l.ThoiDiem,
        )
        for l in logs
    ]


@router.get("/auth/me", response_model=TaiKhoanResponse, summary="Thông tin phiên đăng nhập hiện tại")
def current_session(credentials=Depends(security_scheme), current_user=Depends(get_current_user)):
    if not credentials or not current_user or credentials.credentials != create_mock_jwt_token(current_user.MaTaiKhoan, current_user.TenDangNhap, current_user.MaVaiTro):
        raise HTTPException(status_code=401, detail="Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.")
    return _to_response(current_user)
