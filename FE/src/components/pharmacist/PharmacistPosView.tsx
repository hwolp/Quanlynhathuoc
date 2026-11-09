import { ApiStatus, useApiAction } from '../ui/api-status';
import { Dialog } from '../ui/dialog';
import { AppSidebar, PageContext, StatCards } from '../ui/workspace';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Màn hình Bán lẻ / Kê đơn POS Dược sĩ theo Mockup Hình 4-13 và Đặc tả UC005, UC006 trong SRS
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  Package,
  Users,
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  XCircle,
  Eye,
  CheckCircle2,
  Pill,
  ShieldAlert,
  Edit2,
  X,
} from 'lucide-react';
import {
  Thuoc,
  NhomThuoc,
  TaiKhoan,
  PhieuXuat,
  ChiTietPhieuXuat,
} from '../../types/pharmacy';
import {
  getMedicines,
  getCategories,
  createExportVoucher,
  getExportVouchers,
  updateExportVoucher,
  deleteExportVoucher,
  getMedicineImageUrl,
} from '../../services/pharmacyService';
import { InvoiceModal } from '../common/InvoiceModal';

interface CartItem {
  medicine: Thuoc;
  quantity: number;
}

interface PharmacistPosViewProps {
  currentUser: TaiKhoan;
  onLogout: () => void;
}

export const PharmacistPosView: React.FC<PharmacistPosViewProps> = ({ currentUser, onLogout }) => {
  const { busy, error: apiError, run } = useApiAction();
  const [activeNav, setActiveNav] = useState<'POS' | 'INVENTORY' | 'HISTORY'>('POS');
  const [medicines, setMedicines] = useState<Thuoc[]>([]);
  const [categories, setCategories] = useState<NhomThuoc[]>([]);

  // Search & Filter (POS)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('ALL');

  // Search & Filter (UC005: Tra cứu tồn kho)
  const [invSearch, setInvSearch] = useState('');
  const [invCategory, setInvCategory] = useState<string>('ALL');
  const [invStatus, setInvStatus] = useState<'ALL' | 'Còn' | 'Sắp hết' | 'Hết'>('ALL');
  const [detailMedicine, setDetailMedicine] = useState<Thuoc | null>(null);

  // Edit Export Voucher state (UC006)
  const [editingVoucher, setEditingVoucher] = useState<PhieuXuat | null>(null);
  const [editCustomer, setEditCustomer] = useState('');
  const [editLoaiXuat, setEditLoaiXuat] = useState<'Bán lẻ trực tiếp' | 'Theo đơn'>('Bán lẻ trực tiếp');
  const [editPayment, setEditPayment] = useState<'Tiền mặt' | 'Chuyển khoản'>('Tiền mặt');
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [editItems, setEditItems] = useState<ChiTietPhieuXuat[]>([]);

  // Cart / Phiếu xuất
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [exportType, setExportType] = useState<'Bán lẻ trực tiếp' | 'Theo đơn'>('Bán lẻ trực tiếp');
  const [paymentMethod, setPaymentMethod] = useState<'Tiền mặt' | 'Chuyển khoản'>('Tiền mặt');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Invoice Modal
  const [justCompletedVoucher, setJustCompletedVoucher] = useState<PhieuXuat | null>(null);

  // History list
  const [historyVouchers, setHistoryVouchers] = useState<PhieuXuat[]>([]);

  // Order code auto-generator
  const [currentOrderCode, setCurrentOrderCode] = useState(() => `PX-${crypto.randomUUID()}`);

  const loadData = async () => {
    const [meds,cats,vouchers] = await Promise.all([getMedicines(),getCategories(),getExportVouchers()]);
    setMedicines(meds);setCategories(cats);setHistoryVouchers(vouchers);
  };
  useEffect(() => { void run(loadData); }, []);

  // Filter medicines
  const filteredMedicines = useMemo(() => {
    return medicines.filter((m) => {
      if (selectedCat !== 'ALL' && m.maNhom !== selectedCat) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          m.tenThuoc.toLowerCase().includes(q) ||
          m.maThuoc.toLowerCase().includes(q) ||
          (m.hoatChat && m.hoatChat.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [medicines, selectedCat, searchQuery]);

  // Filter medicines for Inventory tab (UC005 - Bảng 2-10)
  const filteredInventory = useMemo(() => {
    return medicines.filter((m) => {
      if (invCategory !== 'ALL' && m.maNhom !== invCategory) return false;
      if (invStatus === 'Hết' && m.tongTonKho > 0) return false;
      if (invStatus === 'Sắp hết' && !(m.tongTonKho > 0 && m.tongTonKho <= m.tonToiThieu)) return false;
      if (invStatus === 'Còn' && m.tongTonKho <= m.tonToiThieu) return false;
      if (invSearch.trim()) {
        const q = invSearch.toLowerCase().trim();
        return (
          m.tenThuoc.toLowerCase().includes(q) ||
          m.maThuoc.toLowerCase().includes(q) ||
          (m.hoatChat && m.hoatChat.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [medicines, invCategory, invStatus, invSearch]);

  const handleOpenEditVoucher = (v: PhieuXuat) => {
    setEditingVoucher(v);
    setEditCustomer(v.tenKhachHang || '');
    setEditLoaiXuat(v.loaiXuat);
    setEditPayment(v.phuongThucThanhToan);
    setEditDiscount(v.chietKhau);
    setEditItems(v.chiTiet.map((ct) => ({ ...ct })));
  };

  const handleSaveEditVoucher = (e: React.FormEvent) => run(async () => {
    e.preventDefault();
    if (!editingVoucher || editItems.length === 0) return;
    await updateExportVoucher(editingVoucher.maPX, {
      loaiXuat: editLoaiXuat,
      tenKhachHang: editCustomer.trim() || undefined,
      chietKhau: Math.max(0, Number(editDiscount) || 0),
      phuongThucThanhToan: editPayment,
      chiTiet: editItems,
    });
    setEditingVoucher(null);
    await loadData();
  });

  const handleCancelVoucher = (v: PhieuXuat) => run(async () => {
    if (window.confirm(`Xác nhận hủy phiếu xuất ${v.maPX} và hoàn trả số lượng thuốc vào tồn kho?`)) {
      await deleteExportVoucher(v.maPX);
      await loadData();
    }
  });
  const handleAddToCart = (medicine: Thuoc) => {
    setErrorMessage('');
    if (medicine.hanSuDung && medicine.hanSuDung < new Date().toLocaleDateString('en-CA')) { setErrorMessage('Thuốc đã hết hạn sử dụng, không thể bán.'); return; }
    if (medicine.tongTonKho <= 0) {
      setErrorMessage(`Thuốc "${medicine.tenThuoc}" đã hết hàng trong kho.`);
      return;
    }

    const existingIndex = cartItems.findIndex((c) => c.medicine.maThuoc === medicine.maThuoc);
    if (existingIndex > -1) {
      const currentQty = cartItems[existingIndex].quantity;
      if (currentQty + 1 > medicine.tongTonKho) {
        setErrorMessage(`Chỉ còn ${medicine.tongTonKho} đơn vị ${medicine.tenThuoc} trong kho.`);
        return;
      }
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, { medicine, quantity: 1 }]);
    }
  };

  const handleUpdateQuantity = (maThuoc: string, newQty: number) => {
    setErrorMessage('');
    if (newQty <= 0) {
      handleRemoveItem(maThuoc);
      return;
    }

    const med = medicines.find((m) => m.maThuoc === maThuoc);
    if (med && newQty > med.tongTonKho) {
      setErrorMessage(`Số lượng yêu cầu (${newQty}) vượt quá tồn kho hiện tại (${med.tongTonKho}).`);
      return;
    }

    setCartItems(
      cartItems.map((item) =>
        item.medicine.maThuoc === maThuoc ? { ...item, quantity: newQty } : item
      )
    );
  };

  const handleRemoveItem = (maThuoc: string) => {
    setCartItems(cartItems.filter((item) => item.medicine.maThuoc !== maThuoc));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setErrorMessage('');
  };

  // Totals calculation
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.medicine.giaBan * item.quantity, 0);
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    return Math.round((subtotal * discountPercent) / 100);
  }, [subtotal, discountPercent]);

  const grandTotal = Math.max(0, subtotal - discountAmount);

  // Submit Checkout (UC006 Bảng 2-11 & 2-12)
  const handleCheckout = () => run(async () => {
    setErrorMessage('');
    if (cartItems.length === 0) {
      setErrorMessage('Phiếu xuất chưa có mặt hàng nào để thanh toán.');
      return;
    }

    const now = new Date();
    const ngayBan = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const chiTiet: ChiTietPhieuXuat[] = cartItems.map((item) => ({
      maPX: currentOrderCode,
      maThuoc: item.medicine.maThuoc,
      tenThuoc: item.medicine.tenThuoc,
      donViTinh: item.medicine.donViTinh,
      soLuongXuat: item.quantity,
      donGiaBan: item.medicine.giaBan,
      thanhTien: item.medicine.giaBan * item.quantity,
    }));

    const voucher: PhieuXuat = {
      maPX: currentOrderCode,
      nguoiBan: currentUser.maTaiKhoan,
      tenNguoiBan: currentUser.hoTen,
      ngayBan,
      loaiXuat: exportType,
      tenKhachHang: customerName.trim() || undefined,
      chietKhau: discountAmount,
      chietKhauPhanTram: discountPercent,
      tongTien: grandTotal,
      phuongThucThanhToan: paymentMethod,
      chiTiet,
    };

    const res = await createExportVoucher(voucher);
    if (res.success) {
      setJustCompletedVoucher(res.voucher);
      // Reset form
      setCartItems([]);
      setCustomerName('');
      setDiscountPercent(0);
      // Generate next order code
      setCurrentOrderCode(`PX-${crypto.randomUUID()}`);
      await loadData();
    } else {
      setErrorMessage(res.message || 'Lỗi khi xuất hóa đơn bán lẻ.');
    }
  });

  return (
    <div className="workspace-shell flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar matching Mockup Hình 4-13 */}
      <AppSidebar user={currentUser} items={[{id:'POS',label:'Bán hàng',icon:ShoppingBag},{id:'INVENTORY',label:'Kho thuốc',icon:Package},{id:'HISTORY',label:'Lịch sử đơn',icon:Receipt}]} active={activeNav} onSelect={id => setActiveNav(id as typeof activeNav)} onLogout={onLogout} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Breadcrumb */}
        <ApiStatus busy={busy} error={apiError} onRetry={()=>void run(loadData)} />
        <PageContext label="Quầy bán thuốc" />

        {activeNav === 'POS' && (
          <main className="flex-1 flex overflow-hidden">
            {/* LEFT COLUMN: Tra cứu tồn kho & Medicine Cards Grid (Hình 4-13) */}
            <section className="flex-1 flex flex-col p-6 overflow-hidden border-r border-slate-200">
              {/* Title & Search Bar (Hình 4-13) */}
              <div className="mb-4">
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">Quầy bán thuốc</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quản lý và tìm kiếm dược phẩm sẵn có trong quầy.
                </p>

                <div className="mt-3 relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm tên thuốc, hoạt chất hoặc mã vạch (F1)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar text-xs">
                  <button
                    onClick={() => setSelectedCat('ALL')}
                    className={`px-3 py-1 rounded-lg shrink-0 font-medium transition ${
                      selectedCat === 'ALL'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Tất cả nhóm
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.maNhom}
                      onClick={() => setSelectedCat(c.maNhom)}
                      className={`px-3 py-1 rounded-lg shrink-0 font-medium transition ${
                        selectedCat === c.maNhom
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {c.tenNhom}
                    </button>
                  ))}
                </div>
              </div>

              {/* Medicine Cards Grid (Hình 4-13) */}
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3.5">
                  {filteredMedicines.map((med) => {
                    const isOutOfStock = med.tongTonKho <= 0;
                    const isLow = med.tongTonKho <= med.tonToiThieu;

                    return (
                      <div
                        key={med.maThuoc}
                        className={`bg-white rounded-xl border p-3.5 flex flex-col justify-between transition shadow-2xs ${
                          isOutOfStock
                            ? 'border-slate-200 opacity-60 bg-slate-50'
                            : 'border-slate-200/90 hover:border-emerald-500/80 hover:shadow-sm'
                        }`}
                      >
                        <div>
                          {/* Visual thumbnail */}
                          <div className="medicine-visual w-full h-28 rounded-lg mb-2.5 flex items-center justify-center overflow-hidden relative bg-slate-100">
                            <img
                              src={getMedicineImageUrl(med)}
                              alt={med.tenThuoc}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-medium rounded">
                              {med.donViTinh}
                            </span>

                            {isOutOfStock ? (
                              <span className="absolute top-1.5 right-1.5 px-2 py-0.5 bg-rose-600 text-white text-xs font-bold rounded">
                                HẾT HÀNG
                              </span>
                            ) : isLow ? (
                              <span className="absolute top-1.5 right-1.5 px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded">
                                SẮP HẾT
                              </span>
                            ) : null}
                          </div>

                          <h3 className="font-bold text-slate-900 text-xs line-clamp-1">{med.tenThuoc}</h3>
                          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                            {med.hoatChat || med.quyCach || med.maThuoc}
                          </p>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                            <div>
                              <div className="text-xs text-slate-400 uppercase">Giá bán</div>
                              <div className="text-xs font-bold text-slate-900 font-mono">
                                {med.giaBan.toLocaleString('vi-VN')} đ
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-400 uppercase">Tồn kho</div>
                              <div
                                className={`text-xs font-bold font-mono ${
                                  isOutOfStock
                                    ? 'text-rose-600'
                                    : isLow
                                    ? 'text-amber-600'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {med.tongTonKho}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Add Button */}
                        <div className="mt-3">
                          {isOutOfStock ? (
                            <button
                              disabled
                              className="w-full py-1.5 bg-slate-200 text-slate-500 text-xs font-medium rounded-lg cursor-not-allowed"
                            >
                              Hết hàng
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAddToCart(med)}
                              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-medium rounded-lg transition flex items-center justify-center gap-1 shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Thêm</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredMedicines.length === 0 && (
                    <div className="col-span-3 text-center py-12 text-slate-400">
                      Không tìm thấy thuốc nào phù hợp với từ khóa "{searchQuery}".
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* RIGHT COLUMN: Phiếu Xuất (Đơn hàng) (Hình 4-13) */}
            <section className="w-96 bg-white flex flex-col p-6 shadow-xs overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
                <div>
                  <h2 className="font-bold text-slate-800 text-sm">Phiếu Xuất (Đơn hàng)</h2>
                  <span className="text-xs font-mono text-emerald-700 font-semibold">
                    {currentOrderCode}
                  </span>
                </div>
                {cartItems.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-slate-400 hover:text-rose-600 text-xs transition"
                    title="Xóa giỏ hàng"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Order Options */}
              <div className="my-3 space-y-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExportType('Bán lẻ trực tiếp')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                      exportType === 'Bán lẻ trực tiếp'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Bán lẻ trực tiếp
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportType('Theo đơn')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                      exportType === 'Theo đơn'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Bán theo đơn
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Tên khách hàng (tùy chọn)..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {errorMessage && (
                <div className="mb-2 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs shrink-0">
                  {errorMessage}
                </div>
              )}

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
                {cartItems.map((item) => (
                  <div key={item.medicine.maThuoc} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 text-xs truncate">
                        {item.medicine.tenThuoc}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {item.medicine.giaBan.toLocaleString('vi-VN')} đ / {item.medicine.donViTinh}
                      </div>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                      <button
                        onClick={() => handleUpdateQuantity(item.medicine.maThuoc, item.quantity - 1)}
                        className="p-1 text-slate-500 hover:bg-white rounded transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-mono font-bold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.medicine.maThuoc, item.quantity + 1)}
                        className="p-1 text-slate-500 hover:bg-white rounded transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Item Total */}
                    <div className="text-right w-18 font-mono text-xs font-bold text-slate-900">
                      {(item.medicine.giaBan * item.quantity).toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                ))}

                {cartItems.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">Chưa có sản phẩm trong phiếu xuất.</p>
                    <p className="text-xs text-slate-400 mt-0.5">Click nút "+ Thêm" bên danh sách thuốc.</p>
                  </div>
                )}
              </div>

              {/* Order Calculations Footer (Hình 4-13) */}
              <div className="pt-4 border-t border-slate-200 space-y-2.5 shrink-0">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Tạm tính</span>
                  <span className="font-mono">{subtotal.toLocaleString('vi-VN')} đ</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Chiết khấu (%)</span>
                  <select
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="px-2 py-0.5 border border-slate-200 rounded text-xs bg-slate-50 font-mono"
                  >
                    <option value="0">0%</option>
                    <option value="3">3%</option>
                    <option value="5">5%</option>
                    <option value="10">10%</option>
                  </select>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-rose-600">
                    <span>Số tiền giảm</span>
                    <span className="font-mono">-{discountAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}

                {/* Big Total Price (Hình 4-13: 560.000đ) */}
                <div className="pt-2 border-t border-dashed border-slate-200 flex items-baseline justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tổng tiền</span>
                  <span className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
                    {grandTotal.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                {/* Payment Method Selector (Hình 4-13: Tiền mặt / Chuyển khoản) */}
                <div className="pt-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Hình thức thanh toán
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Tiền mặt')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border text-xs font-medium transition ${
                        paymentMethod === 'Tiền mặt'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Tiền mặt</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Chuyển khoản')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border text-xs font-medium transition ${
                        paymentMethod === 'Chuyển khoản'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Chuyển khoản</span>
                    </button>
                  </div>
                </div>

                {/* Thanh toán Button (Hình 4-13) */}
                <button
                  onClick={handleCheckout}
                  disabled={busy || cartItems.length === 0}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Thanh toán</span>
                </button>
              </div>
            </section>
          </main>
        )}

        {/* View 2: Kho thuốc (Tra cứu tồn kho chi tiết - UC005 Bảng 2-9 & 2-10) */}
        {activeNav === 'INVENTORY' && (
          <main className="flex-1 p-8 overflow-y-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Kho dược phẩm & Tồn kho thực tế</h2>
                <p className="text-xs text-slate-500">Tra cứu nhanh số lượng, nhóm thuốc, trạng thái tồn kho và hạn sử dụng của thuốc (UC005).</p>
              </div>
            </div>

            {/* Search & Filters (Bảng 2-10: Từ khóa, Nhóm thuốc, Trạng thái tồn kho) */}
            <div className="table-search mb-4">
              <Search size={18} />
              <input
                type="text"
                aria-label="Tra cứu tồn kho"
                maxLength={255}
                value={invSearch}
                onChange={(e) => setInvSearch(e.target.value)}
                placeholder="Tìm theo mã thuốc, tên thuốc hoặc hoạt chất (tối đa 255 ký tự)…"
              />
              <button
                type="button"
                onClick={() => setInvSearch((s) => s.trim())}
                className="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition"
              >
                Tra cứu
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Lọc nhóm thuốc"
                  value={invCategory}
                  onChange={(e) => setInvCategory(e.target.value)}
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
                  {(['ALL', 'Còn', 'Sắp hết', 'Hết'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setInvStatus(st)}
                      className={`px-2.5 py-1.5 rounded-md font-medium transition ${
                        invStatus === st
                          ? 'bg-white text-slate-800 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {st === 'ALL' ? 'Tất cả' : st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="py-3 px-4">MÃ THUỐC</th>
                    <th className="py-3 px-4">TÊN THUỐC</th>
                    <th className="py-3 px-4">QUY CÁCH</th>
                    <th className="py-3 px-4 text-right">GIÁ BÁN</th>
                    <th className="py-3 px-4 text-right">TỒN KHO</th>
                    <th className="py-3 px-4">HẠN SỬ DỤNG</th>
                    <th className="py-3 px-4 text-center">TRẠNG THÁI</th>
                    <th className="py-3 px-4 text-right">CHI TIẾT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredInventory.map((m) => {
                    const isZero = m.tongTonKho === 0;
                    const isLow = m.tongTonKho <= m.tonToiThieu;

                    return (
                      <tr key={m.maThuoc} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-medium text-slate-600">{m.maThuoc}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={getMedicineImageUrl(m)}
                              alt={m.tenThuoc}
                              loading="lazy"
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                            />
                            <span className="font-bold text-slate-900">{m.tenThuoc}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{m.quyCach || m.donViTinh}</td>
                        <td className="py-3 px-4 text-right font-mono font-medium">
                          {m.giaBan.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                          {m.tongTonKho}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{m.hanSuDung || 'N/A'}</td>
                        <td className="py-3 px-4 text-center">
                          {isZero ? (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700">
                              Hết hàng
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                              Sắp hết
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Sẵn sàng
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setDetailMedicine(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition font-medium"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Chi tiết</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredInventory.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        {medicines.length === 0
                          ? 'Hiện không có thuốc nào trong kho dữ liệu.'
                          : 'Không tìm thấy thuốc nào phù hợp với điều kiện tra cứu.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </main>
        )}

        {/* View 3: Lịch sử hóa đơn (UC006: Xem, Sửa, Xóa/Hủy phiếu xuất) */}
        {activeNav === 'HISTORY' && (
          <main className="flex-1 p-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Lịch sử Phiếu Xuất & Bán Lẻ</h2>
                <p className="text-xs text-slate-500">Danh sách các hóa đơn bán hàng đã hoàn tất tại quầy — hỗ trợ xem/in, điều chỉnh hoặc hủy phiếu khi trả hàng (UC006).</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="py-3 px-4">MÃ ĐƠN HÀNG</th>
                    <th className="py-3 px-4">THỜI ĐIỂM</th>
                    <th className="py-3 px-4">KHÁCH HÀNG</th>
                    <th className="py-3 px-4">HÌNH THỨC</th>
                    <th className="py-3 px-4">THANH TOÁN</th>
                    <th className="py-3 px-4 text-right">TỔNG TIỀN</th>
                    <th className="py-3 px-4 text-right">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {historyVouchers.map((v) => (
                    <tr key={v.maPX} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-semibold text-emerald-700">{v.maPX}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{v.ngayBan}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {v.tenKhachHang || 'Khách mua lẻ'}
                      </td>
                      <td className="py-3 px-4">{v.loaiXuat}</td>
                      <td className="py-3 px-4 text-slate-600">{v.phuongThucThanhToan}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {v.tongTien.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => setJustCompletedVoucher(v)}
                          className="px-2.5 py-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded border border-slate-200 text-xs font-medium transition"
                        >
                          Xem / In
                        </button>
                        <button
                          onClick={() => handleOpenEditVoucher(v)}
                          title="Điều chỉnh phiếu xuất"
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition inline-flex items-center"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCancelVoucher(v)}
                          title="Hủy phiếu xuất & hoàn trả tồn kho"
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded border border-slate-200 transition inline-flex items-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {historyVouchers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        Chưa có phiếu xuất nào được thực hiện.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </main>
        )}
      </div>

      {/* MODAL: Xem chi tiết thuốc & lô tồn kho (UC005 - Bảng 2-9 STT 3, 4) */}
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
                <strong className="text-slate-800">
                  {detailMedicine.tenNhom || categories.find((c) => c.maNhom === detailMedicine.maNhom)?.tenNhom || detailMedicine.maNhom}
                </strong>
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

      {/* MODAL: Điều chỉnh Phiếu Xuất (UC006 - Update Hình 2-15) */}
      {editingVoucher && (
        <Dialog label="Điều chỉnh phiếu xuất" onClose={() => setEditingVoucher(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">
                Điều chỉnh Phiếu Xuất: <span className="font-mono text-emerald-700">{editingVoucher.maPX}</span>
              </h3>
              <button onClick={() => setEditingVoucher(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditVoucher} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Khách hàng</label>
                  <input
                    type="text"
                    value={editCustomer}
                    onChange={(e) => setEditCustomer(e.target.value)}
                    placeholder="Khách mua lẻ"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hình thức xuất</label>
                  <select
                    value={editLoaiXuat}
                    onChange={(e) => setEditLoaiXuat(e.target.value as 'Bán lẻ trực tiếp' | 'Theo đơn')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Bán lẻ trực tiếp">Bán lẻ trực tiếp</option>
                    <option value="Theo đơn">Theo đơn</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thanh toán</label>
                  <select
                    value={editPayment}
                    onChange={(e) => setEditPayment(e.target.value as 'Tiền mặt' | 'Chuyển khoản')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Tiền mặt">Tiền mặt</option>
                    <option value="Chuyển khoản">Chuyển khoản</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chiết khấu (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-right"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2 px-3">THUỐC</th>
                      <th className="py-2 px-3 w-24 text-right">SỐ LƯỢNG</th>
                      <th className="py-2 px-3 text-right">THÀNH TIỀN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {editItems.map((it, idx) => (
                      <tr key={it.maThuoc}>
                        <td className="py-2 px-3 font-medium text-slate-800">{it.tenThuoc}</td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min="1"
                            value={it.soLuongXuat}
                            onChange={(e) => {
                              const qty = Math.max(1, parseInt(e.target.value) || 1);
                              const next = [...editItems];
                              next[idx] = { ...it, soLuongXuat: qty, thanhTien: qty * it.donGiaBan };
                              setEditItems(next);
                            }}
                            className="w-16 px-2 py-1 border border-slate-200 rounded font-mono text-right"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold">
                          {(it.soLuongXuat * it.donGiaBan).toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
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
                  Lưu cập nhật
                </button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {/* Invoice Modal Preview */}
      {justCompletedVoucher && (
        <InvoiceModal
          voucher={justCompletedVoucher}
          onClose={() => setJustCompletedVoucher(null)}
        />
      )}
    </div>
  );
};
