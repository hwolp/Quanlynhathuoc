import { Dialog } from '../ui/dialog';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Modal Hóa đơn bán lẻ thuốc xuất kho (Chuẩn GPP)
 */

import React from 'react';
import { Printer, CheckCircle, X, Download } from 'lucide-react';
import { PhieuXuat } from '../../types/pharmacy';

interface InvoiceModalProps {
  voucher: PhieuXuat;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ voucher, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog label="NHÀ THUỐC ĐẠT CHUẨN GPP PHARMACARE" onClose={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>Thanh toán thành công!</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div id="printable-receipt" className="flex-1 overflow-y-auto p-4 my-2 border border-slate-200 rounded-xl bg-slate-50/50 text-xs text-slate-800">
          {/* Pharmacy Brand */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              NHÀ THUỐC ĐẠT CHUẨN GPP PHARMACARE
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              123 Đường Hải Phòng, Thạch Thang, Hải Châu, Đà Nẵng
            </p>
            <p className="text-[11px] text-slate-500">Hotline: 0236.3888.999 · GPKD: 48A-01294/GPP</p>
            <div className="mt-2 text-xs font-bold text-slate-900 uppercase">
              HÓA ĐƠN XUẤT THUỐC BÁN LẺ
            </div>
            <div className="text-[11px] font-mono text-emerald-700">{voucher.maPX}</div>
          </div>

          {/* Meta Info */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Ngày bán:</span>
              <span className="font-mono">{voucher.ngayBan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Dược sĩ bán hàng:</span>
              <span className="font-medium">{voucher.tenNguoiBan || voucher.nguoiBan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Khách hàng:</span>
              <span className="font-medium">{voucher.tenKhachHang || 'Khách mua lẻ'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Hình thức xuất:</span>
              <span>{voucher.loaiXuat}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Thanh toán:</span>
              <span className="font-medium text-emerald-700">{voucher.phuongThucThanhToan}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="text-slate-500 font-semibold border-b border-slate-200">
                  <th className="pb-1.5">Tên thuốc</th>
                  <th className="pb-1.5 text-center">ĐVT</th>
                  <th className="pb-1.5 text-center">SL</th>
                  <th className="pb-1.5 text-right">Đơn giá</th>
                  <th className="pb-1.5 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {voucher.chiTiet.map((item, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-1.5 font-medium text-slate-900 max-w-[120px]">{item.tenThuoc}</td>
                    <td className="py-1.5 text-center text-slate-500">{item.donViTinh}</td>
                    <td className="py-1.5 text-center font-mono font-bold text-slate-800">
                      {item.soLuongXuat}
                    </td>
                    <td className="py-1.5 text-right font-mono text-slate-600">
                      {item.donGiaBan.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-1.5 text-right font-mono font-bold text-slate-900">
                      {item.thanhTien.toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Calculation */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Tạm tính:</span>
              <span className="font-mono">
                {(voucher.tongTien + voucher.chietKhau).toLocaleString('vi-VN')} đ
              </span>
            </div>
            {voucher.chietKhau > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Chiết khấu giảm giá:</span>
                <span className="font-mono">-{voucher.chietKhau.toLocaleString('vi-VN')} đ</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1">
              <span>TỔNG THANH TOÁN:</span>
              <span className="text-emerald-700 font-mono">
                {voucher.tongTien.toLocaleString('vi-VN')} VNĐ
              </span>
            </div>
          </div>

          {/* Pharmacy Advisory */}
          <div className="text-center pt-3 text-[10px] text-slate-500 italic space-y-1">
            <p>Uống thuốc đúng liều lượng theo chỉ dẫn của dược sĩ/bác sĩ.</p>
            <p>Thuốc đã mua vui lòng không đổi trả nếu không có lỗi từ nhà sản xuất.</p>
            <p className="font-semibold text-slate-700 not-italic">Cảm ơn quý khách và chúc quý khách nhiều sức khỏe!</p>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Đóng
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Hóa Đơn</span>
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
