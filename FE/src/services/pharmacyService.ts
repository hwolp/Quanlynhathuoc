import { request, query, readSession, saveSession, clearSession } from './apiClient';
import type { TaiKhoan, NhomThuoc, Thuoc, LoThuoc, NhaCungCap, PhieuNhap, PhieuXuat, AuditLogStatus, RoleType } from '../types/pharmacy';
const id = encodeURIComponent;
const send = <T>(path:string, method:string, body?:unknown) => request<T>(path,{method, body:body === undefined ? undefined : JSON.stringify(body)});
export function getCurrentUser() { return readSession()?.user || null; }
export async function restoreSession() {
  if (!readSession()) return null;
  const user = await request<TaiKhoan>('/auth/me');
  saveSession({accessToken:readSession()!.accessToken,user});
  return user;
}
export async function login(username:string,password:string) {
  const response=await send<{success:boolean;accessToken:string;user:TaiKhoan;message?:string}>('/auth/login','POST',{tenDangNhap:username.trim(),matKhau:password});
  saveSession({accessToken:response.accessToken,user:response.user});
  return response;
}
export function logout() { clearSession(); }
export const getAccounts = () => request<TaiKhoan[]>('/accounts');
export const getAccountDetail = (code:string) => request<TaiKhoan>(`/accounts/${id(code)}`);
export const getAuditLogs = () => request<AuditLogStatus[]>('/accounts-status-logs');
export async function createAccount(data:Omit<TaiKhoan,'maTaiKhoan'|'ngayTao'|'trangThai'> & {xacNhanMatKhau?:string}) { return {success:true,account:await send<TaiKhoan>('/accounts','POST',data),message:''}; }
export async function updateAccount(data:TaiKhoan & {xacNhanMatKhau?:string}) {
 const {matKhau,xacNhanMatKhau,...fields}=data;
 const updated=await send<TaiKhoan>(`/accounts/${id(data.maTaiKhoan)}`,'PUT',{...fields,matKhauMoi:matKhau || undefined,xacNhanMatKhau:xacNhanMatKhau || undefined});
 const session=readSession();if(session?.user.maTaiKhoan===updated.maTaiKhoan) saveSession({...session,user:updated});
 return true;
}
export async function deleteAccount(code:string) {
 if(code===getCurrentUser()?.maTaiKhoan) throw new Error('Không thể xóa tài khoản đang đăng nhập.');
 await send(`/accounts/${id(code)}`,'DELETE');return {success:true,message:''};
}
export async function updateAccountRole(code:string,role:RoleType) { await send(`/accounts/${id(code)}/role`,'PATCH',{maVaiTro:role});return true; }
export async function updateAccountStatus(code:string,status:'Hoạt động'|'Khóa',reason:string,actor:string) { await send(`/accounts/${id(code)}/status`,'PATCH',{trangThaiMoi:status,lyDo:reason,nguoiThucHien:actor});return true; }
const DEFAULT_MEDICINE_IMAGES: Record<string, string> = {
  PARA500: '/medicines/para500.jpg',
  P_AMOX_500: '/medicines/p_amox_500.jpg',
  AUG_625: '/medicines/aug_625.jpg',
  BERB_100: '/medicines/berb_100.jpg',
  VITC_500: '/medicines/vitc_500.jpg',
};
const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  NT01: '/medicines/para500.jpg',
  KS01: '/medicines/p_amox_500.jpg',
  TH01: '/medicines/berb_100.jpg',
  HH01: '/medicines/aug_625.jpg',
  VT01: '/medicines/vitc_500.jpg',
};
export function getMedicineImageUrl(med: Pick<Thuoc, 'maThuoc' | 'maNhom' | 'hinhAnh'>): string {
  return (
    med.hinhAnh ||
    DEFAULT_MEDICINE_IMAGES[med.maThuoc] ||
    CATEGORY_FALLBACK_IMAGES[med.maNhom] ||
    '/medicines/para500.jpg'
  );
}
export const getMedicines = () => request<Thuoc[]>('/medicines');
export const getMedicineDetail = (code:string) => request<Thuoc>(`/medicines/${id(code)}`);
export const getCategories = () => request<NhomThuoc[]>('/categories');
export const getBatches = () => request<LoThuoc[]>('/inventory/batches');
export const getSuppliers = () => request<NhaCungCap[]>('/suppliers');
export interface InventoryAlerts { danhSachSapHet:Thuoc[];danhSachSapHetHan:Thuoc[];tongThuocSapHet:number;tongThuocSapHetHan:number }
export const getInventoryAlerts = () => request<InventoryAlerts>('/inventory/alerts');
export async function createMedicine(data:Thuoc) { return {success:true,medicine:await send<Thuoc>('/medicines','POST',data),message:''}; }
export async function updateMedicine(data:Thuoc) { await send(`/medicines/${id(data.maThuoc)}`,'PUT',data);return true; }
export async function deleteMedicine(code:string) { await send(`/medicines/${id(code)}`,'DELETE');return true; }
export const getImportVouchers = () => request<PhieuNhap[]>('/import-vouchers');
export async function createImportVoucher(data:PhieuNhap) { return send<PhieuNhap>('/import-vouchers','POST',data); }
export async function updateImportVoucher(code:string,data:Pick<PhieuNhap,'ngayNhap'|'maNCC'|'chiTiet'>) { return send<PhieuNhap>(`/import-vouchers/${id(code)}`,'PUT',data); }
export async function deleteImportVoucher(code:string) { await send(`/import-vouchers/${id(code)}`,'DELETE');return true; }
export const getExportVouchers = () => request<PhieuXuat[]>('/export-vouchers');
export async function createExportVoucher(data:PhieuXuat) { return {success:true,voucher:await send<PhieuXuat>('/export-vouchers','POST',data),message:''}; }
export async function updateExportVoucher(code:string,data:Pick<PhieuXuat,'loaiXuat'|'tenKhachHang'|'chietKhau'|'phuongThucThanhToan'|'chiTiet'>) { return send<PhieuXuat>(`/export-vouchers/${id(code)}`,'PUT',data); }
export async function deleteExportVoucher(code:string) { await send(`/export-vouchers/${id(code)}`,'DELETE');return true; }
export interface ActivityRow { maPhieu:string;loai:'Nhập kho'|'Xuất kho';ngayGD:string;maThuoc:string;tenThuoc:string;maNhom?:string;soLuong:number;donGia:number;thanhTien:number;nguoiThucHien:string }
export interface ActivityReport { rows:ActivityRow[];totalAmount:number;totalQuantity:number }
export interface TopSellingItem { rank:number;maThuoc:string;tenThuoc:string;maNhom:string;tenNhom:string;soLuong:number;doanhThu:number }
export interface RevenueReport { tongDoanhThu:number;soHoaDon:number;tongChietKhau:number;danhSachHoaDon:PhieuXuat[] }
export const getActivityReport = (fromDate:string,toDate:string,type:'ALL'|'IMPORT'|'EXPORT',maNhom?:string,maThuoc?:string) => request<ActivityReport>('/reports/activity'+query({fromDate,toDate,type,maNhom:maNhom==='ALL'?undefined:maNhom,maThuoc:maThuoc==='ALL'?undefined:maThuoc}));
export const getTopSellingMedicines = (topN=10,fromDate?:string,toDate?:string,maNhom?:string,sortBy:'QUANTITY'|'REVENUE'='QUANTITY') => request<TopSellingItem[]>('/reports/top-selling'+query({topN,fromDate,toDate,maNhom:maNhom==='ALL'?undefined:maNhom,sortBy}));
export const getRevenueReport = (fromDate:string,toDate:string,loaiXuat?:string,maDuocSi?:string) => request<RevenueReport>('/reports/revenue'+query({fromDate,toDate,loaiXuat:loaiXuat==='ALL'?undefined:loaiXuat,maDuocSi:maDuocSi==='ALL'?undefined:maDuocSi}));
