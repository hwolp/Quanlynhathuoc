"""
Khởi tạo dữ liệu mẫu ban đầu (Seed Data) cho Backend theo SRS V4.0.0
"""
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.packages.package_nguoidung.models import VaiTroModel, TaiKhoanModel, LichSuTrangThaiModel
from app.packages.package_danhmuc.models import NhomThuocModel, ThuocModel, LoThuocModel
from app.packages.package_giaodich.models import (
    NhaCungCapModel,
    PhieuNhapModel,
    ChiTietPhieuNhapModel,
    PhieuXuatModel,
    ChiTietPhieuXuatModel,
)

DEFAULT_IMAGES = {
    "PARA500": "/medicines/para500.jpg",
    "P_AMOX_500": "/medicines/p_amox_500.jpg",
    "AUG_625": "/medicines/aug_625.jpg",
    "BERB_100": "/medicines/berb_100.jpg",
    "VITC_500": "/medicines/vitc_500.jpg",
}


def seed_initial_data(db: Session) -> None:
    try:
        db.execute(text("ALTER TABLE thuoc ADD COLUMN HinhAnh VARCHAR(500)"))
        db.commit()
    except Exception:
        db.rollback()

    if db.query(VaiTroModel).count() > 0:
        for ma, img in DEFAULT_IMAGES.items():
            med = db.query(ThuocModel).filter(ThuocModel.MaThuoc == ma).first()
            if med and not med.HinhAnh:
                med.HinhAnh = img
        db.commit()
        return

    # 1. Vai trò (Bảng vaitro)
    roles = [
        VaiTroModel(MaVaiTro="ADMIN", TenVaiTro="Admin"),
        VaiTroModel(MaVaiTro="QUANLY", TenVaiTro="Quản lý"),
        VaiTroModel(MaVaiTro="DUOCSI", TenVaiTro="Dược sĩ"),
    ]
    db.add_all(roles)
    db.flush()

    # 2. Tài khoản (Bảng taikhoan)
    accounts = [
        TaiKhoanModel(
            MaTaiKhoan="AD001",
            TenDangNhap="admin_clin_01",
            MatKhau="admin123",
            HoTen="Lê Đăng Khánh",
            Email="khanh.ld@pharmacare.vn",
            SoDienThoai="0905111222",
            MaVaiTro="ADMIN",
            TrangThai="Hoạt động",
            NgayTao=datetime.now(),
            GhiChu="Quản trị viên hệ thống",
        ),
        TaiKhoanModel(
            MaTaiKhoan="QL001",
            TenDangNhap="manager_pharma",
            MatKhau="manager123",
            HoTen="Nguyễn Đình Hiến",
            Email="hien.nd@pharmacare.vn",
            SoDienThoai="0905333444",
            MaVaiTro="QUANLY",
            TrangThai="Hoạt động",
            NgayTao=datetime.now(),
            GhiChu="Quản lý kho dược",
        ),
        TaiKhoanModel(
            MaTaiKhoan="DS001",
            TenDangNhap="duocsi_02",
            MatKhau="duocsi123",
            HoTen="Bùi Đức Minh Phú",
            Email="phu.bdm@pharmacare.vn",
            SoDienThoai="0905555666",
            MaVaiTro="DUOCSI",
            TrangThai="Hoạt động",
            NgayTao=datetime.now(),
            GhiChu="Dược sĩ bán lẻ chính",
        ),
        TaiKhoanModel(
            MaTaiKhoan="DS002",
            TenDangNhap="duocsi_lananh",
            MatKhau="duocsi123",
            HoTen="Trần Thị Lan Anh",
            Email="lananh@pharmacare.vn",
            SoDienThoai="0905777888",
            MaVaiTro="DUOCSI",
            TrangThai="Khóa",
            NgayTao=datetime.now(),
            GhiChu="Bạn đã nghỉ việc",
        ),
    ]
    db.add_all(accounts)
    db.flush()

    # 3. Nhóm thuốc (Bảng nhomthuoc)
    categories = [
        NhomThuocModel(MaNhom="NT01", TenNhom="Thuốc giảm đau - hạ sốt"),
        NhomThuocModel(MaNhom="KS01", TenNhom="Thuốc kháng sinh"),
        NhomThuocModel(MaNhom="TH01", TenNhom="Thuốc tiêu hóa"),
        NhomThuocModel(MaNhom="HH01", TenNhom="Thuốc hô hấp"),
        NhomThuocModel(MaNhom="VT01", TenNhom="Vitamin & Khoáng chất"),
    ]
    db.add_all(categories)
    db.flush()

    # 4. Danh mục thuốc (Bảng thuoc)
    medicines = [
        ThuocModel(
            MaThuoc="PARA500",
            TenThuoc="Paracetamol 500mg",
            MaNhom="NT01",
            DonViTinh="Hộp",
            GiaBan=45000,
            TongTonKho=120,
            TonToiThieu=20,
            HanSuDung="2027-06-30",
            QuyCach="Hộp 10 vỉ x 10 viên",
            HoatChat="Paracetamol 500mg",
            HinhAnh="/medicines/para500.jpg",
        ),
        ThuocModel(
            MaThuoc="P_AMOX_500",
            TenThuoc="Amoxicillin 500mg",
            MaNhom="KS01",
            DonViTinh="Hộp",
            GiaBan=85000,
            TongTonKho=8,
            TonToiThieu=15,
            HanSuDung="2026-12-31",
            QuyCach="Hộp 10 vỉ x 10 viên nang",
            HoatChat="Amoxicillin trihydrate",
            HinhAnh="/medicines/p_amox_500.jpg",
        ),
        ThuocModel(
            MaThuoc="AUG_625",
            TenThuoc="Augmentin 625mg",
            MaNhom="KS01",
            DonViTinh="Hộp",
            GiaBan=210000,
            TongTonKho=45,
            TonToiThieu=10,
            HanSuDung="2027-08-15",
            QuyCach="Hộp 2 vỉ x 7 viên",
            HoatChat="Amoxicillin + Clavulanic acid",
            HinhAnh="/medicines/aug_625.jpg",
        ),
        ThuocModel(
            MaThuoc="BERB_100",
            TenThuoc="Berberin 100mg",
            MaNhom="TH01",
            DonViTinh="Lọ",
            GiaBan=25000,
            TongTonKho=0,
            TonToiThieu=10,
            HanSuDung="2026-11-25",
            QuyCach="Lọ 100 viên bao đường",
            HoatChat="Berberin clorid",
            HinhAnh="/medicines/berb_100.jpg",
        ),
        ThuocModel(
            MaThuoc="VITC_500",
            TenThuoc="Vitamin C 500mg Sủi",
            MaNhom="VT01",
            DonViTinh="Tuýp",
            GiaBan=35000,
            TongTonKho=65,
            TonToiThieu=15,
            HanSuDung="2027-10-01",
            QuyCach="Tuýp 20 viên sủi",
            HoatChat="Acid Ascorbic 500mg",
            HinhAnh="/medicines/vitc_500.jpg",
        ),
    ]
    db.add_all(medicines)
    db.flush()

    # 5. Lô thuốc (Bảng lothuoc)
    batches = [
        LoThuocModel(MaLo="LOT24A", MaThuoc="PARA500", HanSuDung="2027-06-30", SoLuongTonLo=120),
        LoThuocModel(MaLo="LOT24B", MaThuoc="P_AMOX_500", HanSuDung="2026-12-31", SoLuongTonLo=8),
        LoThuocModel(MaLo="LOT24C", MaThuoc="AUG_625", HanSuDung="2027-08-15", SoLuongTonLo=45),
        LoThuocModel(MaLo="LOT24D", MaThuoc="BERB_100", HanSuDung="2026-11-25", SoLuongTonLo=0),
        LoThuocModel(MaLo="LOT24E", MaThuoc="VITC_500", HanSuDung="2027-10-01", SoLuongTonLo=65),
    ]
    db.add_all(batches)
    db.flush()

    # 6. Nhà cung cấp (Bảng nhacungcap)
    suppliers = [
        NhaCungCapModel(
            MaNCC="NCC001",
            TenNCC="Công ty Cổ phần Dược phẩm TW1 (Pharbaco)",
            SoDienThoai="02438254567",
            DiaChi="160 Tôn Đức Thắng, Đống Đa, Hà Nội",
        ),
        NhaCungCapModel(
            MaNCC="NCC002",
            TenNCC="Công ty Cổ phần Dược Hậu Giang (DHG Pharma)",
            SoDienThoai="02923891433",
            DiaChi="288 Bis Nguyễn Văn Cừ, Ninh Kiều, Cần Thơ",
        ),
    ]
    db.add_all(suppliers)
    db.flush()

    # 7. Phiếu nhập mẫu (Bảng phieunhap & chitietphieunhap)
    pn1 = PhieuNhapModel(
        MaPN="PN261101_01",
        NgayNhap="2026-11-01 08:30",
        MaNCC="NCC001",
        NguoiLap="QL001",
        TongTien=3600000,
    )
    pn1.chi_tiet_list.append(
        ChiTietPhieuNhapModel(
            MaPN="PN261101_01",
            MaThuoc="PARA500",
            MaLo="LOT24A",
            SoLuongNhap=120,
            DonGiaNhap=30000,
            HanSuDung="2027-06-30",
        )
    )
    db.add(pn1)

    # 8. Phiếu xuất mẫu (Bảng phieuxuat & chitietphieuxuat)
    px1 = PhieuXuatModel(
        MaPX="PX261108_101",
        NguoiBan="DS001",
        NgayBan="2026-11-08 10:15",
        LoaiXuat="Bán lẻ trực tiếp",
        TenKhachHang="Nguyễn Văn Bình",
        ChietKhau=0,
        TongTien=300000,
        PhuongThucThanhToan="Tiền mặt",
    )
    px1.chi_tiet_list.append(
        ChiTietPhieuXuatModel(
            MaPX="PX261108_101",
            MaThuoc="PARA500",
            SoLuongXuat=2,
            DonGiaBan=45000,
            ThanhTien=90000,
        )
    )
    px1.chi_tiet_list.append(
        ChiTietPhieuXuatModel(
            MaPX="PX261108_101",
            MaThuoc="AUG_625",
            SoLuongXuat=1,
            DonGiaBan=210000,
            ThanhTien=210000,
        )
    )
    db.add(px1)

    # 9. Nhật ký khóa tài khoản mẫu
    db.add(
        LichSuTrangThaiModel(
            MaTaiKhoan="DS002",
            TenTaiKhoan="duocsi_lananh",
            TrangThaiCu="Hoạt động",
            TrangThaiMoi="Khóa",
            LyDo="Bạn đã nghỉ việc",
            NguoiThucHien="admin_clin_01",
            ThoiDiem="24/02/2026 09:15",
        )
    )

    db.commit()
