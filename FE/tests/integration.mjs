import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const backend=path.resolve(root,'../BE');
const temp=await mkdtemp(path.join(tmpdir(),'pharmacare-integration-'));
const services=[];let browser;let output='';
function start(command,args,cwd,env={}) { const child=spawn(command,args,{cwd,env:{...process.env,...env},windowsHide:true,stdio:['ignore','pipe','pipe']});services.push(child);child.stdout.on('data',chunk=>{output=(output+chunk).slice(-18000);});child.stderr.on('data',chunk=>{output=(output+chunk).slice(-18000);});return child; }
async function ready(url){for(let i=0;i<100;i++){try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw Error(`Server not ready: ${url}\n${output}`);}
let page;
async function api(endpoint,options={}){const token=page?await page.evaluate(()=>{try{return JSON.parse(sessionStorage.getItem('pharmacare_api_session'))?.accessToken||'';}catch{return '';}}):'';const response=await fetch(`http://127.0.0.1:8001/api/v1${endpoint}`,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}),...options.headers}});const body=await response.json();assert.ok(response.ok,JSON.stringify(body));return body;}
try {
 start(path.join(backend,'.venv/Scripts/python.exe'),['-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8001'],backend,{DATABASE_URL:`sqlite:///${path.join(temp,'integration.db').replaceAll('\\','/')}`});
 start(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','3001','--strictPort'],root,{API_PROXY_TARGET:'http://127.0.0.1:8001',VITE_API_BASE_URL:'/api/v1'});
 await Promise.all([ready('http://127.0.0.1:8001/health'),ready('http://127.0.0.1:3001')]);
 browser=await chromium.launch({channel:'chrome',headless:true});
 page=await browser.newPage({viewport:{width:1440,height:950}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3001');
 async function login(username,password,nav){await page.getByLabel('Tên đăng nhập',{exact:true}).fill(username);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.getByRole('button',{name:nav,exact:true}).waitFor();await expect(page.getByRole('status')).toHaveCount(0);}
 async function logout(){await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();}
 // Failures come from the backend and never create a seed session.
 await page.getByLabel('Tên đăng nhập',{exact:true}).fill('manager_pharma');await page.getByLabel('Mật khẩu',{exact:true}).fill('wrong123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('alert')).toContainText('mật khẩu');
 await login('manager_pharma','manager123','Danh mục thuốc');
 const medicinesBefore=await api('/medicines');await expect(page.locator('tbody tr')).toHaveCount(medicinesBefore.length);
 await page.getByRole('button',{name:'Thêm thuốc mới',exact:true}).click();
 let dialog=page.getByRole('dialog');await dialog.getByPlaceholder('VD: P_AMOX_500').fill('INTEGRATION01');await dialog.getByPlaceholder('VD: Amoxicillin 500mg').fill('Thuốc kiểm tra tích hợp');
 const createdResponse=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/medicines'));
 await dialog.getByRole('button',{name:'Lưu vào danh mục',exact:true}).click();assert.equal((await createdResponse).status(),201);await expect(dialog).toHaveCount(0);
 assert.ok((await api('/medicines')).some(m=>m.maThuoc==='INTEGRATION01'));
 await page.reload();await page.getByRole('button',{name:'Danh mục thuốc',exact:true}).waitFor();await expect(page.getByRole('status')).toHaveCount(0);
 await page.getByLabel('Tìm kiếm thuốc',{exact:true}).fill('INTEGRATION01');await expect(page.locator('tbody tr')).toHaveCount(1);
 await page.getByTitle('Sửa thông tin thuốc',{exact:true}).click();dialog=page.getByRole('dialog');await dialog.locator('input[type=number]').first().fill('60000');await dialog.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await expect(dialog).toHaveCount(0);assert.equal((await api('/medicines/INTEGRATION01')).giaBan,60000);
 // Import through the actual UI, not directly through the API.
 await page.getByRole('button',{name:'Phiếu Nhập',exact:true}).click();await expect(page.getByRole('status')).toHaveCount(0);await page.getByRole('button',{name:'Tạo phiếu nhập mới',exact:true}).click();dialog=page.getByRole('dialog');const row=dialog.locator('tbody tr').first();await row.locator('select').selectOption('INTEGRATION01');await row.locator('input[type=text]').fill('LOT-INTEGRATION');await row.locator('input[type=number]').first().fill('5');await row.locator('input[type=number]').nth(1).fill('30000');await dialog.getByRole('button',{name:'Lưu & Nhập vào kho',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByRole('status')).toHaveCount(0);assert.equal((await api('/medicines/INTEGRATION01')).tongTonKho,5);
 await logout();await login('duocsi_02','duocsi123','Bán hàng');
 await page.getByPlaceholder('Tìm tên thuốc, hoạt chất hoặc mã vạch (F1)...').fill('INTEGRATION01');await page.getByRole('button',{name:'Thêm',exact:true}).click();
 const saleResponse=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/export-vouchers'));
 await page.getByRole('button',{name:'Thanh toán',exact:true}).click();const sale=await (await saleResponse).json();assert.equal(sale.tongTien,60000);await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog')).toContainText(sale.maPX);await page.keyboard.press('Escape');assert.equal((await api('/medicines/INTEGRATION01')).tongTonKho,4);
 await page.reload();await page.getByRole('button',{name:'Lịch sử đơn',exact:true}).click();await expect(page.getByRole('status')).toHaveCount(0);await expect(page.getByText(sale.maPX,{exact:true})).toBeVisible();
 await logout();await login('manager_pharma','manager123','Danh mục thuốc');await page.getByRole('button',{name:'Báo cáo',exact:true}).click();await expect(page.getByRole('status')).toHaveCount(0);await expect(page.getByText(sale.maPX,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Xuất file',exact:true}).click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Tải Excel (.xlsx)',exact:true}).click();assert.ok((await download).suggestedFilename().endsWith('.xlsx'));
 await logout();await login('admin_clin_01','admin123','Quản lý tài khoản');
 await page.getByRole('button',{name:'Tạo tài khoản mới',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByPlaceholder('Ví dụ: duocsi_thang01').fill('duocsi_integration');await dialog.getByPlaceholder('Ví dụ: Nguyễn Văn Nam').fill('Nhân viên tích hợp');await dialog.getByPlaceholder('Mật khẩu',{exact:true}).fill('Test@123');await dialog.getByPlaceholder('Nhập lại mật khẩu',{exact:true}).fill('Test@123');await dialog.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();await expect(dialog).toHaveCount(0);assert.ok((await api('/accounts')).some(a=>a.tenDangNhap==='duocsi_integration'));
 // Backend outage feedback is visible and preserves the page, without local fallback.
 await page.route('**/api/v1/accounts',route=>route.abort());await page.reload();await expect(page.getByRole('alert')).toContainText('Không thể kết nối backend');await page.unroute('**/api/v1/accounts');await page.getByRole('button',{name:'Thử lại',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);
 // An invalid persisted credential cannot silently restore the first seeded account.
 await page.evaluate(()=>{const session=JSON.parse(sessionStorage.getItem('pharmacare_api_session'));session.accessToken='invalid';sessionStorage.setItem('pharmacare_api_session',JSON.stringify(session));});await page.reload();await expect(page.getByRole('heading',{name:'Đăng nhập',exact:true})).toBeVisible();
 assert.deepEqual(errors,[]);console.log('PASS: API login/error handling, session restore, medicine create/update, import UI, POS checkout, persisted inventory/history, report API/Excel, account create, network retry, invalid session. Temporary database only.');
} catch(error){console.error(output.slice(-5000));throw error;}
finally {
 await browser?.close();
 for(const child of services)child.kill();
 await Promise.all(services.map(child=>new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);setTimeout(resolve,3000);})));
 if(path.dirname(temp)===path.resolve(tmpdir())&&path.basename(temp).startsWith('pharmacare-integration-'))await rm(temp,{recursive:true,force:true});
}
