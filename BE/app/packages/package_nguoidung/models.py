"""
Package: package_nguoidung (Mục 4.2.1, 4.3, 4.4 - SRS V4.0.0)
Bao gồm thực thể: VaiTro (bảng vaitro), TaiKhoan (bảng taikhoan) và LichSuTrangThaiTaiKhoan
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.security import hash_password


class VaiTroModel(Base):
    """Bảng vaitro - Mục 4.2.1 & Class VaiTro - Mục 4.4"""
    __tablename__ = "vaitro"

    MaVaiTro = Column(String(20), primary_key=True, index=True)
    TenVaiTro = Column(String(50), nullable=False)

    tai_khoan_list = relationship("TaiKhoanModel", back_populates="vai_tro")


class TaiKhoanModel(Base):
    """Bảng taikhoan - Mục 4.2.1 & Class Taikhoan - Mục 4.4"""
    __tablename__ = "taikhoan"

    MaTaiKhoan = Column(String(20), primary_key=True, index=True)
    TenDangNhap = Column(String(50), nullable=False, unique=True, index=True)
    MatKhau = Column(String(255), nullable=False)
    HoTen = Column(String(255), nullable=False)
    Email = Column(String(100), nullable=True, unique=True)
    SoDienThoai = Column(String(15), nullable=True, unique=True)
    MaVaiTro = Column(String(20), ForeignKey("vaitro.MaVaiTro"), nullable=False)
    TrangThai = Column(String(50), nullable=False, default="Hoạt động")
    NgayTao = Column(DateTime, nullable=False, default=datetime.now)
    GhiChu = Column(String(500), nullable=True)

    vai_tro = relationship("VaiTroModel", back_populates="tai_khoan_list")

    # Các phương thức xử lý theo thiết kế lớp Class Taikhoan (Mục 4.4 - Trang 54 SRS)
    def doi_mat_khau(self, pass_moi: str) -> bool:
        """boolean doiMatKhau(String passMoi)"""
        if not pass_moi or len(pass_moi) < 6:
            return False
        self.MatKhau = hash_password(pass_moi)
        return True

    def cap_nhat_thong_tin(self, ho_ten: str, email: str = None, sdt: str = None) -> bool:
        """boolean capNhatThongTin()"""
        if not ho_ten or not ho_ten.strip():
            return False
        self.HoTen = ho_ten.strip()
        self.Email = email
        self.SoDienThoai = sdt
        return True

    def khoa_tai_khoan(self, ly_do: str = "Khóa bởi Admin") -> None:
        """void khoaTaiKhoan()"""
        self.TrangThai = "Khóa"
        self.GhiChu = ly_do


class LichSuTrangThaiModel(Base):
    """Bảng lưu lịch sử thay đổi trạng thái tài khoản phục vụ UC004 (Bảng 2-8)"""
    __tablename__ = "lichsu_trangthai_taikhoan"

    MaLichSu = Column(Integer, primary_key=True, autoincrement=True)
    MaTaiKhoan = Column(
        String(20),
        ForeignKey("taikhoan.MaTaiKhoan", ondelete="CASCADE"),
        nullable=False,
    )
    TenTaiKhoan = Column(String(50), nullable=False)
    TrangThaiCu = Column(String(50), nullable=False)
    TrangThaiMoi = Column(String(50), nullable=False)
    LyDo = Column(String(500), nullable=True)
    NguoiThucHien = Column(String(50), nullable=False)
    ThoiDiem = Column(String(30), nullable=False)
