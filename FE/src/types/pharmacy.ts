/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Định nghĩa thực thể Dữ liệu theo Đặc tả SRS v4.0.0
 */

export type RoleType = 'ADMIN' | 'QUANLY' | 'DUOCSI';

export interface VaiTro {
  maVaiTro: RoleType;
  tenVaiTro: string;
}

export interface TaiKhoan {
  maTaiKhoan: string;
  tenDangNhap: string;
  matKhau?: string;
  hoTen: string;
  email?: string;
  soDienThoai?: string;
  maVaiTro: RoleType;
  trangThai: 'Hoạt động' | 'Khóa';
  ngayTao: string;
  ghiChu?: string;
}

export interface NhomThuoc {
  maNhom: string;
  tenNhom: string;
}

export interface Thuoc {
  maThuoc: string;
  tenThuoc: string;
  maNhom: string;
  tenNhom?: string;
  donViTinh: 'Viên' | 'Vỉ' | 'Hộp' | 'Lọ' | 'Tuýp' | 'Gói';
  giaBan: number;
  tongTonKho: number;
  tonToiThieu: number;
  hanSuDung?: string;
  quyCach?: string;
  hoatChat?: string;
  hinhAnh?: string;
  trangThaiTon?: string;
  danhSachLo?: LoThuoc[];
}

export interface LoThuoc {
  maLo: string;
  maThuoc: string;
  hanSuDung: string;
  soLuongTonLo: number;
}

export interface NhaCungCap {
  maNCC: string;
  tenNCC: string;
  soDienThoai?: string;
  diaChi?: string;
}

export interface ChiTietPhieuNhap {
  maPN: string;
  maThuoc: string;
  tenThuoc?: string;
  maLo: string;
  soLuongNhap: number;
  donGiaNhap: number;
  hanSuDung: string;
}

export interface PhieuNhap {
  maPN: string;
  ngayNhap: string;
  maNCC: string;
  nguoiLap: string;
  tenNguoiLap?: string;
  tongTien: number;
  chiTiet: ChiTietPhieuNhap[];
}

export interface ChiTietPhieuXuat {
  maPX: string;
  maThuoc: string;
  tenThuoc: string;
  donViTinh: string;
  soLuongXuat: number;
  donGiaBan: number;
  thanhTien: number;
}

export interface PhieuXuat {
  maPX: string;
  nguoiBan: string;
  tenNguoiBan?: string;
  ngayBan: string;
  loaiXuat: 'Bán lẻ trực tiếp' | 'Theo đơn';
  tenKhachHang?: string;
  chietKhau: number; // số tiền giảm
  chietKhauPhanTram?: number;
  tongTien: number; // Tổng sau chiết khấu
  phuongThucThanhToan: 'Tiền mặt' | 'Chuyển khoản';
  chiTiet: ChiTietPhieuXuat[];
}

export interface AuditLogStatus {
  id: string;
  maTaiKhoan: string;
  tenTaiKhoan: string;
  trangThaiCu: 'Hoạt động' | 'Khóa';
  trangThaiMoi: 'Hoạt động' | 'Khóa';
  lyDo: string;
  nguoiThucHien: string;
  thoiDiem: string;
}
