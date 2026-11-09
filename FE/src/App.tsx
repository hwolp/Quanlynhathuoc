import { ApiStatus } from './components/ui/api-status';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Entry Point: Hệ thống Quản lý Quầy thuốc (SRS V4.0.0)
 */

import React, { useState, useEffect } from 'react';
import { TaiKhoan } from './types/pharmacy';
import {
  restoreSession,
  logout,
} from './services/pharmacyService';
import { LoginScreen } from './components/auth/LoginScreen';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ManagerDashboard } from './components/manager/ManagerDashboard';
import { PharmacistPosView } from './components/pharmacist/PharmacistPosView';


export default function App() {
  const [currentUser, setCurrentUser] = useState<TaiKhoan | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [startupError,setStartupError] = useState('');
  const restore = async () => {
    setStartupError('');setIsInitialized(false);
    try { setCurrentUser(await restoreSession()); }
    catch(error) { setStartupError(error instanceof Error ? error.message : 'Không thể khôi phục phiên đăng nhập.'); }
    finally { setIsInitialized(true); }
  };
  useEffect(() => {
    void restore();
    const expired = () => setCurrentUser(null);
    window.addEventListener('pharmacare:unauthorized',expired);
    return () => window.removeEventListener('pharmacare:unauthorized',expired);
  }, []);

  const handleLoginSuccess = (user: TaiKhoan) => {
    setStartupError('');
    setCurrentUser(user);
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ApiStatus busy={false} error={startupError} onRetry={()=>void restore()} />
      {/* Main View Router based on Authentication & Role */}
      <div className="flex-1 flex flex-col">
        {!currentUser ? (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        ) : currentUser.maVaiTro === 'ADMIN' ? (
          <AdminDashboard currentUser={currentUser} onLogout={handleLogout} />
        ) : currentUser.maVaiTro === 'QUANLY' ? (
          <ManagerDashboard currentUser={currentUser} onLogout={handleLogout} />
        ) : (
          <PharmacistPosView currentUser={currentUser} onLogout={handleLogout} />
        )}
      </div>
    </div>
  );
}
