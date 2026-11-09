/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Màn hình Đăng nhập (Theo Mockup Hình 4-10 và Đặc tả UC001 trong SRS)
 */

import React, { useState } from 'react';
import { HeartPulse, ShieldCheck, PackageCheck, BarChart3, ArrowRight, Eye, EyeOff, AlertCircle, User, KeyRound } from 'lucide-react';
import { login } from '../../services/pharmacyService';
import { TaiKhoan } from '../../types/pharmacy';

interface LoginScreenProps {
  onLoginSuccess: (user: TaiKhoan) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [tenDangNhap, setTenDangNhap] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Kiểm tra các trường bắt buộc (SRS Bảng 2-1 STT 5, 6a)
    if (!tenDangNhap.trim() || !matKhau.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu.');
      return;
    }

    // Kiểm tra định dạng theo Bảng 2-2 (Tài khoản >= 8 ký tự, Mật khẩu >= 6 ký tự)
    if (tenDangNhap.trim().length < 8) {
      setErrorMsg('Tên đăng nhập phải có độ dài tối thiểu 8 ký tự.');
      return;
    }

    if (matKhau.length < 6) {
      setErrorMsg('Mật khẩu phải có độ dài tối thiểu 6 ký tự.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(tenDangNhap, matKhau);
      onLoginSuccess(res.user);
    } catch(error) {
      setErrorMsg(error instanceof Error ? error.message : 'Không thể đăng nhập.');
    } finally { setIsLoading(false); }

  };

  return (
    <div className="login-page">
      <section className="login-story" aria-label="Giới thiệu PharmaCare">
        <div className="brand-lockup"><span className="brand-symbol"><HeartPulse size={27}/></span><span>pharmacare<small>PHARMACY WORKSPACE</small></span></div>
        <div className="login-story-content"><span className="eyebrow"><span/>ĐỒNG HÀNH CÙNG NHÀ THUỐC</span><h1>Vận hành tinh gọn.<br/>Chăm sóc tận tâm.</h1><p>Một không gian làm việc cho toàn bộ hoạt động quầy thuốc. Chính xác hơn, thuận tiện hơn, mỗi ngày.</p>
          <div className="login-preview"><div className="preview-heading"><span className="preview-icon"><HeartPulse size={22}/></span><div><strong>Nhà thuốc của bạn</strong><small>Mọi hoạt động, trong tầm kiểm soát</small></div><span className="preview-status">Sẵn sàng</span></div><div className="preview-line"/><div className="preview-features"><div><PackageCheck size={23}/><strong>Kho thuốc</strong><small>Kiểm soát từng lô hàng</small></div><div><BarChart3 size={23}/><strong>Kinh doanh</strong><small>Nắm bắt từng giao dịch</small></div></div><div className="preview-chart" aria-hidden="true">{[32,47,39,62,52,74,63,88,73,96,86,100].map((h,i)=><span key={i} style={{height:`${h}%`}}/>)}</div><div className="preview-caption">Quản lý tập trung<span>Thông tin rõ ràng, thao tác dễ dàng</span></div></div>
        </div>
        <div className="login-story-footer"><ShieldCheck size={17}/>Được thiết kế cho nghiệp vụ quầy thuốc</div>
      </section>
      <section className="login-form-side">
        <div className="login-mobile-brand"><HeartPulse size={24}/>pharmacare</div>
        <div className="login-form-wrap"><span className="login-welcome">CHÀO MỪNG TRỞ LẠI</span><h2>Đăng nhập</h2><p className="login-description">Đăng nhập tài khoản để bắt đầu ca làm việc của bạn.</p>
          {errorMsg && <div role="alert" className="login-error"><AlertCircle size={19}/>{errorMsg}</div>}
          <form onSubmit={handleSubmit} className="login-form">
            <div><label htmlFor="username">Tên đăng nhập</label><div className="login-input"><User size={18}/><input id="username" required autoComplete="username" value={tenDangNhap} onChange={e=>setTenDangNhap(e.target.value)} placeholder="Nhập tên đăng nhập"/></div></div>
            <div><label htmlFor="password">Mật khẩu</label><div className="login-input"><KeyRound size={18}/><input id="password" required autoComplete="current-password" type={showPassword?'text':'password'} value={matKhau} onChange={e=>setMatKhau(e.target.value)} placeholder="Nhập mật khẩu"/><button type="button" aria-label={showPassword?'Ẩn mật khẩu':'Hiện mật khẩu'} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
            <div className="login-help"><ShieldCheck size={16}/>Truy cập theo vai trò được cấp bởi quản trị viên</div>
            <button type="submit" className="login-submit" disabled={isLoading}>{isLoading?'Đang đăng nhập…':'Đăng nhập'}{!isLoading&&<ArrowRight size={19}/>}</button>
          </form>
          <div className="login-contact">Bạn cần cấp lại quyền truy cập?<br/><strong>Vui lòng liên hệ quản trị viên quầy thuốc.</strong></div>
        </div>
        <footer className="login-footer">PharmaCare<span>Hệ thống quản lý quầy thuốc · v1.0</span></footer>
      </section>
    </div>
  );
};
