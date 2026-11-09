/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Header bar dùng chung cho các màn hình theo Mockup SRS
 */

import React from 'react';
import { Search, Bell, Settings, LogOut, ShieldCheck, RefreshCw } from 'lucide-react';
import { TaiKhoan } from '../../types/pharmacy';

interface HeaderBarProps {
  user: TaiKhoan;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onLogout: () => void;
  onResetData?: () => void;
  alertCount?: number;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  user,
  searchPlaceholder = 'Tìm kiếm thông tin...',
  searchValue = '',
  onSearchChange,
  onLogout,
  onResetData,
  alertCount = 0,
}) => {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Quản trị viên', bg: 'bg-purple-100 text-purple-700' };
      case 'QUANLY':
        return { label: 'Quản lý quầy', bg: 'bg-blue-100 text-blue-700' };
      case 'DUOCSI':
        return { label: 'Dược sĩ bán hàng', bg: 'bg-emerald-100 text-emerald-700' };
      default:
        return { label: role, bg: 'bg-slate-100 text-slate-700' };
    }
  };

  const roleInfo = getRoleBadge(user.maVaiTro);

  return (
    <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Search Input */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {onResetData && (
          <button
            onClick={onResetData}
            title="Khôi phục lại dữ liệu mẫu gốc"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition border border-slate-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Nạp lại mẫu</span>
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            title="Cảnh báo hệ thống"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition relative"
          >
            <Bell className="w-4 h-4" />
            {alertCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-semibold text-xs shadow-sm">
            {user.hoTen ? user.hoTen.charAt(user.hoTen.lastIndexOf(' ') + 1) || 'U' : 'U'}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-slate-800 leading-tight">{user.hoTen}</div>
            <div className="text-[11px] text-slate-400 font-mono leading-tight flex items-center gap-1 mt-0.5">
              <span>@{user.tenDangNhap}</span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${roleInfo.bg}`}>
                {roleInfo.label}
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Đăng xuất khỏi hệ thống"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
