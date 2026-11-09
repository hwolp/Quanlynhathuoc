"""Module UC002: one parameterized Python/Chromium execution per source testcase."""
import re
import pytest
from playwright.sync_api import expect
from support.cases import ROOT,read_json,select_cases,CONFIG
from pages.application import App,Registration
DATA=read_json(ROOT/'data/registration.json')
@pytest.mark.parametrize('case',select_cases('Feature 2'),ids=lambda c:f'{c["sheet"]}::{c["id"]}')
def test_registration(case,qa):
    page,db,record=qa.page,qa.db,qa.record
    app=App(page);form=Registration(page)
    number=int(case['id'][-3:]);data={**DATA['defaults'],**DATA['cases'].get(case['id'],{})}
    if number in (20,21,22):
        role=data['unauthorized_role']
        if role=='guest':app.open();expect(page.get_by_role('heading',name='Đăng nhập',exact=True)).to_be_visible()
        else:app.login(role)
        # This SPA exposes the actual form only as a modal at '/', not a separate registration URL.
        page.goto(CONFIG['base_url']);page.wait_for_load_state('networkidle')
        assert page.get_by_role('button',name='Tạo tài khoản mới',exact=True).count()==0
        assert page.get_by_role('dialog').count()==0
        record['observations'].append(f'UI: vai trò {role} không có form/menu đăng ký; URL thực là / (SPA modal).')
        if CONFIG['policy']['check_server_authorization']:
            # Complement UI assertions with the same browser context's actual API request.
            # No fake roles, no fabricated tokens and no JavaScript validation bypass.
            session=page.evaluate('JSON.parse(sessionStorage.getItem("pharmacare_api_session") || "null")')
            headers={'Authorization':'Bearer '+session['accessToken']} if session else {}
            response=page.request.post(CONFIG['api_url']+'/accounts',headers=headers,data={'tenDangNhap':f'qa_auth_{number}','matKhau':'Hien@12','hoTen':'QA Unauthorized Probe','maVaiTro':'DUOCSI'})
            rows=db.account(f'qa_auth_{number}')
            record['measurements']['authorization_http_status']=response.status
            record['observations'].append(f'API bổ sung từ phiên {role}: POST /accounts trả HTTP {response.status}; số tài khoản được lưu={len(rows)}.')
            assert response.status in (401,403) and not rows,f'UI ẩn chức năng nhưng backend cho {role} tạo tài khoản (HTTP {response.status}, DB lưu {len(rows)} tài khoản).'
        return
    app.login('admin');form.open()
    if number==1:
        for label in ['Tên đăng nhập','Họ tên nhân viên','Mật khẩu','Xác nhận mật khẩu','Phân quyền vai trò']:
            expect(form.dialog.locator('label').filter(has_text=label).first).to_be_visible()
        expect(form.dialog.locator('input')).to_have_count(6)
        expect(form.dialog.locator('select option')).to_have_count(3)
        expect(form.dialog.get_by_role('button',name='Tạo tài khoản',exact=True)).to_be_visible()
        record['observations'].append('Form có đầy đủ trường, ba lựa chọn vai trò và nút tạo.');return
    form.fill(data)
    if 'validation' in data:
        before=len(db.rows('SELECT MaTaiKhoan FROM taikhoan'))
        form.submit();expect(form.dialog).to_be_visible()
        warning=form.dialog.locator('.text-rose-700').first
        expect(warning).to_be_visible();message=warning.inner_text()
        after=len(db.rows('SELECT MaTaiKhoan FROM taikhoan'))
        record['observations'].append(f'Thông báo thực tế: {message}; số tài khoản trước/sau={before}/{after}.')
        assert before==after,'Dữ liệu không hợp lệ vẫn được ghi vào database.'
        patterns={'required':r'đầy đủ|bắt buộc|rỗng|để trống','username_length':r'8 ký tự','password_length':r'6 ký tự','confirmation':r'không khớp|không trùng'}
        assert re.search(patterns[data['validation']],message,re.I),f'Cảnh báo không đúng điều kiện cần kiểm tra ({data["validation"]}): {message}'
        return
    form.submit();expect(form.dialog).to_have_count(0);app.wait_loaded()
    record['ui_notifications'] += page.evaluate('window.__qaNotifications || []')
    page.reload();expect(page.get_by_role('button',name='Quản lý tài khoản',exact=True)).to_be_visible();app.wait_loaded()
    account=db.account(data['username'])
    assert len(account)==1 and account[0]['HoTen']==data['full_name'] and account[0]['MaVaiTro']==data['role'],f'Tài khoản lưu sai: {account}'
    row=page.locator('tbody tr').filter(has=page.get_by_role('cell',name=data['username'],exact=True))
    expect(row).to_be_visible();expect(row).to_contain_text(data['full_name'])
    record['observations'].append(f'Tài khoản {data["username"]} đã lưu; họ tên={account[0]["HoTen"]}; quyền={account[0]["MaVaiTro"]}; còn sau refresh.')
    if data.get('verify_login'):
        app.logout();app.login('pharmacist',data['username'],data['password'])
        assert page.get_by_role('button',name='Quản lý tài khoản',exact=True).count()==0
        record['observations'].append('Đăng nhập bằng mật khẩu đã tạo thành công, nhận giao diện Dược sĩ.')
    if data.get('explicit_success_notification'):
        # The source explicitly requires a success notification, beyond persisted data.
        # Detect text during the original post via the per-case DOM notification log.
        notifications=record.get('ui_notifications',[])
        success=[text for text in notifications if re.search(r'tạo.*thành công|thêm.*thành công',text,re.I)]
        record['observations'].append(f'Thông báo thành công thu được: {success or "không có"}.')
        assert success,'Tài khoản được lưu và hiển thị đúng nhưng không có thông báo tạo thành công như Expected Results.'
