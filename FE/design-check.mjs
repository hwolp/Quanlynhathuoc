import { chromium, expect } from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
for(const width of [390,768,1024,1440]) {
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.goto('http://localhost:3000');
 await expect(page.getByRole('heading',{name:'Đăng nhập',exact:true})).toBeVisible();
 await page.getByLabel('Mật khẩu',{exact:true}).fill('manager123');
 await page.getByRole('button',{name:'Hiện mật khẩu',exact:true}).click();
 await expect(page.getByLabel('Mật khẩu',{exact:true})).toHaveAttribute('type','text');
 await page.getByLabel('Tên đăng nhập',{exact:true}).fill('manager_pharma');
 await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
 await page.getByRole('button',{name:'Danh mục thuốc',exact:true}).waitFor();
 await page.getByLabel('Tìm kiếm thuốc',{exact:true}).fill('TH001');
 await expect(page.locator('tbody tr')).toHaveCount(1);
 await page.getByLabel('Tìm kiếm thuốc',{exact:true}).fill('');
 await page.getByRole('button',{name:'Thêm thuốc mới',exact:true}).click();
 await page.screenshot({path:`qa/modal-${width}.png`,fullPage:true});
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toHaveCount(0);
 const bodyWidth=await page.evaluate(()=>document.body.scrollWidth);
 if(bodyWidth>width) throw Error(`Overflow ${width}: ${bodyWidth}`);
 results.push({width,bodyWidth});
 await page.close();
}
console.log(JSON.stringify(results)); await browser.close();
