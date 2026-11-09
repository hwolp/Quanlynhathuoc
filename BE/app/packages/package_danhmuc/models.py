"""
Package: package_danhmuc (Mục 4.2.2, 4.3, 4.4 - SRS V4.0.0)
Bao gồm thực thể: NhomThuoc (bảng nhomthuoc), Thuoc (bảng thuoc), LoThuoc (bảng lothuoc)
"""
from datetime import date, datetime
from sqlalchemy import Column, String, Integer, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class NhomThuocModel(Base):
    """Bảng nhomthuoc - Mục 4.2.2"""
    __tablename__ = "nhomthuoc"

    MaNhom = Column(String(20), primary_key=True, index=True)
    TenNhom = Column(String(255), nullable=False)

    thuoc_list = relationship("ThuocModel", back_populates="nhom_thuoc")


class ThuocModel(Base):
    """Bảng thuoc - Mục 4.2.2 & Class Thuoc - Mục 4.4"""
    __tablename__ = "thuoc"

    MaThuoc = Column(String(50), primary_key=True, index=True)
    TenThuoc = Column(String(255), nullable=False)
    MaNhom = Column(String(20), ForeignKey("nhomthuoc.MaNhom"), nullable=False)
    DonViTinh = Column(String(50), nullable=False)
    GiaBan = Column(Integer, nullable=False)
    TongTonKho = Column(Integer, nullable=False, default=0)
    TonToiThieu = Column(Integer, nullable=False, default=10)
    HanSuDung = Column(String(20), nullable=True)
    QuyCach = Column(String(255), nullable=True)
    HoatChat = Column(String(255), nullable=True)
    HinhAnh = Column(String(500), nullable=True)

    nhom_thuoc = relationship("NhomThuocModel", back_populates="thuoc_list")
    lo_thuoc_list = relationship(
        "LoThuocModel", back_populates="thuoc", cascade="all, delete-orphan"
    )

    # Các phương thức xử lý theo thiết kế lớp Class Thuoc (Mục 4.4 - Trang 55 SRS)
    def set_gia_ban(self, gia_moi: int) -> None:
        """public void SetGiaBan(int giaMoi)"""
        if gia_moi <= 0:
            raise ValueError("Giá bán phải là số nguyên dương (> 0).")
        self.GiaBan = gia_moi

    def thay_doi_ton_kho(self, so_luong: int) -> None:
        """public void ThayDoiTonKho(int soLuong)"""
        moi = self.TongTonKho + so_luong
        if moi < 0:
            raise ValueError("Số lượng tồn kho không đủ để xuất.")
        self.TongTonKho = moi

    def kiem_tra_can_nhap_hang(self) -> bool:
        """public boolean KiemTraCanNhapHang()"""
        return self.TongTonKho <= self.TonToiThieu


class LoThuocModel(Base):
    """Bảng lothuoc - Mục 4.2.2 & Class LoThuoc - Mục 4.4"""
    __tablename__ = "lothuoc"

    MaLo = Column(String(50), primary_key=True)
    MaThuoc = Column(String(50), ForeignKey("thuoc.MaThuoc"), primary_key=True)
    HanSuDung = Column(String(20), nullable=False)
    SoLuongTonLo = Column(Integer, nullable=False, default=0)

    thuoc = relationship("ThuocModel", back_populates="lo_thuoc_list")

    # Các phương thức xử lý theo thiết kế lớp Class LoThuoc (Mục 4.4 - Trang 56 SRS)
    def cap_nhat_ton_lo(self, so_luong: int) -> None:
        """public void CapNhatTonLo(int soLuong)"""
        self.SoLuongTonLo = max(0, self.SoLuongTonLo + so_luong)

    def kiem_tra_het_han(self) -> bool:
        """public boolean KiemTraHetHan()"""
        try:
            exp = datetime.strptime(self.HanSuDung, "%Y-%m-%d").date()
            return exp < date.today()
        except Exception:
            return False
