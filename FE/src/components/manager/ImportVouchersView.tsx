import { ApiStatus, useApiAction } from '../ui/api-status';
import { Dialog } from '../ui/dialog';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Quản lý Phiếu Nhập theo Đặc tả UC007 (Hình 2-14, 2-21, 4-2 trong SRS)
 */

import React, { useState, useEffect } from 'react';
import {
  FilePlus,
  Eye,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Building2,
  Package,
  X,
  FileCheck,
  CheckCircle,
} from 'lucide-react';
import {
  PhieuNhap,
  ChiTietPhieuNhap,
  NhaCungCap,
  Thuoc,
  TaiKhoan,
} from '../../types/pharmacy';
import {
  getImportVouchers,
  createImportVoucher,
  updateImportVoucher,
  deleteImportVoucher,
  getSuppliers,
  getMedicines,
} from '../../services/pharmacyService';

interface ImportVouchersViewProps {
  currentUser: TaiKhoan;
  onMedicineUpdated: () => void | Promise<void>;
}

export const ImportVouchersView: React.FC<ImportVouchersViewProps> = ({
  currentUser,
  onMedicineUpdated,
}) => {
  const { busy, error: apiError, run } = useApiAction();
  const [vouchers, setVouchers] = useState<PhieuNhap[]>([]);
  const [suppliers,setSuppliers] = useState<NhaCungCap[]>([]);
  const [medicines,setMedicines] = useState<Thuoc[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<PhieuNhap | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<PhieuNhap | null>(null);

  // Form New Import Voucher
  const [formNhaCungCap, setFormNhaCungCap] = useState(suppliers[0]?.maNCC || 'NCC001');
  const [formNgayNhap, setFormNgayNhap] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [formItems, setFormItems] = useState<
    Array<{
      maThuoc: string;
      maLo: string;
      hanSuDung: string;
      soLuongNhap: number;
      donGiaNhap: number;
    }>
  >([
    {
      maThuoc: medicines[0]?.maThuoc || 'TH001',
      maLo: `LOT${new Date().getFullYear().toString().slice(-2)}A${Math.floor(Math.random() * 89 + 10)}`,
      hanSuDung: '2027-12-31',
      soLuongNhap: 50,
      donGiaNhap: 35000,
    },
  ]);
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    const [nextVouchers,nextSuppliers,nextMedicines] = await Promise.all([getImportVouchers(),getSuppliers(),getMedicines()]);
    setVouchers(nextVouchers);setSuppliers(nextSuppliers);setMedicines(nextMedicines);
    setFormNhaCungCap(value=>nextSuppliers.some(s=>s.maNCC===value)?value:nextSuppliers[0]?.maNCC || '');
    setFormItems(items=>items.map(item=>({...item,maThuoc:nextMedicines.some(m=>m.maThuoc===item.maThuoc)?item.maThuoc:nextMedicines[0]?.maThuoc || ''})));
  };
  const refreshList = async () => { await loadData(); await onMedicineUpdated(); };
  useEffect(() => { void run(loadData); }, []);

  const handleAddItemRow = () => {
    setFormItems([
      ...formItems,
      {
        maThuoc: medicines[0]?.maThuoc || 'TH001',
        maLo: `LOT${new Date().getFullYear().toString().slice(-2)}B${Math.floor(Math.random() * 89 + 10)}`,
        hanSuDung: '2027-12-31',
        soLuongNhap: 20,
        donGiaNhap: 50000,
      },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    const next = [...formItems];
    next[idx] = { ...next[idx], [field]: value };
    setFormItems(next);
  };

  const calculateTotal = () => {
    return formItems.reduce((sum, item) => sum + item.soLuongNhap * item.donGiaNhap, 0);
  };

  const handleCreateSubmit = (e: React.FormEvent) => run(async () => {
    e.preventDefault();
    setFormError('');

    const todayStr = new Date().toLocaleDateString('en-CA');
    if (!formNgayNhap || formNgayNhap > todayStr) {
      setFormError('Ngày nhập không được sau ngày hiện tại.');
      return;
    }

    if (formItems.length === 0) {
      setFormError('Cần có ít nhất một mặt hàng nhập vào phiếu.');
      return;
    }

    for (let i = 0; i < formItems.length; i++) {
      const item = formItems[i];
      if (!item.maLo.trim()) {
        setFormError(`Dòng #${i + 1}: Mã lô không được để trống.`);
        return;
      }
      if (!item.hanSuDung || item.hanSuDung <= formNgayNhap) {
        setFormError(`Dòng #${i + 1}: Hạn sử dụng phải sau ngày nhập hàng.`);
        return;
      }
      if (!Number.isInteger(item.soLuongNhap) || item.soLuongNhap <= 0) {
        setFormError(`Dòng #${i + 1}: Số lượng nhập phải lớn hơn 0.`);
        return;
      }
      if (!Number.isFinite(item.donGiaNhap) || item.donGiaNhap <= 0) {
        setFormError(`Dòng #${i + 1}: Đơn giá nhập không hợp lệ.`);
        return;
      }
    }

    const maPN = editingVoucher ? editingVoucher.maPN : `PN-${crypto.randomUUID()}`;
    const now = new Date();
    const ngayNhapFormatted = editingVoucher && editingVoucher.ngayNhap.startsWith(formNgayNhap)
      ? editingVoucher.ngayNhap
      : `${formNgayNhap} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const chiTiet: ChiTietPhieuNhap[] = formItems.map((item) => {
      const med = medicines.find((m) => m.maThuoc === item.maThuoc);
      return {
        maPN,
        maThuoc: item.maThuoc,
        tenThuoc: med ? med.tenThuoc : item.maThuoc,
        maLo: item.maLo.trim(),
        soLuongNhap: Number(item.soLuongNhap),
        donGiaNhap: Number(item.donGiaNhap),
        hanSuDung: item.hanSuDung,
      };
    });

    const payloadVoucher: PhieuNhap = {
      maPN,
      ngayNhap: ngayNhapFormatted,
      maNCC: formNhaCungCap,
      nguoiLap: editingVoucher ? editingVoucher.nguoiLap : currentUser.maTaiKhoan,
      tenNguoiLap: editingVoucher ? editingVoucher.tenNguoiLap : currentUser.hoTen,
      tongTien: calculateTotal(),
      chiTiet,
    };

    if (editingVoucher) {
      const updated = await updateImportVoucher(editingVoucher.maPN, payloadVoucher);
      if (!updated) {
        setFormError('Không thể cập nhật phiếu nhập. Vui lòng kiểm tra lại thông tin.');
        return;
      }
      setEditingVoucher(null);
    } else {
      if (!await createImportVoucher(payloadVoucher)) {
        setFormError('Không thể tạo phiếu. Kiểm tra ngày nhập, nhà cung cấp, mã lô, hạn dùng và số lượng.');
        return;
      }
      setIsCreateOpen(false);
    }
    await refreshList();
  });

  const openEditModal = (v: PhieuNhap) => {
    setFormError('');
    setEditingVoucher(v);
    setFormNhaCungCap(v.maNCC);
    setFormNgayNhap(v.ngayNhap.slice(0, 10));
    setFormItems(
      v.chiTiet.map((ct) => ({
        maThuoc: ct.maThuoc,
        maLo: ct.maLo,
        hanSuDung: ct.hanSuDung,
        soLuongNhap: ct.soLuongNhap,
        donGiaNhap: ct.donGiaNhap,
      })),
    );
  };

  const handleDeleteVoucher = (v: PhieuNhap) => {
    if (!window.confirm(`Xác nhận hủy phiếu nhập ${v.maPN} và trừ lại số lượng tồn kho tương ứng?`)) return;
    void run(async () => {
      await deleteImportVoucher(v.maPN);
      await refreshList();
    });
  };

  const getSupplierName = (maNCC: string) => {
    const s = suppliers.find((sp) => sp.maNCC === maNCC);
    return s ? s.tenNCC : maNCC;
  };

  return (
    <div>
      <ApiStatus busy={busy} error={apiError} onRetry={()=>void run(loadData)} />
      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Quản lý Phiếu Nhập Kho</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lập phiếu nhập thuốc từ nhà cung cấp, kiểm soát số lô, hạn dùng và tự động cập nhật tồn kho.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError('');
            setEditingVoucher(null);
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
        >
          <FilePlus className="w-4 h-4" />
          <span>Tạo phiếu nhập mới</span>
        </button>
      </div>

      {/* Vouchers List Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4">MÃ PHIẾU NHẬP</th>
              <th className="py-3 px-4">NGÀY NHẬP</th>
              <th className="py-3 px-4">NHÀ CUNG CẤP</th>
              <th className="py-3 px-4">NGƯỜI LẬP PHIẾU</th>
              <th className="py-3 px-4 text-center">SỐ MẶT HÀNG</th>
              <th className="py-3 px-4 text-right">TỔNG TIỀN (VNĐ)</th>
              <th className="py-3 px-4 text-right">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {vouchers.map((v) => (
              <tr key={v.maPN} className="hover:bg-slate-50/70 transition">
                <td className="py-3.5 px-4 font-mono font-semibold text-emerald-700">{v.maPN}</td>
                <td className="py-3.5 px-4 font-mono text-slate-600">{v.ngayNhap}</td>
                <td className="py-3.5 px-4 font-medium text-slate-900">{getSupplierName(v.maNCC)}</td>
                <td className="py-3.5 px-4 text-slate-700">{v.tenNguoiLap || v.nguoiLap}</td>
                <td className="py-3.5 px-4 text-center">
                  <span className="font-semibold text-slate-800">{v.chiTiet.length}</span> mặt hàng
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                  {v.tongTien.toLocaleString('vi-VN')} đ
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => setSelectedVoucher(v)}
                      className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 transition"
                      title="Xem chi tiết phiếu nhập"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEditModal(v)}
                      className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200 transition"
                      title="Sửa phiếu nhập"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteVoucher(v)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition"
                      title="Hủy phiếu nhập"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {vouchers.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">
                  Chưa có phiếu nhập thuốc nào trong hệ thống.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: Tạo / Cập nhật phiếu nhập (Bảng 2-13, 2-14) */}
      {(isCreateOpen || editingVoucher) && (
        <Dialog
          label={editingVoucher ? 'Cập Nhật Phiếu Nhập Kho' : 'Lập Phiếu Nhập Thuốc Vào Kho'}
          onClose={() => {
            setIsCreateOpen(false);
            setEditingVoucher(null);
          }}
        >
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  {editingVoucher ? `Cập nhật Phiếu Nhập: ${editingVoucher.maPN}` : 'Lập Phiếu Nhập Thuốc Vào Kho'}
                </h3>
                <p className="text-xs text-slate-500">Cập nhật số lượng và hạn sử dụng của từng lô thuốc</p>
              </div>
              <button
                aria-label="Đóng hộp thoại"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingVoucher(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs shrink-0">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 flex-1 flex flex-col overflow-hidden">
              {/* Header Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 shrink-0">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nhà cung cấp <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formNhaCungCap}
                    onChange={(e) => setFormNhaCungCap(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                  >
                    {suppliers.map((s) => (
                      <option key={s.maNCC} value={s.maNCC}>
                        {s.tenNCC} ({s.maNCC})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày nhập kho <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formNgayNhap}
                    onChange={(e) => setFormNgayNhap(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl mb-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">MẶT HÀNG THUỐC</th>
                      <th className="py-2.5 px-3 w-28">MÃ LÔ (LOT)</th>
                      <th className="py-2.5 px-3 w-32">HẠN SỬ DỤNG</th>
                      <th className="py-2.5 px-3 w-24 text-right">SL NHẬP</th>
                      <th className="py-2.5 px-3 w-28 text-right">GIÁ VỐN (Đ)</th>
                      <th className="py-2.5 px-3 w-28 text-right">THÀNH TIỀN</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3">
                          <select
                            value={item.maThuoc}
                            onChange={(e) => handleItemChange(idx, 'maThuoc', e.target.value)}
                            className="w-full py-1 px-2 border border-slate-200 rounded text-xs bg-white"
                          >
                            {medicines.map((m) => (
                              <option key={m.maThuoc} value={m.maThuoc}>
                                {m.tenThuoc} ({m.donViTinh})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={item.maLo}
                            onChange={(e) => handleItemChange(idx, 'maLo', e.target.value)}
                            className="w-full py-1 px-2 border border-slate-200 rounded font-mono text-xs uppercase"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="date"
                            value={item.hanSuDung}
                            onChange={(e) => handleItemChange(idx, 'hanSuDung', e.target.value)}
                            className="w-full py-1 px-2 border border-slate-200 rounded text-xs"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="1"
                            value={item.soLuongNhap}
                            onChange={(e) =>
                              handleItemChange(idx, 'soLuongNhap', parseInt(e.target.value) || 0)
                            }
                            className="w-full py-1 px-2 border border-slate-200 rounded font-mono text-xs text-right"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={item.donGiaNhap}
                            onChange={(e) =>
                              handleItemChange(idx, 'donGiaNhap', parseInt(e.target.value) || 0)
                            }
                            className="w-full py-1 px-2 border border-slate-200 rounded font-mono text-xs text-right"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">
                          {(item.soLuongNhap * item.donGiaNhap).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            disabled={formItems.length === 1}
                            className="text-slate-400 hover:text-rose-600 disabled:opacity-30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mb-4 shrink-0">
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm dòng thuốc</span>
                </button>

                <div className="text-right">
                  <span className="text-xs text-slate-500 mr-2">Tổng giá trị đơn nhập:</span>
                  <span className="text-base font-bold text-emerald-700 font-mono">
                    {calculateTotal().toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingVoucher(null);
                  }}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit" disabled={busy}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  {editingVoucher ? 'Lưu thay đổi' : 'Lưu & Nhập vào kho'}
                </button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {/* MODAL: Xem chi tiết phiếu nhập */}
      {selectedVoucher && (
        <Dialog label="Thông tin chi tiết" onClose={() => setSelectedVoucher(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Chi tiết Phiếu Nhập: <span className="font-mono text-emerald-700">{selectedVoucher.maPN}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Ngày lập: {selectedVoucher.ngayNhap} · Người lập: {selectedVoucher.tenNguoiLap}
                </p>
              </div>
              <button onClick={() => setSelectedVoucher(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 bg-slate-50 p-3.5 rounded-xl text-xs space-y-1">
              <div>
                Nhà cung cấp: <strong>{getSupplierName(selectedVoucher.maNCC)}</strong>
              </div>
              <div>
                Mã chứng từ: <span className="font-mono">{selectedVoucher.maPN}</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">TÊN THUỐC</th>
                    <th className="py-2.5 px-3 font-mono">MÃ LÔ</th>
                    <th className="py-2.5 px-3">HẠN DÙNG</th>
                    <th className="py-2.5 px-3 text-right">SL NHẬP</th>
                    <th className="py-2.5 px-3 text-right">ĐƠN GIÁ</th>
                    <th className="py-2.5 px-3 text-right">THÀNH TIỀN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedVoucher.chiTiet.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{item.tenThuoc}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{item.maLo}</td>
                      <td className="py-2.5 px-3 text-slate-600">{item.hanSuDung}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">{item.soLuongNhap}</td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {item.donGiaNhap.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {(item.soLuongNhap * item.donGiaNhap).toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">Chứng từ nội bộ kho dược</div>
              <div className="text-right">
                <span className="text-xs text-slate-500 mr-2">Tổng tiền phiếu nhập:</span>
                <span className="text-base font-bold text-emerald-700 font-mono">
                  {selectedVoucher.tongTien.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
