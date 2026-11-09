-- =============================================================================
-- HỆ THỐNG QUẢN LÝ QUẦY THUỐC - DATABASE SCHEMA (SQLite 3)
-- Bám sát Mục 4.2 Thiết kế Cơ sở dữ liệu - Tài liệu SRS Phiên bản 4.0.0
-- =============================================================================

PRAGMA foreign_keys = ON;

-- =============================================================================
-- 4.2.1 NHÓM QUẢN LÝ TÀI KHOẢN (package_nguoidung)
-- =============================================================================

-- 1. Bảng vaitro (Mục 4.2.1 - Trang 48)
CREATE TABLE IF NOT EXISTS vaitro (
    MaVaiTro VARCHAR(20) NOT NULL PRIMARY KEY,
    TenVaiTro VARCHAR(50) NOT NULL
);

-- 2. Bảng taikhoan (Mục 4.2.1 - Trang 48)
CREATE TABLE IF NOT EXISTS taikhoan (
    MaTaiKhoan VARCHAR(20) NOT NULL PRIMARY KEY,
    TenDangNhap VARCHAR(50) NOT NULL UNIQUE,
    MatKhau VARCHAR(255) NOT NULL,
    HoTen VARCHAR(255) NOT NULL,
    Email VARCHAR(100) NULL UNIQUE,
    SoDienThoai VARCHAR(15) NULL UNIQUE,
    MaVaiTro VARCHAR(20) NOT NULL,
    TrangThai VARCHAR(50) NOT NULL DEFAULT 'Hoạt động',
    NgayTao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    GhiChu VARCHAR(500) NULL,
    FOREIGN KEY (MaVaiTro) REFERENCES vaitro (MaVaiTro) ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (LENGTH(TenDangNhap) >= 8),
    CHECK (TrangThai IN ('Hoạt động', 'Khóa'))
);

-- Bảng phụ lưu lịch sử thay đổi trạng thái tài khoản (Phục vụ UC004 - Bảng 2-8)
CREATE TABLE IF NOT EXISTS lichsu_trangthai_taikhoan (
    MaLichSu INTEGER PRIMARY KEY AUTOINCREMENT,
    MaTaiKhoan VARCHAR(20) NOT NULL,
    TenTaiKhoan VARCHAR(50) NOT NULL,
    TrangThaiCu VARCHAR(50) NOT NULL,
    TrangThaiMoi VARCHAR(50) NOT NULL,
    LyDo VARCHAR(500) NULL,
    NguoiThucHien VARCHAR(50) NOT NULL,
    ThoiDiem VARCHAR(30) NOT NULL,
    FOREIGN KEY (MaTaiKhoan) REFERENCES taikhoan (MaTaiKhoan) ON UPDATE CASCADE ON DELETE CASCADE
);

-- =============================================================================
-- 4.2.2 NHÓM QUẢN LÝ DANH MỤC THUỐC & TỒN KHO (package_danhmuc)
-- =============================================================================

-- 3. Bảng nhomthuoc (Mục 4.2.2 - Trang 49)
CREATE TABLE IF NOT EXISTS nhomthuoc (
    MaNhom VARCHAR(20) NOT NULL PRIMARY KEY,
    TenNhom VARCHAR(255) NOT NULL
);

-- 4. Bảng thuoc (Mục 4.2.2 - Trang 50)
CREATE TABLE IF NOT EXISTS thuoc (
    MaThuoc VARCHAR(50) NOT NULL PRIMARY KEY,
    TenThuoc VARCHAR(255) NOT NULL,
    MaNhom VARCHAR(20) NOT NULL,
    DonViTinh VARCHAR(50) NOT NULL,
    GiaBan INTEGER NOT NULL,
    TongTonKho INTEGER NOT NULL DEFAULT 0,
    TonToiThieu INTEGER NOT NULL DEFAULT 10,
    HanSuDung VARCHAR(20) NULL,
    QuyCach VARCHAR(255) NULL,
    HoatChat VARCHAR(255) NULL,
    FOREIGN KEY (MaNhom) REFERENCES nhomthuoc (MaNhom) ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (GiaBan > 0),
    CHECK (TongTonKho >= 0),
    CHECK (TonToiThieu >= 0)
);

-- 5. Bảng lothuoc (Mục 4.2.2 - Trang 50)
CREATE TABLE IF NOT EXISTS lothuoc (
    MaLo VARCHAR(50) NOT NULL,
    MaThuoc VARCHAR(50) NOT NULL,
    HanSuDung VARCHAR(20) NOT NULL,
    SoLuongTonLo INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (MaLo, MaThuoc),
    FOREIGN KEY (MaThuoc) REFERENCES thuoc (MaThuoc) ON UPDATE CASCADE ON DELETE CASCADE,
    CHECK (SoLuongTonLo >= 0)
);

-- =============================================================================
-- 4.2.3 NHÓM QUẢN LÝ NHẬP / XUẤT (package_giaodich)
-- =============================================================================

-- 6. Bảng nhacungcap (Mục 4.2.3 - Trang 51)
CREATE TABLE IF NOT EXISTS nhacungcap (
    MaNCC VARCHAR(50) NOT NULL PRIMARY KEY,
    TenNCC VARCHAR(255) NOT NULL,
    SoDienThoai VARCHAR(15) NULL,
    DiaChi VARCHAR(500) NULL
);

-- 7. Bảng phieunhap (Mục 4.2.3 - Trang 51)
CREATE TABLE IF NOT EXISTS phieunhap (
    MaPN VARCHAR(50) NOT NULL PRIMARY KEY,
    NgayNhap VARCHAR(30) NOT NULL,
    MaNCC VARCHAR(50) NOT NULL,
    NguoiLap VARCHAR(20) NOT NULL,
    TongTien INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (MaNCC) REFERENCES nhacungcap (MaNCC) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (NguoiLap) REFERENCES taikhoan (MaTaiKhoan) ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (TongTien >= 0)
);

-- 8. Bảng chitietphieunhap (Mục 4.2.3 - Trang 52)
CREATE TABLE IF NOT EXISTS chitietphieunhap (
    MaPN VARCHAR(50) NOT NULL,
    MaThuoc VARCHAR(50) NOT NULL,
    MaLo VARCHAR(50) NOT NULL,
    SoLuongNhap INTEGER NOT NULL,
    DonGiaNhap INTEGER NOT NULL,
    HanSuDung VARCHAR(20) NULL,
    PRIMARY KEY (MaPN, MaThuoc, MaLo),
    FOREIGN KEY (MaPN) REFERENCES phieunhap (MaPN) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (MaThuoc) REFERENCES thuoc (MaThuoc) ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (SoLuongNhap > 0),
    CHECK (DonGiaNhap >= 0)
);

-- 9. Bảng phieuxuat (Mục 4.2.3 - Trang 52)
CREATE TABLE IF NOT EXISTS phieuxuat (
    MaPX VARCHAR(50) NOT NULL PRIMARY KEY,
    NguoiBan VARCHAR(20) NOT NULL,
    NgayBan VARCHAR(30) NOT NULL,
    LoaiXuat VARCHAR(50) NOT NULL DEFAULT 'Bán lẻ trực tiếp',
    TenKhachHang VARCHAR(255) NULL,
    ChietKhau INTEGER NOT NULL DEFAULT 0,
    TongTien INTEGER NOT NULL DEFAULT 0,
    PhuongThucThanhToan VARCHAR(50) NOT NULL DEFAULT 'Tiền mặt',
    FOREIGN KEY (NguoiBan) REFERENCES taikhoan (MaTaiKhoan) ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (LoaiXuat IN ('Bán lẻ trực tiếp', 'Theo đơn')),
    CHECK (ChietKhau >= 0),
    CHECK (TongTien >= 0)
);

-- 10. Bảng chitietphieuxuat (Mục 4.2.3 - Trang 52)
CREATE TABLE IF NOT EXISTS chitietphieuxuat (
    MaPX VARCHAR(50) NOT NULL,
    MaThuoc VARCHAR(50) NOT NULL,
    SoLuongXuat INTEGER NOT NULL,
    DonGiaBan INTEGER NOT NULL,
    ThanhTien INTEGER NOT NULL,
    PRIMARY KEY (MaPX, MaThuoc),
    FOREIGN KEY (MaPX) REFERENCES phieuxuat (MaPX) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (MaThuoc) REFERENCES thuoc (MaThuoc) ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (SoLuongXuat > 0),
    CHECK (DonGiaBan >= 0),
    CHECK (ThanhTien = SoLuongXuat * DonGiaBan)
);
