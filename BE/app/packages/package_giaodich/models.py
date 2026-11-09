"""
Package: package_giaodich (Mục 4.2.3, 4.3, 4.4 - SRS V4.0.0)
Bao gồm:
- Abstract Class PhieuGiaoDich (Mục 4.4 - Trang 56)
- NhaCungCap (bảng nhacungcap)
- PhieuNhap (bảng phieunhap) & ChiTietPhieuNhap (bảng chitietphieunhap)
- PhieuXuat (bảng phieuxuat) & ChiTietPhieuXuat (bảng chitietphieuxuat)
"""
from abc import abstractmethod
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class PhieuGiaoDichMixin:
    """
    Abstract Class PhieuGiaoDich (Mục 4.4 - Trang 56 SRS V4.0.0):
    1. Chứa thông tin: MaPhieu, NgayLap, tongTien
    2. Phương thức: public abstract int TinhTongTien(); public abstract void ChotPhieu();
    """

    @abstractmethod
    def tinh_tong_tien(self) -> int:
        """public abstract int TinhTongTien()"""
        raise NotImplementedError

    @abstractmethod
    def chot_phieu(self) -> None:
        """public abstract void ChotPhieu()"""
        raise NotImplementedError


class NhaCungCapModel(Base):
    """Bảng nhacungcap - Mục 4.2.3 & Class NhaCungCap - Mục 4.4"""
    __tablename__ = "nhacungcap"

    MaNCC = Column(String(50), primary_key=True, index=True)
    TenNCC = Column(String(255), nullable=False)
    SoDienThoai = Column(String(15), nullable=True)
    DiaChi = Column(String(500), nullable=True)

    def cap_nhat_thong_tin(self, ten_ncc: str, sdt: str = None, dia_chi: str = None) -> None:
        """public void CapNhatThongTin(String tenNCC, String sdt, String diaChi)"""
        self.TenNCC = ten_ncc
        self.SoDienThoai = sdt
        self.DiaChi = dia_chi


class PhieuNhapModel(Base, PhieuGiaoDichMixin):
    """Bảng phieunhap - Mục 4.2.3 & Class PhieuNhap (Kế thừa PhieuGiaoDich) - Mục 4.4"""
    __tablename__ = "phieunhap"

    MaPN = Column(String(50), primary_key=True, index=True)
    NgayNhap = Column(String(30), nullable=False)
    MaNCC = Column(String(50), ForeignKey("nhacungcap.MaNCC"), nullable=False)
    NguoiLap = Column(String(20), ForeignKey("taikhoan.MaTaiKhoan"), nullable=False)
    TongTien = Column(Integer, nullable=False, default=0)

    nha_cung_cap = relationship("NhaCungCapModel")
    chi_tiet_list = relationship(
        "ChiTietPhieuNhapModel",
        back_populates="phieu_nhap",
        cascade="all, delete-orphan",
    )

    def them_chi_tiet(self, chi_tiet: "ChiTietPhieuNhapModel") -> None:
        """public void ThemChiTiet(ChiTietPhieuNhap chiTiet)"""
        self.chi_tiet_list.append(chi_tiet)

    def tinh_tong_tien(self) -> int:
        """public int TinhTongTien()"""
        self.TongTien = sum(ct.tinh_thanh_tien_nhap() for ct in self.chi_tiet_list)
        return self.TongTien

    def chot_phieu(self) -> None:
        """public void ChotPhieu()"""
        self.tinh_tong_tien()


class ChiTietPhieuNhapModel(Base):
    """Bảng chitietphieunhap - Mục 4.2.3 & Class ChiTietPhieuNhap - Mục 4.4"""
    __tablename__ = "chitietphieunhap"

    MaPN = Column(String(50), ForeignKey("phieunhap.MaPN"), primary_key=True)
    MaThuoc = Column(String(50), ForeignKey("thuoc.MaThuoc"), primary_key=True)
    MaLo = Column(String(50), primary_key=True)
    SoLuongNhap = Column(Integer, nullable=False)
    DonGiaNhap = Column(Integer, nullable=False)
    HanSuDung = Column(String(20), nullable=True)

    phieu_nhap = relationship("PhieuNhapModel", back_populates="chi_tiet_list")
    thuoc = relationship("ThuocModel")

    def set_so_luong_va_don_gia(self, so_luong: int, don_gia: int) -> None:
        """public void SetSoLuongVaDonGia(int soLuong, int donGia)"""
        if so_luong <= 0 or don_gia < 0:
            raise ValueError("Số lượng nhập > 0 và đơn giá nhập >= 0")
        self.SoLuongNhap = so_luong
        self.DonGiaNhap = don_gia

    def tinh_thanh_tien_nhap(self) -> int:
        """public int TinhThanhTienNhap()"""
        return self.SoLuongNhap * self.DonGiaNhap


class PhieuXuatModel(Base, PhieuGiaoDichMixin):
    """Bảng phieuxuat - Mục 4.2.3 & Class PhieuXuat (Kế thừa PhieuGiaoDich) - Mục 4.4"""
    __tablename__ = "phieuxuat"

    MaPX = Column(String(50), primary_key=True, index=True)
    NguoiBan = Column(String(20), ForeignKey("taikhoan.MaTaiKhoan"), nullable=False)
    NgayBan = Column(String(30), nullable=False)
    LoaiXuat = Column(String(50), nullable=False, default="Bán lẻ trực tiếp")
    TenKhachHang = Column(String(255), nullable=True)
    ChietKhau = Column(Integer, nullable=False, default=0)
    TongTien = Column(Integer, nullable=False, default=0)
    PhuongThucThanhToan = Column(String(50), nullable=False, default="Tiền mặt")

    chi_tiet_list = relationship(
        "ChiTietPhieuXuatModel",
        back_populates="phieu_xuat",
        cascade="all, delete-orphan",
    )

    def them_chi_tiet(self, chi_tiet: "ChiTietPhieuXuatModel") -> None:
        """public void ThemChiTiet(ChiTietPhieuXuat chiTiet)"""
        self.chi_tiet_list.append(chi_tiet)

    def set_chiet_khau(self, so_tien_giam: int) -> None:
        """public void SetChietKhau(int soTien)"""
        self.ChietKhau = max(0, so_tien_giam)

    def tinh_tong_tien(self) -> int:
        """public int TinhTongTien()"""
        tam_tinh = sum(ct.get_thanh_tien() for ct in self.chi_tiet_list)
        self.TongTien = max(0, tam_tinh - (self.ChietKhau or 0))
        return self.TongTien

    def chot_phieu(self) -> None:
        """public void ChotPhieu()"""
        self.tinh_tong_tien()


class ChiTietPhieuXuatModel(Base):
    """Bảng chitietphieuxuat - Mục 4.2.3 & Class ChiTietPhieuXuat - Mục 4.4"""
    __tablename__ = "chitietphieuxuat"

    MaPX = Column(String(50), ForeignKey("phieuxuat.MaPX"), primary_key=True)
    MaThuoc = Column(String(50), ForeignKey("thuoc.MaThuoc"), primary_key=True)
    SoLuongXuat = Column(Integer, nullable=False)
    DonGiaBan = Column(Integer, nullable=False)
    ThanhTien = Column(Integer, nullable=False)

    phieu_xuat = relationship("PhieuXuatModel", back_populates="chi_tiet_list")
    thuoc = relationship("ThuocModel")

    def set_so_luong(self, so_luong: int) -> None:
        """public void SetSoLuong(int soLuong)"""
        if so_luong <= 0:
            raise ValueError("Số lượng xuất phải > 0")
        self.SoLuongXuat = so_luong
        self.ThanhTien = self.SoLuongXuat * self.DonGiaBan

    def get_thanh_tien(self) -> int:
        """public int GetThanhTien()"""
        self.ThanhTien = self.SoLuongXuat * self.DonGiaBan
        return self.ThanhTien
