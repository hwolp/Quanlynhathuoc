"""
Interface chuẩn hóa <<Interface>> QuanLy<T> theo Mục 4.1 Thiết kế kiến trúc (Trang 47 SRS V4.0.0):
"Một interface generic được định nghĩa để chuẩn hóa các thao tác (Thêm, Đọc, Sửa, Xóa)
cho các Controller khác triển khai (implements)."
"""
from abc import ABC, abstractmethod
from typing import Generic, TypeVar, List, Optional

T = TypeVar("T")
ID = TypeVar("ID")


class QuanLy(ABC, Generic[T, ID]):
    """<<Interface>> QuanLy<T>"""

    @abstractmethod
    def doc_danh_sach(self, **filters) -> List[T]:
        """Đọc (Read) danh sách đối tượng"""
        raise NotImplementedError

    @abstractmethod
    def doc_chi_tiet(self, ma_id: ID) -> Optional[T]:
        """Đọc (Read) chi tiết một đối tượng theo khóa chính"""
        raise NotImplementedError

    @abstractmethod
    def them_moi(self, du_lieu: T) -> T:
        """Thêm mới (Create) đối tượng"""
        raise NotImplementedError

    @abstractmethod
    def cap_nhat(self, ma_id: ID, du_lieu: T) -> Optional[T]:
        """Sửa / Cập nhật (Update) đối tượng"""
        raise NotImplementedError

    @abstractmethod
    def xoa(self, ma_id: ID) -> bool:
        """Xóa (Delete) đối tượng"""
        raise NotImplementedError
