import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { request, saveSession, readSession, ApiError, query } from '../src/services/apiClient.ts';
import { login, updateAccount, createExportVoucher } from '../src/services/pharmacyService.ts';
const values=new Map<string,string>();
const events=new EventTarget();
Object.defineProperty(globalThis,'sessionStorage',{value:{getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)},configurable:true});
Object.defineProperty(globalThis,'window',{value:events,configurable:true});
const realFetch=globalThis.fetch;
beforeEach(()=>{values.clear();});
after(()=>{globalThis.fetch=realFetch;});
const user={maTaiKhoan:'DS001',tenDangNhap:'duocsi_02',hoTen:'Dược sĩ',maVaiTro:'DUOCSI' as const,trangThai:'Hoạt động' as const,ngayTao:'2026-11-09'};
function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});}
test('HTTP requests send the backend bearer credential and JSON payload',async()=>{
 saveSession({accessToken:'server_token',user});
 globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/v1/medicines');assert.equal(new Headers(options?.headers).get('Authorization'),'Bearer server_token');assert.equal(new Headers(options?.headers).get('Content-Type'),'application/json');return reply({ok:true});};
 assert.deepEqual(await request('/medicines',{method:'POST',body:'{}'}),{ok:true});
});
test('login stores only backend session; account password is not fabricated',async()=>{
 globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/v1/auth/login');assert.deepEqual(JSON.parse(String(options?.body)),{tenDangNhap:'duocsi_02',matKhau:'secret123'});return reply({success:true,accessToken:'server_token',user});};
 await login(' duocsi_02 ','secret123');assert.deepEqual(readSession(),{accessToken:'server_token',user});assert.equal(readSession()?.user.matKhau,undefined);
});
test('failed login does not create a session and exposes backend error',async()=>{
 globalThis.fetch=async()=>reply({detail:'Tài khoản hoặc mật khẩu chưa đúng.'},401);
 await assert.rejects(()=>login('duocsi_02','wrong123'),/Tài khoản hoặc mật khẩu/);assert.equal(readSession(),null);
});
test('401 invalidates an existing session and notifies the app',async()=>{
 saveSession({accessToken:'expired',user});let expired=false;events.addEventListener('pharmacare:unauthorized',()=>{expired=true;},{once:true});globalThis.fetch=async()=>reply({detail:'Phiên hết hạn'},401);
 await assert.rejects(()=>request('/auth/me'),ApiError);assert.equal(readSession(),null);assert.equal(expired,true);
});
test('Pydantic validation details remain useful to the user',async()=>{
 globalThis.fetch=async()=>reply({detail:[{loc:['body','giaBan'],msg:'Input should be greater than 0'}]},422);
 await assert.rejects(()=>request('/medicines'),/giaBan: Input should be greater than 0/);
});
test('network errors do not silently fall back to local seed data',async()=>{
 globalThis.fetch=async()=>{throw new TypeError('Failed to fetch');};await assert.rejects(()=>request('/medicines'),/Không thể kết nối backend/);
});
test('account password changes use the matKhauMoi field from backend contract',async()=>{
 globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/v1/accounts/DS001');const body=JSON.parse(String(options?.body));assert.equal(body.matKhauMoi,'newPass123');assert.equal(body.matKhau,undefined);return reply(user);};
 await updateAccount({...user,matKhau:'newPass123'});
});
test('unchanged account password is omitted from update payload',async()=>{
 globalThis.fetch=async(_,options)=>{assert.equal(JSON.parse(String(options?.body)).matKhauMoi,undefined);return reply(user);};await updateAccount(user);
});
test('checkout uses authoritative server totals and generated invoice details',async()=>{
 const voucher={maPX:'PX1',nguoiBan:'DS001',ngayBan:'2026-11-09',loaiXuat:'Bán lẻ trực tiếp' as const,chietKhau:0,tongTien:1,phuongThucThanhToan:'Tiền mặt' as const,chiTiet:[]};
 globalThis.fetch=async()=>reply({...voucher,tongTien:25000});const result=await createExportVoucher(voucher);assert.equal(result.voucher.tongTien,25000);
});
test('query encodes report filters and omits empty values',()=>{assert.equal(query({fromDate:'2026-11-01',type:'ALL',maThuoc:undefined,toDate:''}),'?fromDate=2026-11-01&type=ALL');});
