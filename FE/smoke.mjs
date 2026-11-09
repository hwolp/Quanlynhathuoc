import { chromium } from '@playwright/test';
import fs from 'node:fs';
const browser = await chromium.launch({channel: 'chrome', headless: true});
const page = await browser.newPage({viewport: {width:1440,height:900}});
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:3000');
await page.screenshot({path:'qa/login.png',fullPage:true});
await page.getByLabel('Tên đăng nhập',{exact:true}).fill('admin_clin_01');
await page.getByLabel('Mật khẩu',{exact:true}).fill('admin123');
await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
await page.getByRole('button',{name:'Quản lý tài khoản',exact:true}).waitFor();
await fs.promises.mkdir('qa',{recursive:true});
await page.screenshot({path:'qa/admin.png',fullPage:true});
for (const [username,password,label,file] of [['manager_pharma','manager123','Trang Quản Lý','manager'],['duocsi_02','duocsi123','Trang Dược Sĩ','pharmacist']]) {
 await page.getByTitle('Đăng xuất',{exact:true}).click();
 await page.getByLabel('Tên đăng nhập',{exact:true}).fill(username);
 await page.getByLabel('Mật khẩu',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
 await page.getByRole('button',{name:file==='manager'?'Danh mục thuốc':'Bán hàng',exact:true}).waitFor();
 await page.screenshot({path:`qa/${file}.png`,fullPage:true});
 if(file==='manager') { await page.getByRole('button',{name:'Báo cáo',exact:true}).click(); await page.screenshot({path:'qa/reports.png',fullPage:true}); }
}
await page.setViewportSize({width:390,height:844});
await page.screenshot({path:'qa/mobile.png',fullPage:true});
console.log(JSON.stringify({errors,bodyWidth:await page.evaluate(()=>document.body.scrollWidth),viewport:390}));
await browser.close();
if(errors.length) process.exit(1);
