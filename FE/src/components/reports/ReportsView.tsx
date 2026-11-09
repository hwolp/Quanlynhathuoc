import type { PhieuXuat, NhomThuoc, Thuoc, TaiKhoan } from '../../types/pharmacy';
import { ApiStatus } from '../ui/api-status';
/**
 * @license
 * @SPDX-License-Identifier: Apache-2.0
 * Màn hình Báo cáo & Thống kê theo Mockup Hình 4-14 và Đặc tả UC009, UC010, UC011 trong SRS
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  PieChart as PieIcon,
  ShoppingBag,
  Receipt,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import {
  getActivityReport,
  getTopSellingMedicines,
  getRevenueReport,
  getCategories,
  getMedicines,
  getAccounts,
  type ActivityReport,
  type TopSellingItem,
} from '../../services/pharmacyService';

export const ReportsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'REVENUE' | 'ACTIVITY' | 'TOP_SELLING'>('REVENUE');

  // Date filters
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // đầu tháng
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Master data for filters
  const [categories, setCategories] = useState<NhomThuoc[]>([]);
  const [medicines, setMedicines] = useState<Thuoc[]>([]);
  const [accounts, setAccounts] = useState<TaiKhoan[]>([]);

  // Filter for Revenue tab (UC011 - Bảng 2-22)
  const [revenueSaleType, setRevenueSaleType] = useState<'ALL' | 'Bán lẻ trực tiếp' | 'Theo đơn'>('ALL');
  const [revenuePharmacist, setRevenuePharmacist] = useState<string>('ALL');

  // Filter for Activity tab (UC009 - Bảng 2-18)
  const [activityType, setActivityType] = useState<'ALL' | 'IMPORT' | 'EXPORT'>('ALL');
  const [activityCategory, setActivityCategory] = useState<string>('ALL');
  const [activityMedicine, setActivityMedicine] = useState<string>('ALL');

  // Filter for Top selling tab (UC010 - Bảng 2-20)
  const [topLimit, setTopLimit] = useState<number>(10);
  const [topCategory, setTopCategory] = useState<string>('ALL');
  const [topSortBy, setTopSortBy] = useState<'QUANTITY' | 'REVENUE'>('QUANTITY');

  // Dropdown export menu state
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const [activityData,setActivityData] = useState<ActivityReport>({rows:[],totalAmount:0,totalQuantity:0});
  const [topSellingList,setTopSellingList] = useState<TopSellingItem[]>([]);
  const [exportVouchers,setExportVouchers] = useState<PhieuXuat[]>([]);
  const [totalRevenue,setTotalRevenue] = useState(0);
  const [busy,setBusy] = useState(false);
  const [apiError,setApiError] = useState('');
  const [revision,setRevision] = useState(0);

  useEffect(() => {
    Promise.all([getCategories(), getMedicines(), getAccounts().catch(() => [])])
      .then(([cats, meds, accs]) => {
        setCategories(cats);
        setMedicines(meds);
        setAccounts(accs);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active=true;
    setApiError('');setActivityData({rows:[],totalAmount:0,totalQuantity:0});setTopSellingList([]);setExportVouchers([]);setTotalRevenue(0);
    if(fromDate && toDate && fromDate > toDate) {setBusy(false);return;}
    setBusy(true);
    Promise.all([
      getActivityReport(fromDate,toDate,activityType,activityCategory,activityMedicine),
      getTopSellingMedicines(topLimit,fromDate,toDate,topCategory,topSortBy),
      getRevenueReport(fromDate,toDate,revenueSaleType,revenuePharmacist),
    ])
      .then(([activity,top,revenue])=>{if(active){setActivityData(activity);setTopSellingList(top);setExportVouchers(revenue.danhSachHoaDon);setTotalRevenue(revenue.tongDoanhThu);}})
      .catch(error=>{if(active)setApiError(error instanceof Error?error.message:'Không thể tải báo cáo.');})
      .finally(()=>{if(active)setBusy(false);});
    return ()=>{active=false;};
  },[fromDate,toDate,activityType,activityCategory,activityMedicine,topLimit,topCategory,topSortBy,revenueSaleType,revenuePharmacist,revision]);

  // Daily revenue aggregation for chart
  const revenueChartData = useMemo(() => {
    const days: Record<string, number> = {};
    exportVouchers.forEach(v => {
      const date = v.ngayBan.slice(0, 10);
      days[date] = (days[date] || 0) + v.tongTien;
    });
    const entries = Object.entries(days).sort(([a], [b]) => a.localeCompare(b));
    const maxVal = Math.max(...entries.map(([, val]) => val), 100000);
    return entries.map(([label, value]) => ({
      label,
      value,
      heightPercent: Math.max(0, Math.round((value / maxVal) * 100)),
    }));
  }, [exportVouchers]);

  // Export to CSV function
  const handleExportExcel = async () => {
    if (busy || apiError || fromDate > toDate) return;
    const rows = activeTab === 'ACTIVITY' ? activityData.rows : activeTab === 'TOP_SELLING' ? topSellingList : exportVouchers.map(({chiTiet, ...v}) => v);
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Bao cao');
    XLSX.writeFile(workbook, `BaoCao_${activeTab}_${fromDate}_${toDate}.xlsx`);
    setIsExportMenuOpen(false);
  };

  const handlePrint = () => {
    document.body.classList.add('printing-report');
    window.print();
    document.body.classList.remove('printing-report');
    setIsExportMenuOpen(false);
  };

  return (
    <div id="printable-report">
      <ApiStatus busy={busy} error={apiError} onRetry={()=>setRevision(value=>value+1)} />
      {fromDate > toDate && <p role="alert" className="p-3 mb-4 bg-rose-50 text-rose-700 rounded-lg">Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.</p>}
      {/* Title & Date Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Báo cáo & thống kê</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi và phân tích hiệu quả kinh doanh của nhà thuốc theo thời gian thực.
          </p>
        </div>

        {/* Date Filter & Export Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Từ</span>
            <input
              type="date"
              aria-label="Từ ngày" value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-slate-700 font-medium focus:outline-none"
            />
            <span className="text-slate-400">Đến</span>
            <input
              type="date"
              aria-label="Đến ngày" value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-slate-700 font-medium focus:outline-none"
            />
          </div>

          <div className="relative">
            <button
              disabled={busy || !!apiError || fromDate > toDate} onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất file</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-20 text-xs">
                <button
                  onClick={handleExportExcel}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Tải Excel (.xlsx)</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 border-t border-slate-100"
                >
                  <Printer className="w-4 h-4 text-blue-600" />
                  <span>In báo cáo / PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs matching Mockup Hình 4-14 */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('REVENUE')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'REVENUE'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Doanh thu
        </button>
        <button
          onClick={() => setActiveTab('ACTIVITY')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'ACTIVITY'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Hoạt động nhập / xuất
        </button>
        <button
          onClick={() => setActiveTab('TOP_SELLING')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'TOP_SELLING'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Thuốc bán chạy
        </button>
      </div>

      {/* TAB 1: BÁO CÁO DOANH THU (Mockup Hình 4-14, UC011 Bảng 2-22) */}
      {activeTab === 'REVENUE' && (
        <div className="space-y-6">
          {/* Revenue Filters (Bảng 2-22) */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Bộ lọc doanh thu:
            </span>
            <select
              aria-label="Lọc hình thức xuất"
              value={revenueSaleType}
              onChange={(e) => setRevenueSaleType(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
            >
              <option value="ALL">Tất cả hình thức xuất</option>
              <option value="Bán lẻ trực tiếp">Bán lẻ trực tiếp</option>
              <option value="Theo đơn">Theo đơn bác sĩ</option>
            </select>
            <select
              aria-label="Lọc dược sĩ bán hàng"
              value={revenuePharmacist}
              onChange={(e) => setRevenuePharmacist(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
            >
              <option value="ALL">Tất cả dược sĩ bán hàng</option>
              {accounts
                .filter((acc) => acc.maVaiTro === 'DUOCSI' || acc.maVaiTro === 'QUANLY')
                .map((acc) => (
                  <option key={acc.maTaiKhoan} value={acc.maTaiKhoan}>
                    {acc.hoTen} ({acc.maTaiKhoan})
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Area */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Biểu đồ doanh thu theo thời gian</h3>
                  <p className="text-xs text-slate-400">Doanh thu theo khoảng thời gian đã chọn</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Doanh thu (VNĐ)</span>
                </div>
              </div>

              {/* Bar Chart Visualization */}
              <div className="revenue-chart h-56 flex items-end gap-3 pt-4 border-b border-slate-100" role="img" aria-label="Biểu đồ doanh thu theo ngày">
                {revenueChartData.length === 0 && <div className="chart-empty"><BarChart3 size={36} strokeWidth={1.2}/><strong>Chưa có doanh thu trong kỳ này</strong><span>Chọn khoảng thời gian khác để xem dữ liệu giao dịch.</span></div>}
                {revenueChartData.map((bar, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                      {(bar.value / 1000).toLocaleString('vi-VN')}k
                    </div>
                    <div
                      style={{ height: `${bar.heightPercent}%` }}
                      className="w-full max-w-[42px] bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-md transition-all duration-300 group-hover:from-emerald-500 group-hover:to-teal-300 shadow-sm"
                    />
                    <span className="text-[11px] font-mono text-slate-500">{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* KPI Cards on Right (Hình 4-14) */}
            <div className="space-y-4 flex flex-col justify-between">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-6 shadow-sm border border-slate-700">
                <div className="flex items-center justify-between text-slate-300 text-xs mb-3">
                  <span className="uppercase tracking-wider font-semibold">TỔNG DOANH THU KỲ BÁO CÁO</span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono tracking-tight text-white mb-2">
                  {totalRevenue.toLocaleString('vi-VN')} đ
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Tổng giá trị hóa đơn trong kỳ</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
                  <span className="uppercase tracking-wider font-semibold">SỐ HÓA ĐƠN ĐÃ XUẤT</span>
                  <Receipt className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-3xl font-bold font-mono text-slate-800">
                  {exportVouchers.length.toLocaleString('vi-VN')}
                </div>
                <div className="text-xs text-slate-400 mt-1">Số giao dịch trong khoảng thời gian đã chọn</div>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 text-xs text-emerald-900 flex items-start gap-2.5">
                <ShoppingBag className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Dữ liệu từ giao dịch tại quầy</div>
                  <div className="text-emerald-700 text-[11px] mt-0.5">
                    Dữ liệu được cập nhật tự động ngay khi dược sĩ thực hiện thanh toán tại quầy.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Detailed Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Danh sách Hóa đơn bán lẻ phát sinh trong kỳ
              </h3>
              <span className="text-xs text-slate-500">
                Hiển thị <strong>{exportVouchers.length}</strong> giao dịch
              </span>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500">
                <tr>
                  <th className="py-3 px-4">MÃ HÓA ĐƠN</th>
                  <th className="py-3 px-4">THỜI ĐIỂM</th>
                  <th className="py-3 px-4">KHÁCH HÀNG</th>
                  <th className="py-3 px-4">DƯỢC SĨ BÁN</th>
                  <th className="py-3 px-4">HÌNH THỨC</th>
                  <th className="py-3 px-4 text-right">CHIẾT KHẤU</th>
                  <th className="py-3 px-4 text-right">TỔNG TIỀN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {exportVouchers.map((v) => (
                  <tr key={v.maPX} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-700">{v.maPX}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{v.ngayBan}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {v.tenKhachHang || 'Khách mua lẻ'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{v.tenNguoiBan || v.nguoiBan}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          v.loaiXuat === 'Theo đơn'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {v.loaiXuat}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {v.chietKhau > 0 ? `-${v.chietKhau.toLocaleString('vi-VN')} đ` : '0 đ'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {v.tongTien.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                ))}

                {exportVouchers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      Không có giao dịch bán lẻ nào trong khoảng thời gian đã chọn.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: BÁO CÁO HOẠT ĐỘNG (UC009 - Bảng 2-17 & 2-18) */}
      {activeTab === 'ACTIVITY' && (
        <div className="space-y-4">
          {/* Activity Filters */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 text-xs">
            <span className="font-semibold text-slate-600 mr-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Lọc loại hoạt động:
            </span>
            {[
              { id: 'ALL', label: 'Tất cả hoạt động' },
              { id: 'IMPORT', label: 'Chỉ Nhập kho' },
              { id: 'EXPORT', label: 'Chỉ Xuất kho (Bán lẻ)' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setActivityType(btn.id as any)}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  activityType === btn.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {btn.label}
              </button>
            ))}

            <select
              aria-label="Lọc nhóm thuốc hoạt động"
              value={activityCategory}
              onChange={(e) => setActivityCategory(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
            >
              <option value="ALL">Tất cả nhóm thuốc</option>
              {categories.map((cat) => (
                <option key={cat.maNhom} value={cat.maNhom}>
                  {cat.tenNhom}
                </option>
              ))}
            </select>

            <select
              aria-label="Lọc mã thuốc hoạt động"
              value={activityMedicine}
              onChange={(e) => setActivityMedicine(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 max-w-[200px]"
            >
              <option value="ALL">Tất cả mặt hàng thuốc</option>
              {medicines.map((med) => (
                <option key={med.maThuoc} value={med.maThuoc}>
                  {med.tenThuoc} ({med.maThuoc})
                </option>
              ))}
            </select>

            <div className="ml-auto text-slate-500 font-mono">
              Tổng số lượng luân chuyển: <strong>{activityData.totalQuantity}</strong> đơn vị · Giá trị:{' '}
              <strong className="text-emerald-700">
                {activityData.totalAmount.toLocaleString('vi-VN')} đ
              </strong>
            </div>
          </div>

          {/* Activity Data Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500">
                <tr>
                  <th className="py-3 px-4">MÃ PHIẾU</th>
                  <th className="py-3 px-4">LOẠI HOẠT ĐỘNG</th>
                  <th className="py-3 px-4">NGÀY GIAO DỊCH</th>
                  <th className="py-3 px-4">TÊN DƯỢC PHẨM</th>
                  <th className="py-3 px-4 text-right">SỐ LƯỢNG</th>
                  <th className="py-3 px-4 text-right">ĐƠN GIÁ (Đ)</th>
                  <th className="py-3 px-4 text-right">THÀNH TIỀN (Đ)</th>
                  <th className="py-3 px-4">NGƯỜI THỰC HIỆN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {activityData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{row.maPhieu}</td>
                    <td className="py-3 px-4">
                      {row.loai === 'Nhập kho' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Nhập kho
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Xuất kho
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{row.ngayGD}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{row.tenThuoc}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      {row.soLuong}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {row.donGia.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      {row.thanhTien.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{row.nguoiThucHien}</td>
                  </tr>
                ))}

                {activityData.rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      Không tìm thấy dữ liệu giao dịch trong khoảng thời gian đã chọn.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: THỐNG KÊ THUỐC BÁN CHẠY (UC010 - Bảng 2-19 & 2-20) */}
      {activeTab === 'TOP_SELLING' && (
        <div className="space-y-6">
          {/* Top Rank Selector & Filters (Bảng 2-20) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-slate-700">Hiển thị xếp hạng:</span>
              {[5, 10, 20].map((num) => (
                <button
                  key={num}
                  onClick={() => setTopLimit(num)}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    topLimit === num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Top {num}
                </button>
              ))}

              <select
                aria-label="Lọc nhóm thuốc bán chạy"
                value={topCategory}
                onChange={(e) => setTopCategory(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
              >
                <option value="ALL">Tất cả nhóm thuốc</option>
                {categories.map((cat) => (
                  <option key={cat.maNhom} value={cat.maNhom}>
                    {cat.tenNhom}
                  </option>
                ))}
              </select>

              <select
                aria-label="Tiêu chí thống kê"
                value={topSortBy}
                onChange={(e) => setTopSortBy(e.target.value as 'QUANTITY' | 'REVENUE')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
              >
                <option value="QUANTITY">Xếp theo Số lượng bán</option>
                <option value="REVENUE">Xếp theo Doanh thu</option>
              </select>
            </div>
            <div className="text-slate-500">
              Tổng hợp dựa trên {topSortBy === 'REVENUE' ? 'doanh thu' : 'số lượng thuốc'} thực tế đã xuất bán
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual SVG Donut/Pie Chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col items-center justify-center">
              <h3 className="text-sm font-bold text-slate-800 self-start mb-4">
                Biểu đồ tỷ trọng Top thuốc bán chạy
              </h3>

              <div className="relative w-44 h-44 my-2">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.91549430918954"
                    fill="transparent"
                    stroke="#e2e8f0"
                    strokeWidth="3.5"
                  />
                  {(() => {
                    const top4 = topSellingList.slice(0, 4);
                    const total = top4.reduce(
                      (s, item) => s + (topSortBy === 'REVENUE' ? item.doanhThu : item.soLuong),
                      0,
                    );
                    if (total <= 0) return null;
                    const colors = ['#059669', '#0d9488', '#3b82f6', '#8b5cf6'];
                    let offset = 0;
                    return top4.map((item, idx) => {
                      const val = topSortBy === 'REVENUE' ? item.doanhThu : item.soLuong;
                      const pct = Math.max(1, Math.round((val / total) * 100));
                      const el = (
                        <circle
                          key={item.maThuoc}
                          cx="18"
                          cy="18"
                          r="15.91549430918954"
                          fill="transparent"
                          stroke={colors[idx % colors.length]}
                          strokeWidth="4"
                          strokeDasharray={`${pct} ${100 - pct}`}
                          strokeDashoffset={`${-offset}`}
                        />
                      );
                      offset += pct;
                      return el;
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-slate-400">Xếp hạng</span>
                  <span className="text-lg font-bold text-slate-800 font-mono">TOP {topLimit}</span>
                </div>
              </div>

              <div className="w-full space-y-1.5 mt-4 text-xs">
                {topSellingList.slice(0, 4).map((item, i) => (
                  <div key={item.maThuoc} className="flex items-center justify-between text-slate-600">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          i === 0
                            ? 'bg-emerald-600'
                            : i === 1
                            ? 'bg-teal-600'
                            : i === 2
                            ? 'bg-blue-500'
                            : 'bg-purple-500'
                        }`}
                      />
                      <span className="truncate max-w-[150px]">{item.tenThuoc}</span>
                    </div>
                    <span className="font-mono font-semibold">{item.soLuong} đơn vị</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Table */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="py-3 px-4 w-14 text-center">HẠNG</th>
                    <th className="py-3 px-4">MÃ & TÊN THUỐC</th>
                    <th className="py-3 px-4">NHÓM DƯỢC PHẨM</th>
                    <th className="py-3 px-4 text-right">SỐ LƯỢNG BÁN</th>
                    <th className="py-3 px-4 text-right">DOANH THU (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {topSellingList.map((item) => (
                    <tr key={item.maThuoc} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                            item.rank === 1
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : item.rank === 2
                              ? 'bg-slate-200 text-slate-800'
                              : item.rank === 3
                              ? 'bg-amber-50 text-amber-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {item.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.tenThuoc}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.maThuoc}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{item.tenNhom}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {item.soLuong}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {item.doanhThu.toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  ))}
                  {topSellingList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        Chưa có dữ liệu bán lẻ trong kỳ để thống kê.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
