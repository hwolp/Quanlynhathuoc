import { ApiStatus, useApiAction } from '../ui/api-status';
import { Dialog } from '../ui/dialog';
import { AppSidebar, PageContext, StatCards } from '../ui/workspace';
import { VouchersView } from '../common/VouchersView';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Màn hình Quản lý Thuốc & Tồn kho theo Mockup Hình 4-12 và Đặc tả UC008 trong SRS
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  FileText,
  BarChart2,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  X,
  XCircle,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { Thuoc, NhomThuoc, TaiKhoan } from '../../types/pharmacy';
import {
  getMedicines,
  getCategories,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  getInventoryAlerts,
  getMedicineImageUrl,
} from '../../services/pharmacyService';
import { ImportVouchersView } from './ImportVouchersView';
import { ReportsView } from '../reports/ReportsView';

interface ManagerDashboardProps {
  currentUser: TaiKhoan;
  onLogout: () => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ currentUser, onLogout }) => {
  const { busy, error: apiError, run } = useApiAction();
  const [activeTab, setActiveTab] = useState<'MEDICINES' | 'IMPORT' | 'EXPORT' | 'REPORTS'>('MEDICINES');

  const [medicines, setMedicines] = useState<Thuoc[]>([]);
  const [categories, setCategories] = useState<NhomThuoc[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'OK' | 'LOW' | 'ZERO' | 'EXPIRING'>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Thuoc | null>(null);
  const [detailMedicine, setDetailMedicine] = useState<Thuoc | null>(null);

  // Form Add Medicine (Bảng 2-15 & 2-16)
  const [formMaThuoc, setFormMaThuoc] = useState('');
  const [formTenThuoc, setFormTenThuoc] = useState('');
  const [formMaNhom, setFormMaNhom] = useState('');
  const [formDonViTinh, setFormDonViTinh] = useState<'Viên' | 'Vỉ' | 'Hộp' | 'Lọ' | 'Tuýp' | 'Gói'>('Hộp');
  const [formGiaBan, setFormGiaBan] = useState<number>(50000);
  const [formTonToiThieu, setFormTonToiThieu] = useState<number>(10);
  const [formHanSuDung, setFormHanSuDung] = useState('2027-12-31');
  const [formQuyCach, setFormQuyCach] = useState('');
  const [formError, setFormError] = useState('');

  // Form Edit Medicine
  const [editTenThuoc, setEditTenThuoc] = useState('');
  const [editGiaBan, setEditGiaBan] = useState<number>(0);
  const [editTonToiThieu, setEditTonToiThieu] = useState<string>('10');
  const [editHanSuDung, setEditHanSuDung] = useState('');
  const [editQuyCach, setEditQuyCach] = useState('');

  const [lowStockList, setLowStockList] = useState<Thuoc[]>([]);
  const [expiringList, setExpiringList] = useState<Thuoc[]>([]);
  const loadData = async () => {
    const [meds,cats,alerts] = await Promise.all([getMedicines(),getCategories(),getInventoryAlerts()]);
    setMedicines(meds);setCategories(cats);
    setFormMaNhom(value=>value || cats[0]?.maNhom || '');
    setLowStockList(alerts.danhSachSapHet);setExpiringList(alerts.danhSachSapHetHan);
  };
  useEffect(() => { void run(loadData); }, []);

  const totalAlerts = lowStockList.length + expiringList.length;

  // Filtered medicines
  const filteredMedicines = useMemo(() => {
    return medicines.filter((m) => {
      // Category filter
      if (selectedCategory !== 'ALL' && m.maNhom !== selectedCategory) {
        return false;
      }
      // Status filter
      if (stockStatusFilter === 'OK' && m.tongTonKho <= m.tonToiThieu) {
        return false;
      }
      if (stockStatusFilter === 'LOW' && !(m.tongTonKho > 0 && m.tongTonKho <= m.tonToiThieu)) {
        return false;
      }
      if (stockStatusFilter === 'ZERO' && m.tongTonKho > 0) {
        return false;
      }
      if (stockStatusFilter === 'EXPIRING') {
        if (!m.hanSuDung) return false;
        const diff = new Date(m.hanSuDung).getTime() - new Date().getTime();
        if (diff > 90 * 24 * 60 * 60 * 1000) return false;
      }
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          m.maThuoc.toLowerCase().includes(q) ||
          m.tenThuoc.toLowerCase().includes(q) ||
          (m.hoatChat && m.hoatChat.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [medicines, selectedCategory, stockStatusFilter, searchQuery]);

  // Open Edit Modal
  const handleOpenEdit = (m: Thuoc) => {
    setSelectedMedicine(m);
    setEditTenThuoc(m.tenThuoc);
    setEditGiaBan(m.giaBan);
    setEditTonToiThieu(String(m.tonToiThieu));
    setEditHanSuDung(m.hanSuDung || '');
    setEditQuyCach(m.quyCach || '');
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Submit Add Medicine
  const handleAddSubmit = (e: React.FormEvent) => run(async () => {
    e.preventDefault();
    setFormError('');

    if (!formMaThuoc.trim() || !formTenThuoc.trim()) {
      setFormError('Mã thuốc và Tên thuốc không được để trống.');
      return;
    }
    if (formGiaBan <= 0) {
      setFormError('Giá bán phải là số nguyên dương (> 0).');
      return;
    }

    const res = await createMedicine({
      maThuoc: formMaThuoc.trim().toUpperCase(),
      tenThuoc: formTenThuoc.trim(),
      maNhom: formMaNhom || (categories[0]?.maNhom || 'NT01'),
      donViTinh: formDonViTinh,
      giaBan: Number(formGiaBan),
      tongTonKho: 0, // Bắt đầu bằng 0, tăng qua phiếu nhập
      tonToiThieu: Number(formTonToiThieu) || 10,
      hanSuDung: formHanSuDung || undefined,
      quyCach: formQuyCach.trim() || undefined,
    });

    if (res.success) {
      await loadData();
      setIsAddModalOpen(false);
      // Reset
      setFormMaThuoc('');
      setFormTenThuoc('');
      setFormGiaBan(50000);
      setFormQuyCach('');
    } else {
      setFormError(res.message || 'Lỗi khi tạo thuốc mới');
    }
  });

  // Submit Edit Medicine
  const handleEditSubmit = (e: React.FormEvent) => run(async () => {
    e.preventDefault();
    setFormError('');
    if (!selectedMedicine) return;

    if (!editTenThuoc.trim()) {
      setFormError('Tên thuốc không được để trống.');
      return;
    }
    if (editGiaBan <= 0) {
      setFormError('Giá bán phải là số nguyên dương (> 0).');
      return;
    }
    if (!/^[1-9]\d*$/.test(editTonToiThieu.trim())) {
      setFormError('Ngưỡng tồn tối thiểu phải là số nguyên dương (> 0) (Bảng 2-10 STT 4).');
      return;
    }

    await updateMedicine({
      ...selectedMedicine,
      tenThuoc: editTenThuoc.trim(),
      giaBan: Number(editGiaBan),
      tonToiThieu: Number(editTonToiThieu.trim()),
      hanSuDung: editHanSuDung || undefined,
      quyCach: editQuyCach.trim() || undefined,
    });

    await loadData();
    setIsEditModalOpen(false);
  });

  // Delete Medicine
  const handleDeleteMedicine = (maThuoc: string, tenThuoc: string) => run(async () => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa thuốc "${tenThuoc}" (${maThuoc}) khỏi danh mục?`)) {
      if (!await deleteMedicine(maThuoc)) { window.alert("Không thể xóa thuốc còn tồn kho hoặc đã phát sinh giao dịch."); return; }
      await loadData();
    }
  });

  const getCategoryName = (maNhom: string) => {
    const c = categories.find((cat) => cat.maNhom === maNhom);
    return c ? c.tenNhom : maNhom;
  };

  return (
    <div className="workspace-shell flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar matching Mockup Hình 4-12 */}
      <AppSidebar user={currentUser} items={[{id:'MEDICINES',label:'Danh mục thuốc',icon:Package},{id:'IMPORT',label:'Phiếu Nhập',icon:FileText},{id:'EXPORT',label:'Phiếu Xuất',icon:FileText},{id:'REPORTS',label:'Báo cáo',icon:BarChart2}]} active={activeTab} onSelect={id => setActiveTab(id as typeof activeTab)} onLogout={onLogout} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <ApiStatus busy={busy} error={apiError} onRetry={()=>void run(loadData)} />
        <PageContext label={activeTab === 'REPORTS' ? 'Báo cáo & thống kê' : activeTab === 'IMPORT' ? 'Nhập kho' : activeTab === 'EXPORT' ? 'Xuất kho' : 'Quản lý kho thuốc'} />

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'MEDICINES' && (
            <div>
              {/* Header Title & System Warning (Hình 4-12) */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-xl font-bold text-slate-800 tracking-tight">Danh mục thuốc</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Theo dõi danh mục, kiểm soát tồn kho và hạn sử dụng tại một nơi.
                  </p>
                </div>

                {/* Right Alert Card (Hình 4-12) */}
                <div
                  role="button" tabIndex={0} aria-label="Xem cảnh báo tồn kho và hạn dùng" onKeyDown={e=>{if(e.key === 'Enter' || e.key === ' ') {e.preventDefault();setIsAlertModalOpen(true);}}}
                  onClick={() => setIsAlertModalOpen(true)}
                  className="cursor-pointer bg-amber-50/60 hover:bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-2.5 flex items-center gap-3 transition shadow-xs group"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 " />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-800">Cảnh báo hệ thống</div>
                    <div className="text-xs text-slate-600">
                      <strong className="text-rose-600">{lowStockList.length}</strong> thuốc sắp hết hàng ·{' '}
                      <strong className="text-amber-600">{expiringList.length}</strong> thuốc sắp hết hạn
                    </div>
                  </div>
                  <span className="text-slate-400 group-hover:text-slate-700 ml-1">→</span>
                </div>
              </div>

              <StatCards items={[
                {label:'Danh mục thuốc',value:medicines.length,note:'Loại thuốc đang quản lý',icon:Package,tone:'teal',onClick:()=>setStockStatusFilter('ALL')},
                {label:'Tổng tồn kho',value:medicines.reduce((n,m)=>n+m.tongTonKho,0),note:'Đơn vị trong kho',icon:Package,tone:'blue'},
                {label:'Sắp hết hàng',value:lowStockList.length,note:'Cần bổ sung tồn kho',icon:AlertTriangle,tone:'amber',onClick:()=>setStockStatusFilter('LOW')},
                {label:'Cảnh báo hạn dùng',value:expiringList.length,note:'Trong 90 ngày hoặc đã hết hạn',icon:Clock,tone:'rose',onClick:()=>setStockStatusFilter('EXPIRING')}
              ]}/>
              <div className="table-search"><Search size={18}/><input aria-label="Tìm kiếm thuốc" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Tìm theo tên thuốc, mã thuốc hoặc hoạt chất…"/><kbd>Tìm kiếm</kbd></div>
              {/* Filters & Actions Bar (Hình 4-12) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                  >
                    <option value="ALL">Tất cả nhóm thuốc</option>
                    {categories.map((c) => (
                      <option key={c.maNhom} value={c.maNhom}>
                        {c.tenNhom}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                    <button
                      onClick={() => setStockStatusFilter('ALL')}
                      className={`px-2.5 py-1.5 rounded-md font-medium transition ${
                        stockStatusFilter === 'ALL'
                          ? 'bg-white text-slate-800 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tất cả
                    </button>
                    <button
                      onClick={() => setStockStatusFilter('OK')}
                      className={`px-2.5 py-1.5 rounded-md font-medium transition ${
                        stockStatusFilter === 'OK'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Còn
                    </button>
                    <button
                      onClick={() => setStockStatusFilter('LOW')}
                      className={`px-2.5 py-1.5 rounded-md font-medium transition ${
                        stockStatusFilter === 'LOW'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Sắp hết ({medicines.filter((m) => m.tongTonKho > 0 && m.tongTonKho <= m.tonToiThieu).length})
                    </button>
                    <button
                      onClick={() => setStockStatusFilter('ZERO')}
                      className={`px-2.5 py-1.5 rounded-md font-medium transition ${
                        stockStatusFilter === 'ZERO'
                          ? 'bg-rose-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Hết ({medicines.filter((m) => m.tongTonKho === 0).length})
                    </button>
                    <button
                      onClick={() => setStockStatusFilter('EXPIRING')}
                      className={`px-2.5 py-1.5 rounded-md font-medium transition ${
                        stockStatusFilter === 'EXPIRING'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Sắp hết hạn ({expiringList.length})
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setFormError('');
                    setIsAddModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm thuốc mới</span>
                </button>
              </div>

              {/* Data Table (Hình 4-12) */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">MÃ THUỐC</th>
                      <th className="py-3 px-4">TÊN THUỐC</th>
                      <th className="py-3 px-4">NHÓM THUỐC</th>
                      <th className="py-3 px-4">ĐƠN VỊ</th>
                      <th className="py-3 px-4 text-right">GIÁ BÁN</th>
                      <th className="py-3 px-4 text-right">TỒN KHO</th>
                      <th className="py-3 px-4 text-right">THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredMedicines.map((m) => {
                      const isLow = m.tongTonKho <= m.tonToiThieu;
                      const isZero = m.tongTonKho === 0;

                      return (
                        <tr key={m.maThuoc} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-600">
                            {m.maThuoc}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={getMedicineImageUrl(m)}
                                alt={m.tenThuoc}
                                loading="lazy"
                                className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                              />
                              <div>
                                <div className="font-semibold text-slate-900">{m.tenThuoc}</div>
                                {m.quyCach && (
                                  <div className="text-xs text-slate-400">{m.quyCach}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-md">
                              {getCategoryName(m.maNhom)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{m.donViTinh}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-900">
                            {m.giaBan.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            {isZero ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-bold rounded">
                                Hết hàng (0)
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded">
                                Sắp hết ({m.tongTonKho})
                              </span>
                            ) : (
                              <span className="font-bold text-slate-800">{m.tongTonKho}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1">
                            <button
                              onClick={() => setDetailMedicine(m)}
                              title="Xem chi tiết thuốc"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(m)}
                              title="Sửa thông tin thuốc"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMedicine(m.maThuoc, m.tenThuoc)}
                              title="Xóa thuốc khỏi danh mục"
                              className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredMedicines.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400">
                          Không tìm thấy mặt hàng thuốc nào theo điều kiện lọc.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'IMPORT' && (
            <ImportVouchersView currentUser={currentUser} onMedicineUpdated={loadData} />
          )}

          {activeTab === 'EXPORT' && <VouchersView onVoucherChanged={loadData} />}
          {activeTab === 'REPORTS' && <ReportsView />}
        </main>
      </div>

      {/* MODAL: Xem chi tiết thuốc & các lô tồn kho (UC005 - Bảng 2-9 STT 3, 4) */}
      {detailMedicine && (
        <Dialog label="Chi tiết thông tin thuốc" onClose={() => setDetailMedicine(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <img
                  src={getMedicineImageUrl(detailMedicine)}
                  alt={detailMedicine.tenThuoc}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 bg-slate-100"
                />
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{detailMedicine.tenThuoc}</h3>
                  <p className="text-xs font-mono text-emerald-700">{detailMedicine.maThuoc}</p>
                </div>
              </div>
              <button
                aria-label="Đóng hộp thoại"
                onClick={() => setDetailMedicine(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block">Nhóm dược phẩm</span>
                <strong className="text-slate-800">{getCategoryName(detailMedicine.maNhom)}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Đơn vị tính</span>
                <strong className="text-slate-800">{detailMedicine.donViTinh}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Giá bán lẻ</span>
                <strong className="text-emerald-700 font-mono">{detailMedicine.giaBan.toLocaleString('vi-VN')} đ</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Tổng tồn kho / Tồn tối thiểu</span>
                <strong className="font-mono text-slate-900">
                  {detailMedicine.tongTonKho} / {detailMedicine.tonToiThieu}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Hạn sử dụng</span>
                <strong className="font-mono text-slate-800">{detailMedicine.hanSuDung || 'Chưa cập nhật'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Quy cách / Hoạt chất</span>
                <strong className="text-slate-800">{detailMedicine.quyCach || detailMedicine.hoatChat || 'Tiêu chuẩn'}</strong>
              </div>
            </div>

            {detailMedicine.danhSachLo && detailMedicine.danhSachLo.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Danh sách lô thuốc trong kho ({detailMedicine.danhSachLo.length})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-2 px-3">MÃ LÔ</th>
                        <th className="py-2 px-3">HẠN DÙNG</th>
                        <th className="py-2 px-3 text-right">TỒN LÔ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailMedicine.danhSachLo.map((lo) => (
                        <tr key={lo.maLo}>
                          <td className="py-2 px-3 font-mono font-semibold text-slate-800">{lo.maLo}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{lo.hanSuDung}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">{lo.soLuongTonLo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailMedicine(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* MODAL: Thêm thuốc mới (UC008 Bảng 2-15 & 2-16) */}
      {isAddModalOpen && (
        <Dialog label="Thêm mặt hàng thuốc mới vào danh mục" onClose={() => setIsAddModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">Thêm mặt hàng thuốc mới vào danh mục</h3>
              <button aria-label="Đóng hộp thoại" onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã thuốc <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formMaThuoc}
                    onChange={(e) => setFormMaThuoc(e.target.value)}
                    placeholder="VD: P_AMOX_500"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nhóm thuốc <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formMaNhom}
                    onChange={(e) => setFormMaNhom(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.maNhom} value={c.maNhom}>
                        {c.tenNhom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên thương mại dược phẩm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTenThuoc}
                  onChange={(e) => setFormTenThuoc(e.target.value)}
                  placeholder="VD: Amoxicillin 500mg"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Đơn vị tính</label>
                  <select
                    value={formDonViTinh}
                    onChange={(e) => setFormDonViTinh(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                  >
                    <option value="Hộp">Hộp</option>
                    <option value="Vỉ">Vỉ</option>
                    <option value="Viên">Viên</option>
                    <option value="Lọ">Lọ</option>
                    <option value="Tuýp">Tuýp</option>
                    <option value="Gói">Gói</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giá bán lẻ (VNĐ) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={formGiaBan}
                    onChange={(e) => setFormGiaBan(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tồn tối thiểu</label>
                  <input
                    type="number"
                    min="1"
                    value={formTonToiThieu}
                    onChange={(e) => setFormTonToiThieu(parseInt(e.target.value) || 10)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hạn sử dụng</label>
                  <input
                    type="date"
                    value={formHanSuDung}
                    onChange={(e) => setFormHanSuDung(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quy cách đóng gói</label>
                  <input
                    type="text"
                    value={formQuyCach}
                    onChange={(e) => setFormQuyCach(e.target.value)}
                    placeholder="VD: Hộp 10 vỉ x 10 viên"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Hủy
                </button>
                <button
                  type="submit" disabled={busy}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  Lưu vào danh mục
                </button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {/* MODAL: Sửa thuốc */}
      {isEditModalOpen && selectedMedicine && (
        <Dialog label="Thông tin chi tiết" onClose={() => setIsEditModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">
                Cập nhật thuốc: <span className="font-mono text-emerald-700">{selectedMedicine.maThuoc}</span>
              </h3>
              <button aria-label="Đóng hộp thoại" onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} noValidate className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên thuốc</label>
                <input
                  type="text"
                  value={editTenThuoc}
                  onChange={(e) => setEditTenThuoc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giá bán lẻ (VNĐ)</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={editGiaBan}
                    onChange={(e) => setEditGiaBan(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngưỡng tồn tối thiểu</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={editTonToiThieu}
                    onChange={(e) => setEditTonToiThieu(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quy cách</label>
                <input
                  type="text"
                  value={editQuyCach}
                  onChange={(e) => setEditQuyCach(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Hủy
                </button>
                <button
                  type="submit" disabled={busy}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {/* MODAL: Cảnh báo Tồn kho & Hết hạn chi tiết */}
      {isAlertModalOpen && (
        <Dialog label="Chi tiết giao dịch" onClose={() => setIsAlertModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-base">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Chi tiết Cảnh báo Tồn kho & Hạn sử dụng</span>
              </div>
              <button aria-label="Đóng hộp thoại" onClick={() => setIsAlertModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-4 space-y-4">
              {/* Sắp hết hàng */}
              <div>
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Thuốc sắp hết hàng hoặc đã hết hàng ({lowStockList.length})
                </h4>
                <div className="border border-rose-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-rose-50 text-xs font-semibold text-amber-800">
                      <tr>
                        <th className="py-2 px-3">MÃ THUỐC</th>
                        <th className="py-2 px-3">TÊN THUỐC</th>
                        <th className="py-2 px-3 text-right">TỒN THỰC TẾ</th>
                        <th className="py-2 px-3 text-right">NGƯỠNG TỐI THIỂU</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100">
                      {lowStockList.map((m) => (
                        <tr key={m.maThuoc} className="hover:bg-rose-50/50">
                          <td className="py-2 px-3 font-mono font-medium text-slate-700">{m.maThuoc}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{m.tenThuoc}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                            {m.tongTonKho}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">{m.tonToiThieu}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sắp hết hạn */}
              <div>
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Thuốc sắp đến hạn sử dụng (&lt; 90 ngày) ({expiringList.length})
                </h4>
                <div className="border border-amber-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-amber-50 text-xs font-semibold text-amber-800">
                      <tr>
                        <th className="py-2 px-3">MÃ THUỐC</th>
                        <th className="py-2 px-3">TÊN THUỐC</th>
                        <th className="py-2 px-3">HẠN SỬ DỤNG</th>
                        <th className="py-2 px-3 text-right">TỒN KHO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {expiringList.map((m) => (
                        <tr key={m.maThuoc} className="hover:bg-amber-50/50">
                          <td className="py-2 px-3 font-mono font-medium text-slate-700">{m.maThuoc}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{m.tenThuoc}</td>
                          <td className="py-2 px-3 font-mono font-bold text-amber-700">{m.hanSuDung}</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">
                            {m.tongTonKho}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">Khuyến nghị: Hãy lập Phiếu Nhập để bổ sung tồn kho.</span>
              <button
                onClick={() => {
                  setIsAlertModalOpen(false);
                  setActiveTab('IMPORT');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                Tới trang Lập Phiếu Nhập
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
