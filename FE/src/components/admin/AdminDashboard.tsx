import { ApiStatus, useApiAction } from '../ui/api-status';
import { Dialog } from '../ui/dialog';
import { AppSidebar, PageContext, StatCards } from '../ui/workspace';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Màn hình Admin theo Mockup Hình 4-11 và Đặc tả UC002, UC003, UC004 trong SRS
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  UserPlus,
  Edit2,
  Trash2,
  Key,
  Lock,
  Unlock,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  History,
  Eye,
  X,
} from 'lucide-react';
import { TaiKhoan, RoleType, AuditLogStatus } from '../../types/pharmacy';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  updateAccountRole,
  updateAccountStatus,
  getAuditLogs,
} from '../../services/pharmacyService';

interface AdminDashboardProps {
  currentUser: TaiKhoan;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onLogout }) => {
  const { busy, error: apiError, run } = useApiAction();
  const [activeTab, setActiveTab] = useState<'ACCOUNTS' | 'STATUS_LOGS'>('ACCOUNTS');
  const [accounts, setAccounts] = useState<TaiKhoan[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form state - Create Account
  const [formTenDangNhap, setFormTenDangNhap] = useState('');
  const [formMatKhau, setFormMatKhau] = useState('');
  const [formXacNhanMatKhau, setFormXacNhanMatKhau] = useState('');
  const [formHoTen, setFormHoTen] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSoDienThoai, setFormSoDienThoai] = useState('');
  const [formVaiTro, setFormVaiTro] = useState<RoleType>('DUOCSI');
  const [formError, setFormError] = useState('');

  // Form state - Edit Account
  const [editHoTen, setEditHoTen] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSoDienThoai, setEditSoDienThoai] = useState('');
  const [editMatKhauMoi, setEditMatKhauMoi] = useState('');
  const [editXacNhanMatKhau, setEditXacNhanMatKhau] = useState('');

  // Form state - Change Role
  const [newSelectedRole, setNewSelectedRole] = useState<RoleType>('DUOCSI');

  // Form state - Lock/Unlock Status
  const [statusReason, setStatusReason] = useState('');
  const [targetStatus, setTargetStatus] = useState<'Hoạt động' | 'Khóa'>('Khóa');

  // Load data
  const loadData = async () => {
    const [nextAccounts, nextLogs] = await Promise.all([getAccounts(), getAuditLogs()]);
    setAccounts(nextAccounts); setAuditLogs(nextLogs);
  };
  useEffect(() => { void run(loadData); }, []);

  const selectedAccount = accounts.find((a) => a.maTaiKhoan === selectedAccountId);

  // Search filtering
  const filteredAccounts = accounts.filter((acc) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      acc.maTaiKhoan.toLowerCase().includes(query) ||
      acc.tenDangNhap.toLowerCase().includes(query) ||
      acc.hoTen.toLowerCase().includes(query) ||
      (acc.email && acc.email.toLowerCase().includes(query))
    );
  });

  // Action: Open Detail Modal (UC003 - Xem R-Read)
  const handleOpenDetail = (acc?: TaiKhoan) => {
    const target = acc || selectedAccount;
    if (!target) return;
    setSelectedAccountId(target.maTaiKhoan);
    setIsDetailModalOpen(true);
  };

  // Action: Open Edit Modal
  const handleOpenEdit = (acc?: TaiKhoan) => {
    const target = acc || selectedAccount;
    if (!target) return;
    setSelectedAccountId(target.maTaiKhoan);
    setEditHoTen(target.hoTen);
    setEditEmail(target.email || '');
    setEditSoDienThoai(target.soDienThoai || '');
    setEditMatKhauMoi('');
    setEditXacNhanMatKhau('');
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Action: Open Role Modal
  const handleOpenRole = (acc?: TaiKhoan) => {
    const target = acc || selectedAccount;
    if (!target) return;
    setSelectedAccountId(target.maTaiKhoan);
    setNewSelectedRole(target.maVaiTro);
    setIsRoleModalOpen(true);
  };

  // Action: Open Status Modal (Lock/Unlock)
  const handleOpenStatus = (acc?: TaiKhoan) => {
    const target = acc || selectedAccount;
    if (!target) return;
    setSelectedAccountId(target.maTaiKhoan);
    setTargetStatus(target.trangThai === 'Hoạt động' ? 'Khóa' : 'Hoạt động');
    setStatusReason(target.trangThai === 'Hoạt động' ? 'Bạn đã nghỉ việc' : 'Mở khóa kích hoạt lại tài khoản');
    setIsStatusModalOpen(true);
  };

  // Action: Open Delete Modal
  const handleOpenDelete = (acc?: TaiKhoan) => {
    const target = acc || selectedAccount;
    if (!target) return;
    setSelectedAccountId(target.maTaiKhoan);
    setIsDeleteModalOpen(true);
  };

  // Submit Create Account
  const handleCreateSubmit = (e: React.FormEvent) => run(async () => {
    e.preventDefault();
    setFormError('');

    if (!formTenDangNhap.trim() || !formMatKhau.trim() || !formXacNhanMatKhau.trim() || !formHoTen.trim()) {
      setFormError('Vui lòng điền đầy đủ các thông tin bắt buộc (*).');
      return;
    }

    if (formTenDangNhap.trim().length < 8) {
      setFormError('Tên đăng nhập phải có ít nhất 8 ký tự.');
      return;
    }

    if (formMatKhau.length < 6) {
      setFormError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (formMatKhau !== formXacNhanMatKhau) {
      setFormError('Mật khẩu xác nhận không khớp.');
      return;
    }

    const res = await createAccount({
      tenDangNhap: formTenDangNhap.trim(),
      matKhau: formMatKhau,
      xacNhanMatKhau: formXacNhanMatKhau,
      hoTen: formHoTen.trim(),
      email: formEmail.trim() || undefined,
      soDienThoai: formSoDienThoai.trim() || undefined,
      maVaiTro: formVaiTro,
      ghiChu: 'Tạo bởi Admin ' + currentUser.tenDangNhap,
    });

    if (res.success) {
      setSuccessMsg(`Đã tạo tài khoản "${formTenDangNhap.trim()}" thành công.`);
      await loadData();
      setIsCreateModalOpen(false);
      // Reset form
      setFormTenDangNhap('');
      setFormMatKhau('');
      setFormXacNhanMatKhau('');
      setFormHoTen('');
      setFormEmail('');
      setFormSoDienThoai('');
    } else {
      setFormError(res.message || 'Lỗi khi tạo tài khoản');
    }
  });

  // Submit Edit Account
  const handleEditSubmit = (e: React.FormEvent) => run(async () => {
    e.preventDefault();
    setFormError('');
    if (!selectedAccount) return;

    if (!editHoTen.trim()) {
      setFormError('Họ tên nhân viên không được để trống.');
      return;
    }

    if (editMatKhauMoi.trim()) {
      if (editMatKhauMoi.length < 6) {
        setFormError('Mật khẩu mới phải có ít nhất 6 ký tự.');
        return;
      }
      if (editMatKhauMoi !== editXacNhanMatKhau) {
        setFormError('Xác nhận mật khẩu mới không trùng khớp.');
        return;
      }
    }

    const updated = {
      ...selectedAccount,
      hoTen: editHoTen.trim(),
      email: editEmail.trim() || undefined,
      soDienThoai: editSoDienThoai.trim() || undefined,
      matKhau: editMatKhauMoi.trim() ? editMatKhauMoi : selectedAccount.matKhau,
      xacNhanMatKhau: editMatKhauMoi.trim() ? editXacNhanMatKhau : undefined,
    };

    await updateAccount(updated);
    setSuccessMsg(`Đã chỉnh sửa tài khoản "${selectedAccount.tenDangNhap}" thành công.`);
    await loadData();
    setIsEditModalOpen(false);
  });

  // Submit Role Change
  const handleRoleSubmit = () => run(async () => {
    if (!selectedAccount) return;
    await updateAccountRole(selectedAccount.maTaiKhoan, newSelectedRole);
    setSuccessMsg(`Đã phân quyền tài khoản "${selectedAccount.tenDangNhap}" thành công.`);
    await loadData();
    setIsRoleModalOpen(false);
  });

  // Submit Status Change (Lock/Unlock)
  const handleStatusSubmit = () => run(async () => {
    if (!selectedAccount) return;
    await updateAccountStatus(
      selectedAccount.maTaiKhoan,
      targetStatus,
      statusReason,
      currentUser.tenDangNhap
    );
    setSuccessMsg(`Đã thay đổi trạng thái tài khoản "${selectedAccount.tenDangNhap}" sang "${targetStatus}" thành công.`);
    await loadData();
    setIsStatusModalOpen(false);
  });

  // Submit Delete Account
  const handleDeleteSubmit = () => run(async () => {
    if (!selectedAccount) return;
    const res = await deleteAccount(selectedAccount.maTaiKhoan);
    if (res.success) {
      setSuccessMsg(`Đã xóa tài khoản "${selectedAccount.tenDangNhap}" thành công.`);
      await loadData();
      setSelectedAccountId(null);
      setIsDeleteModalOpen(false);
    } else {
      alert(res.message);
    }
  });

  const getRoleBadge = (role: RoleType) => {
    switch (role) {
      case 'ADMIN':
        return <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">ADMIN</span>;
      case 'QUANLY':
        return <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">QUẢN LÝ</span>;
      case 'DUOCSI':
        return <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">DƯỢC SĨ</span>;
    }
  };

  return (
    <div className="workspace-shell flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar matching Mockup Hình 4-11 */}
      <AppSidebar user={currentUser} items={[{id:'ACCOUNTS',label:'Quản lý tài khoản',icon:Users},{id:'STATUS_LOGS',label:'Nhật ký trạng thái',icon:History}]} active={activeTab} onSelect={id => setActiveTab(id as typeof activeTab)} onLogout={onLogout} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <ApiStatus busy={busy} error={apiError} onRetry={()=>void run(loadData)} />
        <PageContext label="Quản trị hệ thống" />

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'ACCOUNTS' ? (
            <div>
              {/* Title & Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-xl font-bold text-slate-800 tracking-tight">Danh sách tài khoản</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Quản lý và phân quyền nhân sự hệ thống nhà thuốc.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setFormError('');
                      setIsCreateModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Tạo tài khoản mới</span>
                  </button>

                  <button
                    onClick={() => handleOpenDetail()}
                    disabled={!selectedAccount}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Chi tiết</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit()}
                    disabled={!selectedAccount}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sửa</span>
                  </button>

                  <button
                    onClick={() => handleOpenDelete()}
                    disabled={!selectedAccount || selectedAccount.maTaiKhoan === currentUser.maTaiKhoan}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 hover:border-rose-200 text-xs font-medium rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa</span>
                  </button>

                  <button
                    onClick={() => handleOpenRole()}
                    disabled={!selectedAccount}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Key className="w-3.5 h-3.5 text-purple-600" />
                    <span>Phân quyền</span>
                  </button>
                </div>
              </div>

              {successMsg && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                  <button type="button" onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Data Table (Hình 4-11) */}
              <StatCards items={[
                {label:'Tổng tài khoản',value:accounts.length,note:'Nhân sự trên hệ thống',icon:Users,tone:'blue'},
                {label:'Đang hoạt động',value:accounts.filter(a=>a.trangThai==='Hoạt động').length,note:'Có quyền truy cập',icon:CheckCircle,tone:'teal'},
                {label:'Đã khóa',value:accounts.filter(a=>a.trangThai==='Khóa').length,note:'Tạm ngừng truy cập',icon:Lock,tone:'rose'},
                {label:'Nhật ký trạng thái',value:auditLogs.length,note:'Lần thay đổi được ghi nhận',icon:History,tone:'amber'}
              ]}/>
              <div className="table-search"><Search size={18}/><input aria-label="Tìm tài khoản" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Tìm theo họ tên, tài khoản hoặc email…"/></div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4 w-12 text-center">Chọn</th>
                      <th className="py-3 px-4">MÃ TK</th>
                      <th className="py-3 px-4">TÊN ĐĂNG NHẬP</th>
                      <th className="py-3 px-4">HỌ TÊN</th>
                      <th className="py-3 px-4">VAI TRÒ</th>
                      <th className="py-3 px-4">TRẠNG THÁI</th>
                      <th className="py-3 px-4 text-right">THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredAccounts.map((acc) => {
                      const isSelected = selectedAccountId === acc.maTaiKhoan;
                      return (
                        <tr
                          key={acc.maTaiKhoan}
                          onClick={() => setSelectedAccountId(acc.maTaiKhoan)}
                          className={`cursor-pointer transition hover:bg-slate-50/80 ${
                            isSelected ? 'bg-emerald-50/40' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-center">
                            <input
                              type="radio"
                              name="accountSelect"
                              checked={isSelected}
                              onChange={() => setSelectedAccountId(acc.maTaiKhoan)}
                              className="text-emerald-600 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-600">
                            {acc.maTaiKhoan}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-900 font-semibold">
                            {acc.tenDangNhap}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {acc.hoTen}
                            {acc.soDienThoai && (
                              <span className="block text-xs text-slate-400 font-mono">
                                {acc.soDienThoai}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">{getRoleBadge(acc.maVaiTro)}</td>
                          <td className="py-3 px-4">
                            {acc.trangThai === 'Hoạt động' ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                HOẠT ĐỘNG
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-rose-600 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                KHÓA
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(acc);
                              }}
                              title="Xem chi tiết tài khoản"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenStatus(acc);
                              }}
                              title={acc.trangThai === 'Hoạt động' ? 'Khóa tài khoản' : 'Mở khóa'}
                              className={`p-1.5 rounded-lg border transition ${
                                acc.trangThai === 'Hoạt động'
                                  ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {acc.trangThai === 'Hoạt động' ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(acc);
                              }}
                              title="Sửa thông tin"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredAccounts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400">
                          Không tìm thấy tài khoản nào phù hợp với từ khóa.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Audit Log View */
            <div>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                  Nhật ký Quản lý Trạng thái Tài khoản
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lịch sử các lần khóa và mở khóa tài khoản người dùng theo yêu cầu bảo mật (UC004).
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">THỜI ĐIỂM</th>
                      <th className="py-3 px-4">MÃ & TÊN TÀI KHOẢN</th>
                      <th className="py-3 px-4">TRẠNG THÁI</th>
                      <th className="py-3 px-4">LÝ DO GHI NHẬN</th>
                      <th className="py-3 px-4">NGƯỜI THỰC HIỆN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono text-slate-600">{log.thoiDiem}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900">{log.tenTaiKhoan}</span>
                          <span className="text-slate-400 font-mono ml-1.5">({log.maTaiKhoan})</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-400 mr-1">{log.trangThaiCu} →</span>
                          <span
                            className={`font-semibold ${
                              log.trangThaiMoi === 'Khóa' ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {log.trangThaiMoi}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{log.lyDo}</td>
                        <td className="py-3 px-4 font-mono text-slate-800">@{log.nguoiThucHien}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400">
                          Chưa có nhật ký thay đổi trạng thái nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: Tạo tài khoản mới (Hình 2-6, Bảng 2-3 & 2-4) */}
      {isCreateModalOpen && (
        <Dialog label="Tạo tài khoản người dùng mới" onClose={() => setIsCreateModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">Tạo tài khoản người dùng mới</h3>
              <button aria-label="Đóng hộp thoại"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên đăng nhập <span className="text-rose-500">* (tối thiểu 8 ký tự)</span>
                </label>
                <input
                  type="text"
                  value={formTenDangNhap}
                  onChange={(e) => setFormTenDangNhap(e.target.value)}
                  placeholder="Ví dụ: duocsi_thang01"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ tên nhân viên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formHoTen}
                  onChange={(e) => setFormHoTen(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn Nam"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu <span className="text-rose-500">* (&gt;=6 ký tự)</span>
                  </label>
                  <input
                    type="password"
                    value={formMatKhau}
                    onChange={(e) => setFormMatKhau(e.target.value)}
                    placeholder="Mật khẩu"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Xác nhận mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formXacNhanMatKhau}
                    onChange={(e) => setFormXacNhanMatKhau(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phân quyền vai trò <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formVaiTro}
                  onChange={(e) => setFormVaiTro(e.target.value as RoleType)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                >
                  <option value="DUOCSI">Dược sĩ (Bán lẻ POS, tra cứu)</option>
                  <option value="QUANLY">Quản lý (Kho hàng, phiếu nhập, báo cáo)</option>
                  <option value="ADMIN">Admin (Quản trị viên toàn hệ thống)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="email@pharma.vn"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={formSoDienThoai}
                    onChange={(e) => setFormSoDienThoai(e.target.value)}
                    placeholder="090xxxxxxx"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit" disabled={busy}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {/* MODAL: Xem chi tiết tài khoản (UC003 - Xem R-Read Hình 2-7) */}
      {isDetailModalOpen && selectedAccount && (
        <Dialog label="Chi tiết thông tin tài khoản" onClose={() => setIsDetailModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">
                Chi tiết tài khoản: {selectedAccount.tenDangNhap}
              </h3>
              <button
                aria-label="Đóng hộp thoại"
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã tài khoản:</span>
                <span className="font-mono font-semibold text-slate-900">{selectedAccount.maTaiKhoan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tên đăng nhập:</span>
                <span className="font-mono font-semibold text-slate-900">{selectedAccount.tenDangNhap}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Họ tên nhân viên:</span>
                <span className="font-semibold text-slate-900">{selectedAccount.hoTen}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Vai trò hệ thống:</span>
                {getRoleBadge(selectedAccount.maVaiTro)}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trạng thái:</span>
                <span className={selectedAccount.trangThai === 'Hoạt động' ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>
                  {selectedAccount.trangThai}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span>{selectedAccount.email || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số điện thoại:</span>
                <span className="font-mono">{selectedAccount.soDienThoai || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày tạo:</span>
                <span className="font-mono">{selectedAccount.ngayTao}</span>
              </div>
              {selectedAccount.ghiChu && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-500 block mb-1">Ghi chú:</span>
                  <p className="text-slate-800">{selectedAccount.ghiChu}</p>
                </div>
              )}
            </div>

            <div className="pt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenEdit(selectedAccount);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                Chỉnh sửa
              </button>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* MODAL: Sửa tài khoản (UC003) */}
      {isEditModalOpen && selectedAccount && (
        <Dialog label="Thông tin chi tiết" onClose={() => setIsEditModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">
                Chỉnh sửa tài khoản: {selectedAccount.tenDangNhap}
              </h3>
              <button aria-label="Đóng hộp thoại"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ tên nhân viên
                </label>
                <input
                  type="text"
                  value={editHoTen}
                  onChange={(e) => setEditHoTen(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu mới (tùy chọn)
                  </label>
                  <input
                    type="password"
                    value={editMatKhauMoi}
                    onChange={(e) => setEditMatKhauMoi(e.target.value)}
                    placeholder="Bỏ trống nếu giữ nguyên"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type="password"
                    value={editXacNhanMatKhau}
                    onChange={(e) => setEditXacNhanMatKhau(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                <input
                  type="text"
                  value={editSoDienThoai}
                  onChange={(e) => setEditSoDienThoai(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
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

      {/* MODAL: Phân quyền vai trò (Hình 2-10) */}
      {isRoleModalOpen && selectedAccount && (
        <Dialog label="Phân quyền tài khoản" onClose={() => setIsRoleModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100">
            <h3 className="font-bold text-slate-800 text-base mb-1">Phân quyền tài khoản</h3>
            <p className="text-xs text-slate-500 mb-4">
              Cập nhật quyền hạn cho tài khoản <strong>{selectedAccount.tenDangNhap}</strong>
            </p>

            <div className="space-y-2 mb-5">
              {[
                { role: 'DUOCSI', title: 'Dược sĩ', desc: 'Bán lẻ thuốc, tra cứu kho, tạo phiếu xuất POS' },
                { role: 'QUANLY', title: 'Quản lý', desc: 'Kiểm soát tồn kho, lập phiếu nhập, xem báo cáo' },
                { role: 'ADMIN', title: 'Admin', desc: 'Toàn quyền quản trị tài khoản và hệ thống' },
              ].map((item) => (
                <label
                  key={item.role}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    newSelectedRole === item.role
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="roleOpt"
                    value={item.role}
                    checked={newSelectedRole === item.role}
                    onChange={() => setNewSelectedRole(item.role as RoleType)}
                    className="mt-0.5 text-emerald-600"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">{item.title}</div>
                    <div className="text-xs text-slate-500 leading-tight">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={busy} onClick={handleRoleSubmit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                Xác nhận phân quyền
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* MODAL: Đổi trạng thái (Khóa / Mở khóa) - UC004 Bảng 2-7 & 2-8 */}
      {isStatusModalOpen && selectedAccount && (
        <Dialog label="Thông tin chi tiết" onClose={() => setIsStatusModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  targetStatus === 'Khóa' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {targetStatus === 'Khóa' ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  {targetStatus === 'Khóa' ? 'Xác nhận Khóa tài khoản' : 'Mở khóa tài khoản'}
                </h3>
                <p className="text-xs text-slate-500">
                  Tài khoản: <strong>{selectedAccount.tenDangNhap}</strong> ({selectedAccount.hoTen})
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lý do thay đổi trạng thái <span className="text-slate-400 font-normal">(tối đa 500 ký tự)</span>
              </label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Nhập lý do khóa hoặc mở khóa tài khoản..."
                rows={3}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 mb-5 space-y-1">
              <div>
                Người thực hiện: <strong className="text-slate-700">@{currentUser.tenDangNhap}</strong> (Admin)
              </div>
              <div>
                Thời điểm: <span className="font-mono">{new Date().toLocaleString('vi-VN')}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={busy} onClick={handleStatusSubmit}
                className={`px-4 py-2 text-white text-xs font-semibold rounded-lg shadow-sm transition ${
                  targetStatus === 'Khóa'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Xác nhận {targetStatus === 'Khóa' ? 'Khóa' : 'Mở khóa'}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* MODAL: Xác nhận xóa tài khoản */}
      {isDeleteModalOpen && selectedAccount && (
        <Dialog label="Xóa tài khoản người dùng?" onClose={() => setIsDeleteModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1">Xóa tài khoản người dùng?</h3>
            <p className="text-xs text-slate-500 mb-5">
              Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản <strong>{selectedAccount.tenDangNhap}</strong> (
              {selectedAccount.hoTen}) khỏi hệ thống? Hành động này không thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={busy} onClick={handleDeleteSubmit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
