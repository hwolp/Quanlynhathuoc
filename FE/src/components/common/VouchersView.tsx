import { ApiStatus, useApiAction } from '../ui/api-status';
import { Dialog } from '../ui/dialog';
import React, { useState, useEffect } from 'react';
import { Search, Eye, Receipt, Edit2, Trash2, X } from 'lucide-react';
import { getExportVouchers, updateExportVoucher, deleteExportVoucher } from '../../services/pharmacyService';
import { PhieuXuat } from '../../types/pharmacy';
import { InvoiceModal } from './InvoiceModal';

interface VouchersViewProps {
  onVoucherChanged?: () => void | Promise<void>;
}

export function VouchersView({ onVoucherChanged }: VouchersViewProps) {
  const { busy, error, run } = useApiAction();
  const [vouchers, setVouchers] = useState<PhieuXuat[]>([]);
  const loadData = async () => setVouchers(await getExportVouchers());
  useEffect(() => {
    void run(loadData);
  }, []);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<PhieuXuat | null>(null);
  const [editingVoucher, setEditingVoucher] = useState<PhieuXuat | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editSaleType, setEditSaleType] = useState<'Bán lẻ trực tiếp' | 'Theo đơn'>('Bán lẻ trực tiếp');
  const [editChietKhau, setEditChietKhau] = useState(0);
  const [editError, setEditError] = useState('');

  const rows = vouchers.filter((v) =>
    `${v.maPX} ${v.tenKhachHang || ''} ${v.tenNguoiBan || ''}`
      .toLocaleLowerCase('vi')
      .includes(query.toLocaleLowerCase('vi')),
  );

  const openEditModal = (v: PhieuXuat) => {
    setEditingVoucher(v);
    setEditCustomerName(v.tenKhachHang || 'Khách mua lẻ');
    setEditSaleType(v.loaiXuat);
    setEditChietKhau(v.chietKhau || 0);
    setEditError('');
  };

  const handleSaveEdit = (e: React.FormEvent) =>
    run(async () => {
      e.preventDefault();
      if (!editingVoucher) return;
      setEditError('');
      const subTotal = editingVoucher.chiTiet.reduce((s, ct) => s + ct.soLuongXuat * ct.donGiaBan, 0);
      if (editChietKhau < 0 || editChietKhau > subTotal) {
        setEditError('Chiết khấu không hợp lệ.');
        return;
      }
      const updated = await updateExportVoucher(editingVoucher.maPX, {
        loaiXuat: editSaleType,
        tenKhachHang: editCustomerName.trim() || 'Khách mua lẻ',
        chietKhau: editChietKhau,
        phuongThucThanhToan: editingVoucher.phuongThucThanhToan,
        chiTiet: editingVoucher.chiTiet,
      });
      if (!updated) {
        setEditError('Không thể cập nhật phiếu xuất.');
        return;
      }
      setEditingVoucher(null);
      await loadData();
      await onVoucherChanged?.();
    });

  const handleDelete = (maPX: string) => {
    if (!window.confirm(`Xác nhận hủy phiếu xuất ${maPX} và hoàn trả tồn kho các lô thuốc tương ứng?`)) return;
    void run(async () => {
      await deleteExportVoucher(maPX);
      await loadData();
      await onVoucherChanged?.();
    });
  };

  return (
    <section>
      <ApiStatus busy={busy} error={error} onRetry={() => void run(loadData)} />
      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
        <Receipt size={22} />
        Danh sách phiếu xuất
      </h2>
      <p className="text-sm text-slate-500 mt-1 mb-6">
        Theo dõi giao dịch bán thuốc, cập nhật hoặc hủy phiếu xuất và xem chi tiết hóa đơn.
      </p>
      <div className="relative mb-5 max-w-md">
        <Search className="absolute top-3 left-3 text-slate-400" size={18} />
        <input
          aria-label="Tìm phiếu xuất"
          placeholder="Mã phiếu, khách hàng, dược sĩ…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm"
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {['Mã phiếu', 'Ngày bán', 'Khách hàng', 'Hình thức', 'Người bán', 'Tổng tiền', 'Thao tác'].map((t) => (
                <th key={t} className="p-4 font-medium">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.maPX} className="border-t border-slate-100">
                <td className="p-4 font-medium font-mono text-emerald-700">{v.maPX}</td>
                <td className="p-4">{v.ngayBan}</td>
                <td className="p-4">{v.tenKhachHang || 'Khách lẻ'}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-xs">{v.loaiXuat}</span>
                </td>
                <td className="p-4">{v.tenNguoiBan || v.nguoiBan}</td>
                <td className="p-4 font-mono font-semibold">{v.tongTien.toLocaleString('vi-VN')} đ</td>
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    <button
                      title="Xem hóa đơn"
                      onClick={() => setSelected(v)}
                      className="p-2 text-emerald-700 rounded-lg hover:bg-emerald-50"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      title="Cập nhật phiếu xuất"
                      onClick={() => openEditModal(v)}
                      className="p-2 text-blue-700 rounded-lg hover:bg-blue-50"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      title="Hủy phiếu xuất"
                      onClick={() => handleDelete(v.maPX)}
                      className="p-2 text-rose-600 rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-slate-500">
                  Không tìm thấy phiếu xuất.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selected && <InvoiceModal voucher={selected} onClose={() => setSelected(null)} />}
      {editingVoucher && (
        <Dialog label="Cập nhật phiếu xuất" onClose={() => setEditingVoucher(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">
                Cập nhật phiếu xuất <span className="font-mono text-emerald-700">{editingVoucher.maPX}</span>
              </h3>
              <button
                aria-label="Đóng hộp thoại"
                onClick={() => setEditingVoucher(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {editError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {editError}
              </div>
            )}
            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên khách hàng</label>
                <input
                  type="text"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hình thức xuất</label>
                <select
                  value={editSaleType}
                  onChange={(e) => setEditSaleType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Bán lẻ trực tiếp">Bán lẻ trực tiếp</option>
                  <option value="Theo đơn">Theo đơn bác sĩ</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chiết khấu (VNĐ)</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={editChietKhau}
                  onChange={(e) => setEditChietKhau(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingVoucher(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </Dialog>
      )}
    </section>
  );
}
