import { Activity, ArrowUpRight, ChevronRight, HeartPulse, LogOut, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { TaiKhoan } from '../../types/pharmacy';
export interface NavItem { id: string; label: string; icon: LucideIcon; }
export function AppSidebar({user, items, active, onSelect, onLogout}: {user: TaiKhoan; items: NavItem[]; active: string; onSelect: (id: string) => void; onLogout: () => void}) {
 const role = user.maVaiTro === 'ADMIN' ? 'Quản trị hệ thống' : user.maVaiTro === 'QUANLY' ? 'Quản lý quầy thuốc' : 'Dược sĩ bán hàng';
 return <aside className="app-sidebar">
  <a className="brand-lockup" href="#" onClick={e=>e.preventDefault()} aria-label="PharmaCare"><span className="brand-symbol"><HeartPulse size={25}/></span><span>pharma<span className="brand-accent">care</span><small>QUẢN LÝ QUẦY THUỐC</small></span></a>
  <div className="workspace-label"><span className="workspace-dot"/><span>Không gian làm việc<small>{role}</small></span><ChevronRight size={15}/></div>
  <p className="nav-caption">NGHIỆP VỤ</p>
  <nav aria-label="Điều hướng chính">{items.map(({id,label,icon:Icon})=><button key={id} aria-current={active===id?'page':undefined} onClick={()=>onSelect(id)} className={`nav-item ${active===id?'is-active':''}`}><Icon size={20}/><span>{label}</span>{active===id && <span className="nav-active-dot"/>}</button>)}</nav>
  <div className="sidebar-bottom"><div className="sidebar-note"><ShieldCheck size={23}/><strong>Chăm sóc từ sự chính xác</strong><p>Kiểm soát từng lô thuốc.<br/>An tâm trong từng giao dịch.</p><span>PharmaCare Workspace <ArrowUpRight size={13}/></span></div>
  <div className="sidebar-user"><span className="user-avatar">{user.hoTen.split(' ').slice(-2).map(s=>s[0]).join('')}</span><div><strong>{user.hoTen}</strong><small>{role}</small></div><button title="Đăng xuất" aria-label="Đăng xuất" onClick={onLogout}><LogOut size={18}/></button></div></div>
 </aside>;
}
export function PageContext({label}: {label: string}) {return <div className="page-context"><span className="context-crumb"><Activity size={15}/>Không gian làm việc<ChevronRight size={13}/><strong>{label}</strong></span><span className="context-date">{new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date())}</span></div>;}
export function StatCards({items}: {items: {label:string;value:string|number;note:string;icon:LucideIcon;tone?:'teal'|'blue'|'amber'|'rose';onClick?:()=>void}[]}) {return <div className="stat-grid">{items.map(({label,value,note,icon:Icon,tone='teal',onClick})=>{const content=<><div className="stat-top"><span>{label}</span><span className={`stat-icon tone-${tone}`}><Icon size={20}/></span></div><strong className="stat-value">{typeof value==='number'?value.toLocaleString('vi-VN'):value}</strong><div className="stat-note">{note}{onClick&&<ArrowUpRight size={15}/>}</div></>;return onClick?<button className="stat-card" key={label} onClick={onClick}>{content}</button>:<div className="stat-card" key={label}>{content}</div>;})}</div>;}
