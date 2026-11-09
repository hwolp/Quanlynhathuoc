"""Page objects contain real DOM locators. Change locators here if UI wording changes."""
import re
from playwright.sync_api import expect
from support.cases import CONFIG
class App:
    def __init__(self,page):self.page=page
    def open(self):self.page.goto(CONFIG['base_url'])
    def wait_loaded(self):
        expect(self.page.get_by_role('status')).to_have_count(0)
        errors=self.page.locator('.api-status.api-error')
        assert errors.count()==0, f'Lỗi tải dữ liệu API: {errors.all_text_contents()}'
    def login(self,role='admin',username=None,password=None):
        self.open();account=CONFIG['credentials'][role]
        self.page.get_by_label('Tên đăng nhập',exact=True).fill(username or account['username'])
        self.page.get_by_label('Mật khẩu',exact=True).fill(password or account['password'])
        self.page.get_by_role('button',name='Đăng nhập',exact=True).click()
        nav={'admin':'Quản lý tài khoản','manager':'Danh mục thuốc','pharmacist':'Bán hàng'}[role]
        expect(self.page.get_by_role('button',name=nav,exact=True)).to_be_visible();self.wait_loaded()
    def logout(self):self.page.get_by_role('button',name='Đăng xuất',exact=True).click()
class Registration:
    def __init__(self,page):self.page=page
    def open(self):
        self.page.get_by_role('button',name='Tạo tài khoản mới',exact=True).click()
        expect(self.dialog).to_be_visible()
    @property
    def dialog(self):return self.page.get_by_role('dialog')
    def fill(self,data):
        self.dialog.get_by_placeholder('Ví dụ: duocsi_thang01',exact=True).fill(data['username'])
        self.dialog.get_by_placeholder('Ví dụ: Nguyễn Văn Nam',exact=True).fill(data['full_name'])
        self.dialog.get_by_placeholder('Mật khẩu',exact=True).fill(data['password'])
        self.dialog.get_by_placeholder('Nhập lại mật khẩu',exact=True).fill(data['confirmation'])
        self.dialog.locator('select').select_option(data['role'])
    def submit(self):self.dialog.get_by_role('button',name='Tạo tài khoản',exact=True).click()
class Inventory:
    def __init__(self,page):self.page=page
    def open(self,role='pharmacist'):
        self.page.get_by_role('button',name='Kho thuốc' if role=='pharmacist' else 'Danh mục thuốc',exact=True).click()
        App(self.page).wait_loaded()
    @property
    def main(self):return self.page.locator('main')
    def row(self,code):return self.main.locator('tbody tr').filter(has=self.page.get_by_role('cell',name=code,exact=True))
    def data_rows(self):return self.main.locator('tbody tr').filter(has=self.page.locator('td:not([colspan])'))
    def require_search(self):
        candidates=self.main.locator('input[type="text"],input:not([type])')
        assert candidates.count()>0,'UC005: màn Kho thuốc của Dược sĩ không có ô tìm kiếm mã/tên; bảng luôn hiển thị toàn bộ fixture.'
        return candidates.first
    def search(self,keyword):
        field=self.require_search();field.fill(keyword)
        button=self.main.get_by_role('button',name=re.compile('Tra cứu|Tìm kiếm',re.I))
        if button.count():button.first.click()
        return field
    def require_group(self):
        select=self.main.locator('select').filter(has=self.page.locator('option',has_text='Thuốc giảm đau'))
        assert select.count()>0,'UC005: màn Kho thuốc của Dược sĩ không có bộ lọc nhóm thuốc.'
        return select.first
    def group(self,value):self.require_group().select_option(label=value)
    def status(self,value):
        control=self.main.get_by_role('button',name=re.compile(f'^{re.escape(value)}(?:\\s|\\(|$)',re.I))
        selects=self.main.locator('select').filter(has=self.page.locator('option',has_text=value))
        assert control.count() or selects.count(),f'UC005: màn Kho thuốc của Dược sĩ không có bộ lọc trạng thái {value}.'
        if control.count():control.first.click()
        else:selects.first.select_option(label=value)
    def detail(self,code):
        row=self.row(code)
        control=row.get_by_role('button',name=re.compile('chi tiết|xem',re.I))
        link=row.get_by_role('link')
        assert control.count() or link.count() or row.get_attribute('role')=='button',f'UC005: dòng {code} không có nút/link Chi tiết; click dòng không được triển khai như điều khiển.'
        if control.count():control.first.click()
        elif link.count():link.first.click()
        else:row.click()
        expect(self.page.get_by_role('dialog')).to_be_visible()
    def edit_threshold(self,code):
        self.row(code).get_by_title('Sửa thông tin thuốc',exact=True).click()
        dialog=self.page.get_by_role('dialog')
        # Existing DOM places price then threshold, both native type=number controls.
        field=dialog.locator('input[type=number]').nth(1)
        expect(field).to_be_visible();return dialog,field
